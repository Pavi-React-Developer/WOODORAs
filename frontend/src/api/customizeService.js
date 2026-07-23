import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    throw new Error(error.response?.data?.message || fallbackMessage || 'An error occurred');
  }
};

export const customizeService = {
  // Public
  getActiveFields: async () => {
    try {
      const response = await axios.get(`${API_URL}/customize/fields`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch fields');
    }
  },
  submitRequest: async (requestData) => {
    // If the user has a token, send it, otherwise send without token
    try {
      const response = await axios.post(`${API_URL}/customize/requests`, requestData, getAuthHeaders());
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit customize request');
    }
  },

  // Admin - Customize Fields
  getAllFields: async () => {
    return withAuthRetry((config) => axios.get(`${API_URL}/customize/admin/fields`, config), 'Failed to fetch fields');
  },
  createField: async (data) => {
    return withAuthRetry((config) => axios.post(`${API_URL}/customize/admin/fields`, data, config), 'Failed to create field');
  },
  updateField: async (id, data) => {
    return withAuthRetry((config) => axios.put(`${API_URL}/customize/admin/fields/${id}`, data, config), 'Failed to update field');
  },
  deleteField: async (id) => {
    return withAuthRetry((config) => axios.delete(`${API_URL}/customize/admin/fields/${id}`, config), 'Failed to delete field');
  },

  // Admin - Requests
  getAllRequests: async () => {
    return await withAuthRetry(
      (config) => axios.get(`${API_URL}/customize/admin/requests`, config),
      'Failed to fetch requests'
    );
  },
  getMyRequests: async () => {
    return await withAuthRetry(
      (config) => axios.get(`${API_URL}/customize/my-requests`, config),
      'Failed to fetch your customize requests'
    );
  },
  updateRequestStatus: async (id, status, rejectionReason = '') => {
    return await withAuthRetry(
      (config) => axios.put(`${API_URL}/customize/admin/requests/${id}/status`, { status, rejectionReason }, config),
      'Failed to update request status'
    );
  }
};
