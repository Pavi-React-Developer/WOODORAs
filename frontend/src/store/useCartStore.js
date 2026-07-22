import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
 * Supports multiple field names used across your codebase.
 */
const calcVariantStock = (variant) => {
  if (!variant) return 0;
  // Support both field-naming conventions
  const total = variant.inventory ?? variant.currentStock ?? variant.stock ?? 0;
  const reserved = variant.reserveStock ?? 0;
  return Math.max(0, Number(total) - Number(reserved));
};

/**
 * Debounced backend sync - prevents rapid repeated PUT requests.
 */
let syncTimer = null;
const syncCartDebounced = (items, getStore) => {
  if (!localStorage.getItem('token')) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const updatedCart = await cartService.replaceCart(items);
      // The backend may have filtered out invalid/corrupt items (like ones exceeding stock or missing variants)
      // So we must update our local state to perfectly match what the backend saved.
      if (getStore && updatedCart && Array.isArray(updatedCart.items)) {
        // Prevent infinite loop by directly setting the zustand state without triggering another sync
        useCartStore.setState({ cartItems: updatedCart.items.map(normalizeCartItem) });
      }
    } catch (error) {
      console.error('[Cart Sync] Failed:', error.message);
      if (getStore) {
        toast.error('Cart sync failed. Refreshing with actual stock data...');
        getStore().hydrateCartFromBackend(); // Revert optimistic UI update
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

      // ─── Hydrate cart from backend on login ──────────────────────────────
      hydrateCartFromBackend: async () => {
        if (!localStorage.getItem('token')) {
          set({ isCartHydrated: true });
          return;
        }
        try {
          const backendCart = await cartService.getCart();
          const backendItems = (backendCart.items || []).map(normalizeCartItem);
          const localItems = get().cartItems || [];

          if (backendItems.length > 0 && localItems.length > 0) {
            // Merge strategy: backend is source of truth, local adds missing items
            const merged = [...backendItems];
            let changed = false;
            for (const local of localItems) {
              const exists = merged.find(
                (x) => toStr(x.product) === toStr(local.product) && toStr(x.variant) === toStr(local.variant)
              );
              if (!exists) {
                merged.push(local);
                changed = true;
              }
            }
            set({ cartItems: merged, isCartHydrated: true });
            if (changed) syncCartDebounced(merged, get);
          } else if (backendItems.length > 0) {
            set({ cartItems: backendItems, isCartHydrated: true });
          } else {
            set({ isCartHydrated: true });
            if (localItems.length > 0) syncCartDebounced(localItems, get);
          }
        } catch (error) {
          console.error('[Cart] Failed to hydrate from backend:', error.message);
          set({ isCartHydrated: true });
        }
      },

      // ─── Core Add to Cart (handles FIFO Variant Resolution) ───────────────
      addToCart: (product, qty = 1) => {
        const productId = toStr(product._id || product.id || product.productId || '');
        if (!productId) return;

        set((state) => {
          let selectedVariant = product.selectedVariant || null;
          const variants = product.variants || [];

          // ── 1. FIFO Variant Resolution (Only if no variant is pre-selected) ──
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
              return state; // No state change
            }
          }

          // ── 2. Calculate Final Details ──────────────────────────────────────
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
            finalImage = `http://localhost:5000${finalImage}`;
          }

          // ── Variant Label ───────────────────────────────────────────────────
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

          // ── Max Stock Calculation ───────────────────────────────────────────
          const maxStock = selectedVariant
            ? calcVariantStock(selectedVariant)
            : (product.variants && product.variants.length > 0)
              ? 0 // If it expects variants but selectedVariant is null (shouldn't happen due to above), maxStock is 0
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
            giftBox: product.giftBox || null,
            dimensions: (selectedVariant?.length && selectedVariant?.width && selectedVariant?.height) 
              ? { length: selectedVariant.length, width: selectedVariant.width, height: selectedVariant.height }
              : product.dimensions || null,
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
              // Toast success for increment
              const vLabel = variantOptions ? ` (${variantOptions})` : '';
              toast.success(`Increased quantity of ${newItem.name}${vLabel}`);
              return { ...x, qty: newQty, variantOptions: variantOptions || x.variantOptions };
            });
          } else {
            const clampedQty = maxStock > 0 ? Math.min(qty, maxStock) : qty;
            updatedItems = [...state.cartItems, { ...newItem, qty: clampedQty }];
            // Toast success for new addition
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

            // Validate against maxStock
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

      // ─── Remove a specific item from cart ─────────────────────────────────
      removeFromCart: (productId, variantId = undefined) => {
        set((state) => {
          const updatedItems = state.cartItems.filter(
            (item) => !itemMatches(item, productId, variantId)
          );
          syncCartDebounced(updatedItems, get);
          return { cartItems: updatedItems };
        });
      },

      // ─── Clear entire cart ─────────────────────────────────────────────────
      clearCart: () => {
        set({ cartItems: [] });
        syncCartDebounced([], get);
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
    }),
    {
      name: 'woodora-cart-v3', // Changed key to forcefully purge corrupt local storage
      version: 1,
    }
  )
);

// ─── Normalize cart items coming from the backend ────────────────────────────
function normalizeCartItem(item = {}) {
  return {
    product: toStr(item.product),
    name: item.name || 'Product',
    image: item.image || '',
    price: Number(item.price) || 0,
    qty: Math.max(1, Number(item.qty) || 1),
    variant: item.variant ? toStr(item.variant) : null,
    variantOptions: item.variantOptions || null,
    maxStock: Number(item.maxStock) || 999,
    weight: Number(item.weight) || 0,
    isGift: item.isGift || false,
    giftBox: item.giftBox || null,
    dimensions: item.dimensions || null,
  };
}

export default useCartStore;
