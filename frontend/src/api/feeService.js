import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const FEES_URL = `${API_BASE_URL}/fees`;

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
};

const handleResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const request = async (url, options = {}) => {
    const doFetch = () => fetch(url, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers,
        },
    });

    let response = await doFetch();

    if (response.status === 401) {
        const refreshed = await authService.refreshSession();
        if (refreshed) {
            response = await doFetch();
        } else {
            authService.logout();
            throw new Error('Session expired, please log in again.');
        }
    }

    return handleResponse(response);
};

export const feeAPI = {
    // Fees
    getAllFees: () => request(FEES_URL),
    getFeeById: (id) => request(`${FEES_URL}/${id}`),
    createFee: (data) => request(FEES_URL, { method: 'POST', body: JSON.stringify(data) }),
    updateFee: (id, data) => request(`${FEES_URL}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFee: (id) => request(`${FEES_URL}/${id}`, { method: 'DELETE' }),

    // Categories
    getFeeCategories: () => request(`${FEES_URL}/categories`),
    createFeeCategory: (data) => request(`${FEES_URL}/categories`, { method: 'POST', body: JSON.stringify(data) }),
    deleteFeeCategory: (id) => request(`${FEES_URL}/categories/${id}`, { method: 'DELETE' }),

    // Payment Methods
    getPaymentMethods: () => request(`${FEES_URL}/payment-methods`),
    createPaymentMethod: (data) => request(`${FEES_URL}/payment-methods`, { method: 'POST', body: JSON.stringify(data) }),

    // Product Fee Rules
    getProductFeeRules: () => request(`${API_BASE_URL}/product-fee-rules`),
};
