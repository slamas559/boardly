// api.js
import axios from "axios";
import { getToken } from "./auth";

const api = axios.create({
  baseURL: "https://boardly-api.onrender.com",
  // baseURL: "http://localhost:5000",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
