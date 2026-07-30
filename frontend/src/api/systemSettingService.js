import { authService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SETTINGS_URL = `${API_BASE_URL}/settings`;

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
    headers: { ...getHeaders(), ...options.headers },
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

export const systemSettingService = {
  getWalletConfig: () => request(`${SETTINGS_URL}/wallet`),
  updateWalletConfig: (walletEnabled) => 
    request(`${SETTINGS_URL}/wallet`, {
      method: 'PUT',
      body: JSON.stringify({ walletEnabled }),
    }),
};
