import axios from 'axios';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const courierService = {
  getCouriers: async () => {
    const response = await axios.get(`${API_URL}/couriers`, getAuthHeaders());
    return response.data;
  },
  createCourier: async (name, trackingUrl) => {
    const response = await axios.post(`${API_URL}/couriers`, { name, trackingUrl }, getAuthHeaders());
    return response.data;
  },
  deleteCourier: async (id) => {
    const response = await axios.delete(`${API_URL}/couriers/${id}`, getAuthHeaders());
    return response.data;
  }
};
