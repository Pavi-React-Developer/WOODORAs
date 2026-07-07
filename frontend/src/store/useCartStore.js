import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '../api/cartService';

const itemMatches = (item, productId, variant = undefined) => (
  item.product === productId && (variant === undefined || String(item.variant || '') === String(variant || ''))
);

const syncCart = async (items) => {
  if (!localStorage.getItem('token')) return;
  try {
    await cartService.replaceCart(items);
  } catch (error) {
    console.error('Cart sync failed:', error);
  }
};

const useCartStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      isCartHydrated: false,

      hydrateCartFromBackend: async () => {
        if (!localStorage.getItem('token')) {
          set({ isCartHydrated: true });
          return;
        }

        try {
          const backendCart = await cartService.getCart();
          const backendItems = backendCart.items || [];
          const localItems = get().cartItems || [];

          if (backendItems.length > 0) {
            set({ cartItems: backendItems, isCartHydrated: true });
          } else {
            set({ isCartHydrated: true });
            if (localItems.length > 0) {
              await syncCart(localItems);
            }
          }
        } catch (error) {
          console.error('Failed to load backend cart:', error);
          set({ isCartHydrated: true });
        }
      },

      // Add item to cart
      addToCart: (product, qty = 1) => {
        const variantPrice = product.selectedVariant?.basePrice ?? product.selectedVariant?.price;
        const finalPrice = variantPrice != null ? variantPrice : product.price;

        let finalImage = product.images?.[0]?.url || product.image;
        if (product.selectedVariant?.images?.length > 0) {
          finalImage = product.selectedVariant.images[0]?.url || product.selectedVariant.images[0];
        } else if (product.selectedVariant?.image) {
          finalImage = product.selectedVariant.image;
        }

        const variantOptions = product.selectedVariant?.options
          ?.map(opt => `${opt.attribute?.name || opt.attributeName || 'Option'}: ${opt.value}`)
          ?.join(', ');

        const productVariants = product?.variants || [];
        const maxStock = product.selectedVariant 
            ? Math.max(0, (product.selectedVariant.inventory || 0) - (product.selectedVariant.reserveStock || 0))
            : productVariants.length > 0
              ? productVariants.reduce((sum, v) => sum + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
              : (product?.inventory?.stockQuantity || product?.stock || 0);

        const item = {
          product: product._id,
          name: product.name,
          image: finalImage,
          price: finalPrice,
          weight: product.selectedVariant?.weight || product.shippingWeight || product.weight || product.additionalInfo?.find(info => info.key?.toLowerCase() === 'weight')?.value || '',
          qty,
          variant: product.selectedVariant?._id || product.selectedVariant?.id || null,
          variantOptions: variantOptions || null,
          maxStock: maxStock,
        };

        set((state) => {
          const existItem = state.cartItems.find(
            (x) => x.product === item.product && x.variant === item.variant
          );

          if (existItem) {
            const cartItems = state.cartItems.map((x) =>
              x.product === existItem.product && x.variant === existItem.variant 
                ? { ...item, qty: x.qty + qty } 
                : x
            );
            syncCart(cartItems);
            return {
              cartItems,
            };
          } else {
            const cartItems = [...state.cartItems, item];
            syncCart(cartItems);
            return {
              cartItems,
            };
          }
        });
      },

      // Remove item from cart
      removeFromCart: (productId, variant = undefined) => {
        set((state) => {
          const cartItems = state.cartItems.filter((x) => !itemMatches(x, productId, variant));
          syncCart(cartItems);
          return { cartItems };
        });
      },

      // Update quantity of specific item
      updateQuantity: (productId, qty, variant = undefined) => {
        set((state) => {
          const cartItems = state.cartItems.map((x) =>
            itemMatches(x, productId, variant) ? { ...x, qty: Number(qty) } : x
          );
          syncCart(cartItems);
          return { cartItems };
        });
      },

      // Clear all items
      clearCart: () => {
        set({ cartItems: [] });
        syncCart([]);
      },

      setCartItems: (items = []) => {
        set({ cartItems: items });
        syncCart(items);
      },

      // Calculations
      getSubtotal: () => {
        return get().cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
      },

      getTotalItems: () => {
        return get().cartItems.reduce((acc, item) => acc + item.qty, 0);
      },
    }),
    {
      name: 'wooden-toys-cart', // unique name for localStorage key
    }
  )
);

export default useCartStore;
