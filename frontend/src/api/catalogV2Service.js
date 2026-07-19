import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Strip trailing /api and add /api/v2/catalog
const V2_BASE_URL = `${API_BASE_URL.replace(/\/api$/, '')}/api/v2/catalog`;

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
        // Validate middleware returns { errors: [...] }, service errors return { message: '...' }
        const msg = errorData.message
            || (Array.isArray(errorData.errors) ? errorData.errors.join(', ') : null)
            || `HTTP error! status: ${response.status}`;
        console.error('[API Error]', response.status, errorData);
        throw new Error(msg);
    }
    return response.json();
};

const request = async (path, options = {}) => {
    const doFetch = () => fetch(`${V2_BASE_URL}${path}`, {
        ...options,
        cache: 'no-store', // Always fetch fresh data from backend — no browser caching
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

export const categoryV2API = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/categories?${query}`);
    },
    getById: async (id) => {
        return request(`/categories/${id}`);
    },
    create: async (data) => {
        return request('/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    update: async (id, data) => {
        return request(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    delete: async (id) => {
        return request(`/categories/${id}`, {
            method: 'DELETE',
        });
    },
    restore: async (id) => {
        return request(`/categories/${id}/restore`, {
            method: 'POST',
        });
    },
    bulkStatus: async (ids, isActive) => {
        return request('/categories/bulk-status', {
            method: 'PUT',
            body: JSON.stringify({ ids, isActive }),
        });
    },
    bulkDelete: async (ids) => {
        return request('/categories/bulk-delete', {
            method: 'PUT',
            body: JSON.stringify({ ids }),
        });
    },
};

export const subCategoryV2API = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/subcategories?${query}`);
    },
    getById: async (id) => {
        return request(`/subcategories/${id}`);
    },
    create: async (data) => {
        return request('/subcategories', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    update: async (id, data) => {
        return request(`/subcategories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    delete: async (id) => {
        return request(`/subcategories/${id}`, {
            method: 'DELETE',
        });
    },
    bulkStatus: async (ids, isActive) => {
        return request('/subcategories/bulk-status', {
            method: 'PUT',
            body: JSON.stringify({ ids, isActive }),
        });
    },
    bulkDelete: async (ids) => {
        return request('/subcategories/bulk-delete', {
            method: 'PUT',
            body: JSON.stringify({ ids }),
        });
    },
    mapAttributes: async (subCategoryId, mappings) => {
        return request('/subcategories/map-attributes', {
            method: 'POST',
            body: JSON.stringify({ subCategoryId, mappings }),
        });
    },
    getMappedAttributes: async (subCategoryId) => {
        return request(`/subcategories/${subCategoryId}/attributes`);
    },
};

export const attributeV2API = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/attributes?${query}`);
    },
    getById: async (id) => {
        return request(`/attributes/${id}`);
    },
    create: async (data) => {
        return request('/attributes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    update: async (id, data) => {
        return request(`/attributes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    delete: async (id) => {
        return request(`/attributes/${id}`, {
            method: 'DELETE',
        });
    },
};

export const productV2API = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/products?${query}`);
    },
    getById: async (id) => {
        return request(`/products/${id}`);
    },
    create: async (data) => {
        return request('/products', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    update: async (id, data) => {
        return request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    delete: async (id) => {
        return request(`/products/${id}`, {
            method: 'DELETE',
        });
    },
    bulkStatus: async (ids, isActive) => {
        return request('/products/bulk-status', {
            method: 'PUT',
            body: JSON.stringify({ ids, isActive }),
        });
    },
    bulkDelete: async (ids) => {
        return request('/products/bulk-delete', {
            method: 'PUT',
            body: JSON.stringify({ ids }),
        });
    },
};

export const auditV2API = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/audit-logs?${query}`);
    },
};
