import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_ORIGIN } from '../api/apiClient';
import { cartService } from '../api/cartService';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize any value to a plain string for reliable comparison.
 * Handles MongoDB ObjectId objects, plain strings, and null/undefined.
 */
const toStr = (val) => (val == null ? '' : String(val));

/**
 * Check if a cart item matches a given productId + optional variantId.
 * Uses string coercion to handle ObjectId vs string mismatches.
 */
const itemMatches = (item, productId, variantId = undefined) => {
  const productMatch = toStr(item.product) === toStr(productId);
  if (variantId === undefined) return productMatch;
  return productMatch && toStr(item.variant) === toStr(variantId);
};

/**
 * Calculate the effective stock for a variant object.
 */
const calcVariantStock = (variant) => {
  if (!variant) return 0;
  const total = variant.inventory ?? variant.currentStock ?? variant.stock ?? 0;
  const reserved = variant.reserveStock ?? 0;
  return Math.max(0, Number(total) - Number(reserved));
};

// ─── Sync Strategy ────────────────────────────────────────────────────────────
// 
// PROBLEM: replaceCart does full DB validation — if any item fails validation
// (e.g. product has variants but item's variant is not found), the whole cart
// is rejected. This caused:
//   - "Cart sync failed. Refreshing cart..." toast on every quantity change
//   - Items silently disappearing after syncing
//   - The cart blinking (local → backend-cleared → local)
//
// FIX: Use ITEM-LEVEL API calls (addItem / updateItem / removeItemById) instead
// of replaceCart for individual operations. replaceCart is only used for the
// initial hydration merge (login), never for incremental updates.

let syncTimer = null;

/**
 * Debounce a single item quantity update to the backend.
 * Uses PUT /api/cart/items/:productId — item-level, not whole-cart replace.
 */
const syncItemUpdateDebounced = (productId, qty, variantId, getStore) => {
  if (!localStorage.getItem('token')) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await cartService.updateItem(productId, qty, variantId || null);
    } catch (error) {
      console.error('[Cart Sync] Update failed:', error.message);
      // Don't toast here — it's a background sync; re-hydrate silently
      if (getStore) {
        getStore().hydrateCartFromBackend();
      }
    }
  }, 400);
};

// ─── Store ────────────────────────────────────────────────────────────────────

const useCartStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      isCartHydrated: false,
      isSyncing: false,
      globalFee: null,
      checkoutOrigin: null,

      setCheckoutOrigin: (path) => set({ checkoutOrigin: path }),

      fetchGlobalFee: async () => {
        try {
          const res = await axios.get(`${API_ORIGIN}/api/global-fees`);
          set({ globalFee: res.data });
        } catch (error) {
          console.error('[Cart] Failed to fetch global fee:', error.message);
        }
      },

      /**
       * Fetch only the logged-in user's cart from the backend.
       * Called after login and on page load when a token exists.
       * STRICTLY replaces local state — no merging, no cross-user data bleed.
       */
      hydrateCartFromBackend: async () => {
        if (!localStorage.getItem('token')) {
          // No token → clear any leftover cart data and mark hydrated
          set({ cartItems: [], isCartHydrated: true });
          return;
        }
        try {
          const backendCart = await cartService.getCart();
          const backendItems = (backendCart.items || []).map(normalizeCartItem);
          
          const localItems = get().cartItems;
          
          // If the user has a local cart (e.g. they added items as a guest before logging in),
          // we need to merge it with their backend cart.
          if (localItems.length > 0) {
            const mergedMap = new Map();
            let hasChanges = false;
            
            // 1. Add backend items to the map
            backendItems.forEach(item => {
              const key = `${toStr(item.product)}-${toStr(item.variant)}`;
              mergedMap.set(key, item);
            });
            
            // 2. Merge local items into the map
            localItems.forEach(localItem => {
              const key = `${toStr(localItem.product)}-${toStr(localItem.variant)}`;
              if (mergedMap.has(key)) {
                // Item exists in both: add quantities
                const existing = mergedMap.get(key);
                const newQty = existing.qty + localItem.qty;
                const maxStock = existing.maxStock > 0 ? existing.maxStock : 999;
                
                if (newQty !== existing.qty) {
                  existing.qty = Math.min(newQty, maxStock);
                  hasChanges = true;
                }
              } else {
                // Item only exists locally: add it to the map
                mergedMap.set(key, localItem);
                hasChanges = true;
              }
            });
            
            // 3. If there were local items to merge, push the unified cart to the backend
            if (hasChanges) {
              const mergedItemsArray = Array.from(mergedMap.values());
              // Optimistically set local state
              set({ cartItems: mergedItemsArray, isCartHydrated: true });
              
              // Bulk sync to the backend
              const updatedBackendCart = await cartService.replaceCart(mergedItemsArray);
              
              // Update local state again with the definitive backend response
              // (which may have stripped out invalid items or clamped quantities)
              if (updatedBackendCart && Array.isArray(updatedBackendCart.items)) {
                set({ cartItems: updatedBackendCart.items.map(normalizeCartItem) });
              }
              return;
            }
          }

          // No merging needed: just use the backend items directly
          set({ cartItems: backendItems, isCartHydrated: true });
        } catch (error) {
          console.error('[Cart] Failed to hydrate from backend:', error.message);
          set({ isCartHydrated: true });
        }
      },

      /**
       * Immediately clear the cart STATE only (no backend call).
       * Called during logout to wipe the previous user's cart from memory.
       * The backend cart data is preserved in MongoDB for when the user logs back in.
       */
      clearCartState: () => {
        clearTimeout(syncTimer);
        set({ cartItems: [], isCartHydrated: false });
      },

      // ─── Core Add to Cart ─────────────────────────────────────────────────
      addToCart: async (product, qty = 1) => {
        const productId = toStr(product._id || product.id || product.productId || '');
        if (!productId) return;

        let selectedVariant = product.selectedVariant || null;
        const variants = product.variants || [];

        // ── FIFO Variant Resolution (only if no variant is pre-selected) ──
        if (!selectedVariant && variants.length > 0) {
          const currentState = get();
          for (const variant of variants) {
            if (variant.isActive === false) continue;

            const variantStock = Math.max(
              0,
              (variant.inventory ?? variant.currentStock ?? variant.stock ?? 0) - (variant.reserveStock || 0)
            );
            if (variantStock <= 0) continue;

            const variantIdStr = toStr(variant._id || variant.id);
            const qtyInCart = currentState.cartItems
              .filter(item => toStr(item.product) === productId && toStr(item.variant) === variantIdStr)
              .reduce((sum, item) => sum + item.qty, 0);

            if (variantStock - qtyInCart > 0) {
              selectedVariant = variant;
              break;
            }
          }

          if (!selectedVariant) {
            toast.error('All available stock has already been added to your cart.');
            return;
          }
        }

        // ── Calculate Final Details ────────────────────────────────────────
        const variantId = toStr(selectedVariant?._id || selectedVariant?.id || '');
        const variantPrice = selectedVariant?.discountPrice ?? selectedVariant?.basePrice ?? selectedVariant?.price;
        const finalPrice = variantPrice != null ? Number(variantPrice) : Number(product.discountPrice ?? product.price ?? 0);

        let finalImage =
          product.images?.find((img) => img.isThumbnail)?.url ||
          product.images?.[0]?.url ||
          (typeof product.images?.[0] === 'string' ? product.images[0] : null) ||
          (typeof product.image === 'object' ? product.image?.url : product.image) ||
          '';
        if (selectedVariant?.images?.length > 0) {
          finalImage = selectedVariant.images[0]?.url || selectedVariant.images[0] || finalImage;
        }
        if (finalImage && finalImage.startsWith('/uploads')) {
          finalImage = `${API_ORIGIN}${finalImage}`;
        }

        // ── Variant Label ──────────────────────────────────────────────────
        const cap = (s) => (typeof s === 'string' ? s.charAt(0).toUpperCase() + s.slice(1) : s);
        const optParts = [];
        if (selectedVariant) {
          if (Array.isArray(selectedVariant.options) && selectedVariant.options.length > 0) {
            selectedVariant.options.forEach((opt) =>
              optParts.push(`${cap(opt.attribute?.name || opt.attributeName || 'Option')}: ${cap(opt.value)}`)
            );
          } else if (selectedVariant.variantCombination) {
            optParts.push(selectedVariant.variantCombination.split('-').map(cap).join(', '));
          } else {
            if (selectedVariant.color) optParts.push(`Colour: ${cap(selectedVariant.color)}`);
            if (selectedVariant.weight) optParts.push(`Weight: ${cap(String(selectedVariant.weight))}`);
            if (selectedVariant.size) optParts.push(`Size: ${cap(selectedVariant.size)}`);
          }
        }
        const variantOptions = optParts.join(', ') || null;

        // ── Max Stock ──────────────────────────────────────────────────────
        const maxStock = selectedVariant
          ? calcVariantStock(selectedVariant)
          : (product.variants && product.variants.length > 0)
            ? 0
            : Number(product.inventory?.stockQuantity ?? product.stock ?? 999);

        if (maxStock <= 0 && !selectedVariant) {
          toast.error('Product is out of stock.');
          return;
        }

        const newItem = {
          product: productId,
          name: product.name || 'Product',
          image: finalImage,
          price: finalPrice,
          qty,
          variant: variantId || null,
          variantOptions,
          maxStock: Math.max(1, maxStock),
          weight: selectedVariant?.weight ?? product.shippingWeight ?? product.weight ?? 0,
          isGift: product.isGift || false,
          isGiftWrapper: product.isGiftWrapper !== undefined ? product.isGiftWrapper : true,
          giftBox: product.giftBox || null,
          dimensions: (selectedVariant?.length && selectedVariant?.width && selectedVariant?.height)
            ? { length: selectedVariant.length, width: selectedVariant.width, height: selectedVariant.height }
            : product.dimensions || null,
          giftMessage: product.giftMessage || null,
          giftCardStyle: product.giftMessageStyle || null,
          deliveryDate: product.deliveryDate || product.scheduledDeliveryDate || null,
          scheduledDeliveryDate: product.scheduledDeliveryDate || null,
        };

        const currentState = get();
        const existIndex = currentState.cartItems.findIndex(
          (x) => toStr(x.product) === toStr(newItem.product) && toStr(x.variant) === toStr(newItem.variant)
        );

        let updatedItems;
        if (existIndex !== -1) {
          const existingItem = currentState.cartItems[existIndex];
          const newQty = existingItem.qty + qty;
          if (existingItem.maxStock > 0 && newQty > existingItem.maxStock) {
            if (existingItem.qty >= existingItem.maxStock) {
              toast.error(`Only ${existingItem.maxStock} item(s) available in stock.`);
              return;
            }
            toast.error(`Only ${existingItem.maxStock} item(s) available. Added remaining.`);
            updatedItems = currentState.cartItems.map((x, i) =>
              i !== existIndex ? x : { ...x, qty: x.maxStock, variantOptions: variantOptions || x.variantOptions }
            );
          } else {
            const vLabel = variantOptions ? ` (${variantOptions})` : '';
            toast.success(`Increased quantity of ${newItem.name}${vLabel}`);
            updatedItems = currentState.cartItems.map((x, i) =>
              i !== existIndex ? x : {
                ...x,
                qty: newQty,
                variantOptions: variantOptions || x.variantOptions,
                isGift: newItem.isGift ?? x.isGift,
                isGiftWrapper: newItem.isGiftWrapper !== undefined ? newItem.isGiftWrapper : x.isGiftWrapper,
                giftMessage: newItem.giftMessage ?? x.giftMessage,
                giftCardStyle: newItem.giftCardStyle ?? x.giftCardStyle,
                deliveryDate: newItem.deliveryDate ?? x.deliveryDate,
                scheduledDeliveryDate: newItem.scheduledDeliveryDate ?? x.scheduledDeliveryDate,
                giftBox: newItem.giftBox ?? x.giftBox,
              }
            );
          }
        } else {
          const clampedQty = maxStock > 0 ? Math.min(qty, maxStock) : qty;
          updatedItems = [...currentState.cartItems, { ...newItem, qty: clampedQty }];
          const vLabel = variantOptions ? ` (${variantOptions})` : '';
          toast.success(`Added ${newItem.name}${vLabel} to cart`);
        }

        // Optimistic local update immediately
        set({ cartItems: updatedItems });

        // Sync to backend using item-level API (avoids full-cart validation rejection)
        if (localStorage.getItem('token')) {
          try {
            const backendCart = await cartService.addItem({
              product: newItem.product,
              variant: newItem.variant,
              name: newItem.name,
              image: newItem.image,
              price: newItem.price,
              qty,
              weight: newItem.weight,
              maxStock: newItem.maxStock,
              variantOptions: newItem.variantOptions,
              isGift: newItem.isGift,
              isGiftWrapper: newItem.isGiftWrapper,
              giftMessage: newItem.giftMessage,
              giftCardStyle: newItem.giftCardStyle,
              deliveryDate: newItem.deliveryDate,
              scheduledDeliveryDate: newItem.scheduledDeliveryDate,
              giftBox: newItem.giftBox,
              dimensions: newItem.dimensions,
            });
            // Update local state with backend-confirmed items (fresh maxStock etc.)
            if (backendCart && Array.isArray(backendCart.items)) {
              set({ cartItems: backendCart.items.map(normalizeCartItem) });
            }
          } catch (error) {
            console.error('[Cart] addItem backend failed:', error.message);
            // Keep optimistic state — don't discard what the user added
            // Silently re-hydrate in background to reconcile
            get().hydrateCartFromBackend();
          }
        }
      },

      // ─── Update quantity for an existing cart item ─────────────────────────
      updateQuantity: (productId, qty, variantId = undefined) => {
        const state = get();
        const item = state.cartItems.find(i => itemMatches(i, productId, variantId));
        if (!item) return;

        const newQty = Number(qty);
        if (newQty < 1) return; // let removeFromCart handle deletion

        // Check stock
        if (item.maxStock != null && item.maxStock > 0 && newQty > item.maxStock) {
          toast.error(`Only ${item.maxStock} item(s) available in stock.`);
          return;
        }

        // Optimistic local update
        const updatedItems = state.cartItems.map((i) => {
          if (!itemMatches(i, productId, variantId)) return i;
          return { ...i, qty: newQty };
        });
        set({ cartItems: updatedItems });

        // Sync with item-level API (not replaceCart — avoids full-cart rejection)
        syncItemUpdateDebounced(productId, newQty, variantId, get);
      },

      /**
       * Remove a specific item from cart.
       * Uses the MongoDB subdocument _id when available (preferred), falls
       * back to product+variant matching for items without an _id (e.g. guest).
       */
      removeFromCart: async (productId, variantId = undefined) => {
        const state = get();
        const item = state.cartItems.find(i => itemMatches(i, productId, variantId));

        // Optimistic local update immediately
        const updatedItems = state.cartItems.filter(
          (i) => !itemMatches(i, productId, variantId)
        );
        set({ cartItems: updatedItems });

        // Sync removal to backend
        if (localStorage.getItem('token') && item) {
          try {
            if (item._id) {
              await cartService.removeItemById(item._id);
            } else {
              await cartService.removeItem(productId, variantId || null);
            }
          } catch (error) {
            console.error('[Cart] removeFromCart backend failed:', error.message);
            // Silently re-hydrate to reconcile
            get().hydrateCartFromBackend();
          }
        }
      },

      /**
       * Remove a cart item by its MongoDB subdocument _id.
       * Preferred method for logged-in users — zero ambiguity.
       */
      removeFromCartById: async (itemId) => {
        // Optimistic update: remove from local state immediately
        set((state) => ({
          cartItems: state.cartItems.filter(
            (item) => toStr(item._id) !== toStr(itemId)
          ),
        }));

        // Sync removal to backend
        if (localStorage.getItem('token')) {
          try {
            await cartService.removeItemById(itemId);
          } catch (error) {
            console.error('[Cart] Failed to remove item from backend:', error.message);
            get().hydrateCartFromBackend();
          }
        }
      },

      // ─── Clear cart (local state + backend) ───────────────────────────────
      clearCart: () => {
        set({ cartItems: [] });
        if (localStorage.getItem('token')) {
          cartService.clearCart().catch((err) =>
            console.error('[Cart] Failed to clear cart on backend:', err.message)
          );
        }
      },

      // ─── Clear cart from memory only (on logout) ──────────────────────────
      clearCartState: () => {
        clearTimeout(syncTimer);
        set({ cartItems: [], isCartHydrated: false });
      },

      // ─── Directly set cart items (used after order placement) ─────────────
      setCartItems: (items = []) => {
        const normalized = items.map(normalizeCartItem);
        set({ cartItems: normalized });
      },

      // ─── Computed selectors ────────────────────────────────────────────────
      getSubtotal: () =>
        get().cartItems.reduce((acc, item) => acc + Number(item.price) * item.qty, 0),

      getTotalItems: () =>
        get().cartItems.reduce((acc, item) => acc + item.qty, 0),

      /**
       * Count of UNIQUE PRODUCTS in cart — used for the navbar badge.
       * Changing quantity or variant of the same product does NOT increase this.
       */
      getUniqueProductCount: () =>
        new Set(get().cartItems.map((item) => toStr(item.product))).size,
    }),
    {
      name: 'woodora-cart-v5', // Bumped version to purge old persisted state
      version: 1,
    }
  )
);

// ─── Normalize cart items coming from the backend ────────────────────────────
function normalizeCartItem(item = {}) {
  return {
    _id: item._id ? toStr(item._id) : undefined, // Preserve MongoDB subdocument _id
    product: toStr(item.product),
    name: item.name || 'Product',
    image: item.image || '',
    price: Number(item.price) || 0,
    qty: Math.max(1, Number(item.qty) || 1),
    variant: item.variant ? toStr(item.variant) : null,
    variantOptions: item.variantOptions || null,
    maxStock: Number(item.maxStock) || 999,
    weight: Number(item.weight) || 0,
    dimensions: item.dimensions || null,
    isGift: item.isGift || false,
    isGiftWrapper: item.isGiftWrapper !== undefined ? item.isGiftWrapper : true,
    giftBox: item.giftBox || null,
    giftMessage: item.giftMessage || null,
    giftCardStyle: item.giftCardStyle || null,
    deliveryDate: item.deliveryDate || item.scheduledDeliveryDate || null,
    scheduledDeliveryDate: item.scheduledDeliveryDate || null,
  };
}

export default useCartStore;
