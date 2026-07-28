import axios from 'axios';

// Use environment variable so the same build works in dev, preview, and production.
// Falls back to localhost only when the env var is not set (local dev without .env).
const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/reviews`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Public APIs ───────────────────────────────────────────────────────────────

export const reviewService = {
  getFeaturedReviews: async (params = {}) => {
    const res = await axios.get(`${API_URL}/featured`, { params });
    return res.data;
  },

  getReviews: async (productId, params = {}) => {
    const res = await axios.get(`${API_URL}/${productId}`, { params });
    return res.data;
  },

  getGallery: async (productId) => {
    const res = await axios.get(`${API_URL}/${productId}/gallery`);
    return res.data;
  },

  // ── Authenticated user APIs ───────────────────────────────────────────────

  /** Get the current user's own review for a product (null if none) */
  getMyReview: async (productId) => {
    const res = await axios.get(`${API_URL}/${productId}/my-review`, {
      headers: getAuthHeaders(),
    });
    return res.data; // null or review object
  },

  getMyOrderItemReview: async (orderId, orderItemId) => {
    const res = await axios.get(`${API_URL}/order-item/${orderId}/${orderItemId}`, {
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  createReview: async (productId, formData, onUploadProgress) => {
    const res = await axios.post(`${API_URL}/${productId}`, formData, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  /** Update current user's existing review */
  updateReview: async (productId, formData, onUploadProgress) => {
    const res = await axios.put(`${API_URL}/${productId}/my-review`, formData, {
      headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return res.data;
  },

  voteReview: async (reviewId, vote) => {
    const res = await axios.put(
      `${API_URL}/${reviewId}/vote`,
      { vote },
      { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  },

  deleteReview: async (reviewId) => {
    const res = await axios.delete(`${API_URL}/${reviewId}`, {
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  // ── Admin APIs ────────────────────────────────────────────────────────────

  /** Fetch all reviews with optional filters (admin only) */
  adminGetAllReviews: async (params = {}) => {
    const res = await axios.get(`${API_URL}/admin/all`, {
      headers: getAuthHeaders(),
      params,
    });
    return res.data;
  },

  /** Fetch global review stats / KPIs (admin only) */
  adminGetStats: async () => {
    const res = await axios.get(`${API_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  /** Update a review's moderation status (admin only) */
  adminUpdateStatus: async (reviewId, status) => {
    const res = await axios.patch(
      `${API_URL}/admin/${reviewId}/status`,
      { status },
      { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  },

  /** Post an admin reply to a review (admin/manager only) */
  adminReplyToReview: async (reviewId, text) => {
    const res = await axios.put(
      `${API_URL}/${reviewId}/reply`,
      { text },
      { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } }
    );
    return res.data;
  },
};
