import axios from 'axios';
import { authService } from './authService';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api`;

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

export const adminService = {
  getCancellationRules: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/cancellation-rules`, config),
      'Failed to load cancellation rules'
    );
  },

  createCancellationRule: async (ruleData) => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/cancellation-rules`, ruleData, config),
      'Failed to create cancellation rule'
    );
  },

  updateCancellationRule: async (id, ruleData) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/cancellation-rules/${id}`, ruleData, config),
      'Failed to update cancellation rule'
    );
  },

  deleteCancellationRule: async (id) => {
    return withAuthRetry(
      (config) => axios.delete(`${API_URL}/cancellation-rules/${id}`, config),
      'Failed to delete cancellation rule'
    );
  },

  seedCancellationRules: async () => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/cancellation-rules/seed`, {}, config),
      'Failed to seed cancellation rules'
    );
  },

  getRefunds: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/refunds`, config),
      'Failed to load refunds'
    );
  },

  seedRefunds: async () => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/refunds/seed`, {}, config),
      'Failed to seed refunds'
    );
  },

  approveRefund: async (id) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/refunds/${id}/approve`, {}, config),
      'Failed to approve refund'
    );
  },

  processRefund: async (id, refundMethod) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/refunds/${id}/process`, { refundMethod }, config),
      'Failed to process refund'
    );
  },

  updateRefundStatus: async (id, status) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/refunds/${id}/status`, { status }, config),
      'Failed to update refund status'
    );
  },

  deleteRefund: async (id) => {
    return withAuthRetry(
      (config) => axios.delete(`${API_URL}/refunds/${id}`, config),
      'Failed to delete refund'
    );
  },

  getDashboardStats: async (days) => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/orders/dashboard-stats`, { ...config, params: { days } }),
      'Failed to fetch dashboard stats'
    );
  },

  getCustomers: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/auth/customers`, config),
      'Failed to fetch customers'
    );
  },

  getCustomerOrders: async (userId) => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/auth/customers/${userId}/orders`, config),
      'Failed to fetch customer orders'
    );
  },

  // Product Fee Rules
  getProductFeeRules: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/product-fees`, config),
      'Failed to fetch product fee rules'
    );
  },

  createProductFeeRule: async (data) => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/product-fees`, data, config),
      'Failed to create product fee rule'
    );
  },

  updateProductFeeRule: async (id, data) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/product-fees/${id}`, data, config),
      'Failed to update product fee rule'
    );
  },

  deleteProductFeeRule: async (id) => {
    return withAuthRetry(
      (config) => axios.delete(`${API_URL}/product-fees/${id}`, config),
      'Failed to delete product fee rule'
    );
  },

  getCoupons: async (params = {}) => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/coupons`, { ...config, params }),
      'Failed to fetch coupons'
    );
  },

  createCoupon: async (data) => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/coupons`, data, config),
      'Failed to create coupon'
    );
  },

  updateCoupon: async (id, data) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/coupons/${id}`, data, config),
      'Failed to update coupon'
    );
  },

  deleteCoupon: async (id) => {
    return withAuthRetry(
      (config) => axios.delete(`${API_URL}/coupons/${id}`, config),
      'Failed to delete coupon'
    );
  },

  toggleCouponStatus: async (id) => {
    return withAuthRetry(
      (config) => axios.patch(`${API_URL}/coupons/${id}/toggle-status`, {}, config),
      'Failed to update coupon status'
    );
  },

  toggleCouponVisibility: async (id) => {
    return withAuthRetry(
      (config) => axios.patch(`${API_URL}/coupons/${id}/toggle-visibility`, {}, config),
      'Failed to update coupon visibility'
    );
  },

  getEligibleCoupons: async (subtotal, items = []) => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/coupons/eligible`, { subtotal, items }, config),
      'Failed to fetch eligible coupons'
    );
  },

  applyCoupon: async (couponCode, subtotal, items = []) => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/coupons/apply`, { couponCode, subtotal, items }, config),
      'Failed to apply coupon'
    );
  },

  getGiftCardConfig: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/gift-cards/config`, config),
      'Failed to fetch gift card config'
    );
  },

  updateGiftCardConfig: async (data) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/gift-cards/config`, data, config),
      'Failed to update gift card config'
    );
  },

  getAdminGiftOrders: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/gift-cards/admin/orders`, config),
      'Failed to fetch gift card orders'
    );
  },

  getAdminMessages: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/gift-cards/admin/messages`, config),
      'Failed to fetch personalized messages'
    );
  },

  // Dynamic Gift Box Rules
  getGiftBoxRules: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/gift-cards/admin/box-rules`, config),
      'Failed to fetch gift box rules'
    );
  },

  createGiftBoxRule: async (data) => {
    return withAuthRetry(
      (config) => axios.post(`${API_URL}/gift-cards/admin/box-rules`, data, config),
      'Failed to create gift box rule'
    );
  },

  updateGiftBoxRule: async (id, data) => {
    return withAuthRetry(
      (config) => axios.put(`${API_URL}/gift-cards/admin/box-rules/${id}`, data, config),
      'Failed to update gift box rule'
    );
  },

  deleteGiftBoxRule: async (id) => {
    return withAuthRetry(
      (config) => axios.delete(`${API_URL}/gift-cards/admin/box-rules/${id}`, config),
      'Failed to delete gift box rule'
    );
  }
};
