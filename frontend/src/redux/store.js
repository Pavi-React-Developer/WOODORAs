import { configureStore } from '@reduxjs/toolkit';
import layoutReducer from './layoutSlice';
// If cartSlice is used we could import it here, but looking at the project, cart is mostly zustand. 
// We will only use this store for layout to avoid conflicts if they already have another solution, or they can be combined later.
// Currently App uses useCartStore (zustand). We'll add Redux for layout as requested.

export const store = configureStore({
    reducer: {
        layout: layoutReducer,
    }
});
