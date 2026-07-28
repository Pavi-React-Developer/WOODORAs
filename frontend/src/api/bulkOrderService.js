/**
 * Bulk Order API service.
 *
 * Uses the centralised apiClient so that VITE_API_BASE_URL is always
 * respected — no hardcoded localhost URLs.
 */
import apiClient from './apiClient';

const PREFIX = '/bulk-orders';

export const bulkOrderService = {
  // ── Customer-facing ────────────────────────────────────────────────────────

  /** Submit a new bulk order request (authenticated customer) */
  createBulkOrder: async (data) => {
    const res = await apiClient.post(PREFIX, data);
    return res.data;
  },

  /** Fetch the current user's own bulk order history */
  getMyBulkOrders: async () => {
    const res = await apiClient.get(`${PREFIX}/my-requests`);
    return res.data;
  },

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** Fetch all bulk orders (admin only) */
  getAllBulkOrders: async () => {
    const res = await apiClient.get(PREFIX);
    return res.data;
  },

  /** Approve or reject a bulk order (admin only) */
  updateBulkOrderStatus: async (id, data) => {
    const res = await apiClient.put(`${PREFIX}/${id}/status`, data);
    return res.data;
  },

  // ── Dynamic form fields (admin manages, public reads) ──────────────────────

  /** Fetch all configured bulk-order custom form fields */
  getAllFields: async () => {
    const res = await apiClient.get(`${PREFIX}/fields`);
    return res.data;
  },

  /** Create a new custom field (admin only) */
  createField: async (data) => {
    const res = await apiClient.post(`${PREFIX}/fields`, data);
    return res.data;
  },

  /** Update an existing custom field (admin only) */
  updateField: async (id, data) => {
    const res = await apiClient.put(`${PREFIX}/fields/${id}`, data);
    return res.data;
  },

  /** Delete a custom field (admin only) */
  deleteField: async (id) => {
    const res = await apiClient.delete(`${PREFIX}/fields/${id}`);
    return res.data;
  },
};
