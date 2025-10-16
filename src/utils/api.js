// api.js
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // This is CRITICAL - it sends cookies with every request
  headers: {
    'Content-Type': 'application/json',
  }
});

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