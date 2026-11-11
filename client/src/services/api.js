import axios from 'axios';

/**
 * Centralized Axios API Client
 * Reads backend base URL from VITE_API_URL or defaults to http://localhost:5000/api
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartmart_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Standardized Error Handling & 401 Session Expiry
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (!error.response) {
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        return Promise.reject({
          message: 'Express backend server is offline or unreachable (port 5000). Please ensure server is running.',
          isOffline: true
        });
      }
      return Promise.reject({
        message: error.message || 'An unexpected client-side error occurred.'
      });
    }

    const statusCode = error.response.status;
    const backendData = error.response.data;

    // Handle session expiry or unauthorized
    if (statusCode === 401) {
      // If we got 401 and were not on the login call, clean up session
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('smartmart_token');
        localStorage.removeItem('smartmart_user');
        // Dispatch custom event for React AuthContext to gracefully transition
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    const customError = {
      statusCode,
      message: backendData?.message || error.message || 'Server returned an error.',
      errors: backendData?.errors || []
    };

    return Promise.reject(customError);
  }
);

export default api;
