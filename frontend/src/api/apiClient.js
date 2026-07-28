/**
 * Centralised Axios instance for the entire frontend.
 *
 * Rules:
 *  - All API calls MUST use this client instead of raw axios / fetch.
 *  - baseURL is driven by VITE_API_BASE_URL so that dev, preview, and
 *    production all resolve to the correct host without code changes.
 *  - Interceptors handle auth headers, 401 logout, and structured errors.
 */
import axios from 'axios';

// ── Base URL ─────────────────────────────────────────────────────────────────
// VITE_API_BASE_URL must be set in .env / .env.production.
// Fallback to localhost only for local development without a .env file.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export const API_ORIGIN = BASE_URL;           // e.g. "https://api.example.com"
export const API_BASE   = `${BASE_URL}/api`;  // e.g. "https://api.example.com/api"

// ── Axios instance ────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,            // 15 s – prevents requests hanging forever
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: normalise errors ────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error / timeout / DNS failure
      const networkErr = new Error(
        'Cannot reach the server. Please check your internet connection.'
      );
      networkErr.isNetwork = true;
      return Promise.reject(networkErr);
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        // Token expired or invalid – clear session and redirect to login
        localStorage.removeItem('token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        break;
      case 403:
        error.message = data?.message || 'You do not have permission to perform this action.';
        break;
      case 404:
        error.message = data?.message || 'The requested resource was not found.';
        break;
      case 429:
        error.message = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        error.message = data?.message || 'A server error occurred. Please try again later.';
        break;
      default:
        error.message = data?.message || error.message || 'An unexpected error occurred.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
