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

export const advancedBookingService = {
    // Public/Semi-public: Create Booking
    createBooking: async (bookingData) => {
        // Here we just make the call, getAuthHeaders includes token if available
        try {
            const response = await axios.post(`${API_URL}/advanced-bookings`, bookingData, getAuthHeaders());
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Failed to submit advanced booking');
        }
    },

    // User Profile: Get My Bookings
    getMyBookings: async () => {
        return withAuthRetry(
            (config) => axios.get(`${API_URL}/advanced-bookings/my-bookings`, config),
            'Failed to load your advanced bookings'
        );
    },

    // Admin: Get All Bookings
    getAllBookings: async () => {
        return withAuthRetry(
            (config) => axios.get(`${API_URL}/advanced-bookings/admin`, config),
            'Failed to load advanced bookings'
        );
    },

    // Admin: Get Dashboard Metrics
    getDashboardMetrics: async () => {
        return withAuthRetry(
            (config) => axios.get(`${API_URL}/advanced-bookings/admin/metrics`, config),
            'Failed to load dashboard metrics'
        );
    },

    // Admin: Approve Booking
    approveBooking: async (id, data) => {
        return withAuthRetry(
            (config) => axios.put(`${API_URL}/advanced-bookings/admin/${id}/approve`, data, config),
            'Failed to approve booking'
        );
    },

    // Admin: Reject Booking
    rejectBooking: async (id, data) => {
        return withAuthRetry(
            (config) => axios.put(`${API_URL}/advanced-bookings/admin/${id}/reject`, data, config),
            'Failed to reject booking'
        );
    },

    // Admin: Update Order Details
    updateOrderDetails: async (id, data) => {
        return withAuthRetry(
            (config) => axios.put(`${API_URL}/advanced-bookings/admin/${id}/details`, data, config),
            'Failed to update order details'
        );
    },

    // Admin: Update Booking Status (Legacy)
    updateBookingStatus: async (id, status) => {
        return withAuthRetry(
            (config) => axios.put(`${API_URL}/advanced-bookings/admin/${id}/status`, { status }, config),
            'Failed to update booking status'
        );
    },

    // Admin: Delete Booking
    deleteBooking: async (id) => {
        return withAuthRetry(
            (config) => axios.delete(`${API_URL}/advanced-bookings/admin/${id}`, config),
            'Failed to delete booking'
        );
    }
};
