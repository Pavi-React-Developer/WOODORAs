import api from './apiClient';

export const gstService = {
  getRules: async () => {
    const response = await api.get('/v2/gst');
    return response.data;
  },

  createRule: async (data) => {
    const response = await api.post('/v2/gst', data);
    return response.data;
  },

  updateRule: async (id, data) => {
    const response = await api.put(`/v2/gst/${id}`, data);
    return response.data;
  },

  deleteRule: async (id) => {
    const response = await api.delete(`/v2/gst/${id}`);
    return response.data;
  }
};
