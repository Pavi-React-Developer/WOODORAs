import apiClient from './apiClient';

export const addressService = {
    getAddresses: async () => {
        try {
            const response = await apiClient.get('/user/addresses');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    addAddress: async (addressData) => {
        try {
            const response = await apiClient.post('/user/addresses', addressData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateAddress: async (addressId, addressData) => {
        try {
            const response = await apiClient.put(`/user/addresses/${addressId}`, addressData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    deleteAddress: async (addressId) => {
        try {
            const response = await apiClient.delete(`/user/addresses/${addressId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};
