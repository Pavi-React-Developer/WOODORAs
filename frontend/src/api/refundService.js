import axios from 'axios';
import { authService } from './authService';

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/refunds`;

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

export const refundService = {
  getMyRefunds: async () => {
    return withAuthRetry(
      (config) => axios.get(`${API_URL}/my`, config),
      'Failed to load refunds'
    );
  },
};
