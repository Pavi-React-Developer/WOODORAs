const API_URL = 'http://localhost:5000/api/bulk-orders';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const bulkOrderService = {
  // Bulk Order Requests
  createBulkOrder: async (data) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getAllBulkOrders: async () => {
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  getMyBulkOrders: async () => {
    const res = await fetch(`${API_URL}/my-requests`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  updateBulkOrderStatus: async (id, data) => {
    const res = await fetch(`${API_URL}/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Dynamic Fields
  getAllFields: async () => {
    const res = await fetch(`${API_URL}/fields`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  createField: async (data) => {
    const res = await fetch(`${API_URL}/fields`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateField: async (id, data) => {
    const res = await fetch(`${API_URL}/fields/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteField: async (id) => {
    const res = await fetch(`${API_URL}/fields/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  }
};
