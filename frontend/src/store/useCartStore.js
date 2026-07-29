import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_ORIGIN } from '../api/apiClient';
import { cartService } from '../api/cartService';
import { toast } from 'react-hot-toast';

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

/**
 * Debounced backend sync — prevents rapid repeated PUT requests.
 * Only fires if the user is logged in (token exists).
 */
let syncTimer = null;
const syncCartDebounced = (items, getStore) => {
  if (!localStorage.getItem('token')) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const updatedCart = await cartService.replaceCart(items);
      // Backend may have filtered out invalid/corrupt items — keep in sync
      if (getStore && updatedCart && Array.isArray(updatedCart.items)) {
        useCartStore.setState({ cartItems: updatedCart.items.map(normalizeCartItem) });
      }
    } catch (error) {
      console.error('[Cart Sync] Failed:', error.message);
      if (getStore) {
        toast.error('Cart sync failed. Refreshing cart...');
        getStore().hydrateCartFromBackend();
      }
    }
  }, 500);
};

// ─── Store ────────────────────────────────────────────────────────────────────

const useCartStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      isCartHydrated: false,

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
          // Backend is the SINGLE SOURCE OF TRUTH for logged-in users.
          // Do NOT merge with local state to prevent cross-user contamination.
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
      addToCart: (product, qty = 1) => {
        const productId = toStr(product._id || product.id || product.productId || '');
        if (!productId) return;

        set((state) => {
          let selectedVariant = product.selectedVariant || null;
          const variants = product.variants || [];

          // ── FIFO Variant Resolution (only if no variant is pre-selected) ──
          if (!selectedVariant && variants.length > 0) {
            for (const variant of variants) {
              if (variant.isActive === false) continue;

              const variantStock = Math.max(
                0,
                (variant.inventory ?? variant.currentStock ?? variant.stock ?? 0) - (variant.reserveStock || 0)
              );
              if (variantStock <= 0) continue;

              const variantIdStr = toStr(variant._id || variant.id);
              const qtyInCart = state.cartItems
                .filter(item => toStr(item.product) === productId && toStr(item.variant) === variantIdStr)
                .reduce((sum, item) => sum + item.qty, 0);

              if (variantStock - qtyInCart > 0) {
                selectedVariant = variant;
                break;
              }
            }

            if (!selectedVariant) {
              toast.error('All available stock has already been added to your cart.');
              return state;
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
            return state;
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

          const existIndex = state.cartItems.findIndex(
            (x) => toStr(x.product) === toStr(newItem.product) && toStr(x.variant) === toStr(newItem.variant)
          );

          let updatedItems;
          if (existIndex !== -1) {
            updatedItems = state.cartItems.map((x, i) => {
              if (i !== existIndex) return x;
              const newQty = x.qty + qty;
              if (x.maxStock > 0 && newQty > x.maxStock) {
                if (x.qty >= x.maxStock) {
                  toast.error(`Only ${x.maxStock} item(s) available in stock.`);
                  return x;
                }
                toast.error(`Only ${x.maxStock} item(s) available. Added remaining.`);
                return { ...x, qty: x.maxStock, variantOptions: variantOptions || x.variantOptions };
              }
              const vLabel = variantOptions ? ` (${variantOptions})` : '';
              toast.success(`Increased quantity of ${newItem.name}${vLabel}`);
              return {
                ...x,
                qty: newQty,
                variantOptions: variantOptions || x.variantOptions,
                isGift: newItem.isGift ?? x.isGift,
                giftMessage: newItem.giftMessage ?? x.giftMessage,
                giftCardStyle: newItem.giftCardStyle ?? x.giftCardStyle,
                deliveryDate: newItem.deliveryDate ?? x.deliveryDate,
                scheduledDeliveryDate: newItem.scheduledDeliveryDate ?? x.scheduledDeliveryDate,
              };
            });
          } else {
            const clampedQty = maxStock > 0 ? Math.min(qty, maxStock) : qty;
            updatedItems = [...state.cartItems, { ...newItem, qty: clampedQty }];
            const vLabel = variantOptions ? ` (${variantOptions})` : '';
            toast.success(`Added ${newItem.name}${vLabel} to cart`);
          }

          syncCartDebounced(updatedItems, get);
          return { cartItems: updatedItems };
        });
      },

      // ─── Update quantity for an existing cart item ─────────────────────────
      updateQuantity: (productId, qty, variantId = undefined) => {
        set((state) => {
          const updatedItems = state.cartItems.map((item) => {
            if (!itemMatches(item, productId, variantId)) return item;

            const newQty = Number(qty);

            if (item.maxStock != null && item.maxStock > 0 && newQty > item.maxStock) {
              toast.error(`Only ${item.maxStock} item(s) available in stock.`);
              return { ...item, qty: item.maxStock };
            }

            return { ...item, qty: Math.max(1, newQty) };
          });

          syncCartDebounced(updatedItems, get);
          return { cartItems: updatedItems };
        });
      },

      /**
       * Remove a specific item from cart.
       * Uses the MongoDB subdocument _id when available (preferred), falls
       * back to product+variant matching for items without an _id (e.g. guest).
       */
      removeFromCart: (productId, variantId = undefined) => {
        set((state) => {
          const updatedItems = state.cartItems.filter(
            (item) => !itemMatches(item, productId, variantId)
          );
          syncCartDebounced(updatedItems, get);
          return { cartItems: updatedItems };
        });
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
            toast.error('Failed to remove item. Refreshing cart...');
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
        set({ cartItems: [] });
      },

      // ─── Directly set cart items (used after order placement) ─────────────
      setCartItems: (items = []) => {
        const normalized = items.map(normalizeCartItem);
        set({ cartItems: normalized });
        syncCartDebounced(normalized, get);
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
      name: 'woodora-cart-v4', // Bumped version to purge old persisted state
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
