import axios from 'axios';
import { authService } from './authService';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/cart`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  };
};

const withAuthRetry = async (requestFn, fallbackMessage) => {
  try {
    const response = await requestFn(getAuthHeaders());
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      const refreshed = await authService.refreshSession();
      if (refreshed) {
        const retryResponse = await requestFn(getAuthHeaders());
        return retryResponse.data;
      }
      authService.logout();
      throw new Error('Session expired, please log in again.');
    }
    throw new Error(error.response?.data?.message || error.message || fallbackMessage);
  }
};

export const cartService = {
  /** GET /api/cart - Fetch the authenticated user's cart */
  getCart: async () => withAuthRetry(
    (config) => axios.get(API_URL, config),
    'Failed to fetch cart'
  ),

  /** POST /api/cart/summary - Fetch the dynamic checkout summary */
  getCartSummary: async (payload) => withAuthRetry(
    (config) => axios.post(`${API_URL}/summary`, payload, config),
    'Failed to fetch cart summary'
  ),

  /** PUT /api/cart - Replace entire cart (sync) */
  replaceCart: async (items) => withAuthRetry(
    (config) => axios.put(API_URL, { items }, config),
    'Failed to sync cart'
  ),

  /** POST /api/cart/items - Add an item (increments qty if product+variant already exists) */
  addItem: async (item) => withAuthRetry(
    (config) => axios.post(`${API_URL}/items`, item, config),
    'Failed to add item to cart'
  ),

  /** PUT /api/cart/items/:productId - Update quantity for a product (+ optional variant) */
  updateItem: async (productId, qty, variant = null) => withAuthRetry(
    (config) => axios.put(`${API_URL}/items/${productId}`, { qty, variant }, config),
    'Failed to update cart item'
  ),

  /** DELETE /api/cart/item/:itemId - Remove item by MongoDB subdocument _id (precise) */
  removeItemById: async (itemId) => withAuthRetry(
    (config) => axios.delete(`${API_URL}/item/${itemId}`, config),
    'Failed to remove cart item'
  ),

  /** DELETE /api/cart/items/:productId - Fallback: remove by productId + variant query */
  removeItem: async (productId, variant = null) => withAuthRetry(
    (config) => axios.delete(`${API_URL}/items/${productId}`, {
      ...config,
      params: variant ? { variant } : {},
    }),
    'Failed to remove cart item'
  ),

  /** DELETE /api/cart - Clear all items for the authenticated user */
  clearCart: async () => withAuthRetry(
    (config) => axios.delete(API_URL, config),
    'Failed to clear cart'
  ),
};
