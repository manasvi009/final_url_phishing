import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const hasToken = !!localStorage.getItem('token');
    if (error.response?.status === 401 && hasToken) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user_role');
      window.dispatchEvent(new Event("auth-changed"));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
