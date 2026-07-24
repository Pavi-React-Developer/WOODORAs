import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ROLE_URL = `${API_BASE_URL}/roles`;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const request = async (url, options = {}) => {
  const doFetch = () =>
    fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) },
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await authService.refreshSession();
    if (refreshed) {
      res = await doFetch();
    } else {
      authService.logout();
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
};

export const roleAPI = {
  getAll: () => request(ROLE_URL),
  create: (data) => request(ROLE_URL, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`${ROLE_URL}/${id}`, { method: 'DELETE' }),
};
