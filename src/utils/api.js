// api.js
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // This is CRITICAL - it sends cookies with every request
});

// Request interceptor to handle Content-Type
api.interceptors.request.use(
  (config) => {
    // Don't set Content-Type for FormData (axios adds the boundary) or for a file sent as-is, such as a
    // session recording, which sets its own video type
    const sendsFile = config.data instanceof FormData || (typeof Blob !== 'undefined' && config.data instanceof Blob);
    if (!sendsFile) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get 401 (unauthorized), redirect to login
    if (error.response?.status === 401) {
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;