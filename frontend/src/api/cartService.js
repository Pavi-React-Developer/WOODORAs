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
  getCart: async () => withAuthRetry(
    (config) => axios.get(API_URL, config),
    'Failed to fetch cart'
  ),

  replaceCart: async (items) => withAuthRetry(
    (config) => axios.put(API_URL, { items }, config),
    'Failed to sync cart'
  ),

  addItem: async (item) => withAuthRetry(
    (config) => axios.post(`${API_URL}/items`, item, config),
    'Failed to add item to cart'
  ),

  updateItem: async (productId, qty, variant = null) => withAuthRetry(
    (config) => axios.put(`${API_URL}/items/${productId}`, { qty, variant }, config),
    'Failed to update cart item'
  ),

  removeItem: async (productId, variant = null) => withAuthRetry(
    (config) => axios.delete(`${API_URL}/items/${productId}`, {
      ...config,
      params: variant ? { variant } : {},
    }),
    'Failed to remove cart item'
  ),

  clearCart: async () => withAuthRetry(
    (config) => axios.delete(API_URL, config),
    'Failed to clear cart'
  ),
};
