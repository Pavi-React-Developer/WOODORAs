/**
 * cartUtils.js
 * 
 * Provides production-ready utility functions for managing cart operations,
 * primarily focusing on automatic variant selection when a product is added
 * without a specific variant chosen (e.g. from a Product Card).
 */

/**
 * Validates stock for a specific variant.
 * 
 * @param {Object} variant - The variant object to check.
 * @param {Array} cartItems - Current items in the Redux cart state.
 * @param {string} productId - The ID of the product.
 * @returns {Object} { isAvailable: boolean, maxStock: number, currentQtyInCart: number }
 */
export const checkVariantAvailability = (variant, cartItems, productId) => {
    // 1. Calculate actual live stock based on inventory and reserve
    const maxStock = Math.max(0, (variant.inventory ?? variant.currentStock ?? 0) - (variant.reserveStock || 0));
    
    // 2. Find if this specific variant is already in the cart
    const existingCartItem = cartItems.find(
        item => String(item.product) === String(productId) && String(item.variant) === String(variant._id)
    );
    
    const currentQtyInCart = existingCartItem ? existingCartItem.qty : 0;
    
    // 3. Determine if we can add at least 1 more
    const isAvailable = currentQtyInCart < maxStock;

    return {
        isAvailable,
        maxStock,
        currentQtyInCart
    };
};

/**
 * Finds the next available variant in FIFO order that has sufficient stock.
 * This runs in O(n) complexity, exiting immediately once a variant is found.
 * 
 * @param {Object} product - The product object containing variants array.
 * @param {Array} cartItems - Current items in the Redux cart state.
 * @returns {Object|null} - Returns the variant object if available, otherwise null.
 */
export const findNextAvailableVariant = (product, cartItems) => {
    // Edge Case: Product has no variants
    if (!product.variants || product.variants.length === 0) {
        return null;
    }

    // Maintain FIFO order as received from the backend
    for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        
        // Skip inactive variants
        if (variant.isActive === false) continue;

        const { isAvailable } = checkVariantAvailability(variant, cartItems, product._id);

        // O(n) performance: Stop searching immediately after finding the first available variant
        if (isAvailable) {
            return variant;
        }
    }

    // Edge Case: All variants are exhausted or have 0 stock
    return null;
};
