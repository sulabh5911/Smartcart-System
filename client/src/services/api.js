
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://smartcart-system.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartmart_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API responses and errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        message: 'Cannot connect to Smart Mart Pro backend. Please check your internet connection or backend server.',
        isOffline: true
      });
    }

    const statusCode = error.response.status;
    const backendData = error.response.data;

    if (statusCode === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginRequest) {
        localStorage.removeItem('smartmart_token');
        localStorage.removeItem('smartmart_user');

        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    return Promise.reject({
      statusCode,
      message: backendData?.message || error.message || 'Server returned an error.',
      errors: backendData?.errors || []
    });
  }
);

export default api;
