import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartService } from '../api/cartService';
import { toast } from 'react-hot-toast';
import { findNextAvailableVariant } from '../utils/cartUtils';

// Async Thunk: Sync Cart with Backend
export const syncCartThunk = createAsyncThunk(
    'cart/syncCart',
    async (items, { rejectWithValue }) => {
        if (!localStorage.getItem('token')) return items;
        try {
            const response = await cartService.replaceCart(items);
            return response.items || items;
        } catch (error) {
            console.error('Cart sync failed:', error);
            return rejectWithValue(error.response?.data?.message || 'Sync failed');
        }
    }
);

// Async Thunk: Add to Cart (Smart Logic)
export const addToCartSmartThunk = createAsyncThunk(
    'cart/addToCartSmart',
    async ({ product, qty = 1 }, { getState, dispatch, rejectWithValue }) => {
        const state = getState().cart;
        const cartItems = state.cartItems;

        // 1. O(n) Logic to find the FIRST available variant
        const availableVariant = findNextAvailableVariant(product, cartItems);

        // Edge Case 3 & 5: All variants exhausted
        if (!availableVariant) {
            toast.error('All variants are already added or Out of Stock.');
            return rejectWithValue('OUT_OF_STOCK');
        }

        // 2. Prepare Cart Item payload
        const productId = product._id || product.id;
        const variantPrice = availableVariant.basePrice ?? availableVariant.price;
        const finalPrice = variantPrice != null ? variantPrice : product.price;

        let finalImage = product.images?.[0]?.url || product.image;
        if (availableVariant.images?.length > 0) {
            finalImage = availableVariant.images[0]?.url || availableVariant.images[0];
        }

        const maxStock = Math.max(0, (availableVariant.inventory ?? availableVariant.currentStock ?? 0) - (availableVariant.reserveStock || 0));

        // Format variant options strictly
        let variantOptions = [];
        if (availableVariant.options && Array.isArray(availableVariant.options)) {
            variantOptions = availableVariant.options.map(opt => `${opt.attributeName || 'Option'}: ${opt.value}`);
        } else if (availableVariant.variantCombination) {
            variantOptions = availableVariant.variantCombination.split('-');
        }
        const optionsStr = variantOptions.join(', ');

        const item = {
            product: productId,
            name: product.name,
            image: finalImage,
            price: finalPrice,
            qty,
            variant: availableVariant._id,
            variantOptions: optionsStr || null,
            maxStock,
        };

        // 3. Dispatch the local sync action (optimistic update)
        dispatch(cartSlice.actions.addToCart(item));

        // 4. Try syncing with backend API (Actual live validation happens here)
        if (localStorage.getItem('token')) {
            try {
                // We send the specific Add item request to trigger Backend Validation
                await cartService.addCartItem(item);
                toast.success(`Added ${product.name} (${optionsStr || 'Default'}) to cart.`);
            } catch (error) {
                // If backend validation fails (e.g. Race condition), rollback
                dispatch(cartSlice.actions.removeItem({ product: productId, variant: availableVariant._id }));
                const reason = error.response?.data?.message || 'Failed to add item.';
                toast.error(reason);
                return rejectWithValue(reason);
            }
        } else {
            toast.success(`Added ${product.name} to cart.`);
        }

        return item;
    }
);

const initialState = {
    cartItems: [],
    loading: false,
    error: null,
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        // Reducers MUST be immutable. Redux Toolkit uses Immer internally, so we can "mutate" safely.
        addToCart: (state, action) => {
            const incoming = action.payload;
            const existingItem = state.cartItems.find(
                item => String(item.product) === String(incoming.product) && String(item.variant) === String(incoming.variant)
            );

            if (existingItem) {
                // Increase quantity only, never exceed maxStock
                const newQty = existingItem.qty + incoming.qty;
                existingItem.qty = Math.min(newQty, incoming.maxStock);
            } else {
                // One cart line per variant
                state.cartItems.push(incoming);
            }
        },
        increaseQuantity: (state, action) => {
            const { productId, variantId } = action.payload;
            const item = state.cartItems.find(
                x => String(x.product) === String(productId) && String(x.variant) === String(variantId)
            );
            if (item && item.qty < item.maxStock) {
                item.qty += 1;
            }
        },
        decreaseQuantity: (state, action) => {
            const { productId, variantId } = action.payload;
            const item = state.cartItems.find(
                x => String(x.product) === String(productId) && String(x.variant) === String(variantId)
            );
            if (item && item.qty > 1) {
                item.qty -= 1;
            }
        },
        removeItem: (state, action) => {
            const { product, variant } = action.payload;
            state.cartItems = state.cartItems.filter(
                x => !(String(x.product) === String(product) && String(x.variant) === String(variant))
            );
        },
        clearCart: (state) => {
            state.cartItems = [];
        }
    },
    extraReducers: (builder) => {
        builder
            // Add To Cart Smart
            .addCase(addToCartSmartThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addToCartSmartThunk.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(addToCartSmartThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Sync Cart
            .addCase(syncCartThunk.fulfilled, (state, action) => {
                if (action.payload) {
                    state.cartItems = action.payload;
                }
            });
    }
});

export const { addToCart, increaseQuantity, decreaseQuantity, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
