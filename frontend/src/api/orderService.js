import axios from 'axios';
import { authService } from './authService';

const API_URL = 'http://localhost:5000/api/orders';
export const ORDER_STATUS_OPTIONS = [
  'Placed',
  'Processing',
  'Shipping',
  'Delivered',
  'Out for delivery',
  'Cancelled',
];

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
      window.location.href = '/?view=login';
      throw new Error('Session expired, please log in again.');
    }
    throw new Error(error.response?.data?.message || error.message || fallbackMessage);
  }
};

export const orderService = {
  createOrder: async (orderData) => {
    return withAuthRetry(
      (config) => axios.post(API_URL, orderData, config),
      'Failed to create order'
    );
  },

  getOrderById: async (id) => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/${id}`, config),
      'Failed to fetch order'
    );
  },

  getMyOrders: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/myorders`, config),
      'Failed to fetch your orders'
    );
  },

  getAllOrders: async () => {
    return withAuthRetry(
      (config) => axios.get(API_URL, config),
      'Failed to fetch all orders'
    );
  },

  updateOrderToDelivered: async (id) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/${id}/deliver`, {}, config),
      'Failed to mark as delivered'
    );
  },
  
  updateOrderToPaid: async (id, paymentResult) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/${id}/pay`, paymentResult, config),
      'Failed to update payment status'
    );
  },

  updateOrderStatus: async (id, statusData) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/${id}/status`, statusData, config),
      'Failed to update order status'
    );
  },
};
