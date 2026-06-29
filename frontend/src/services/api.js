import axios from 'axios';

const api = axios.create({
  baseURL: 'https://labtrack-production-33d5.up.railway.app/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Adjuntar token JWT en cada request ───────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('labtrack_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Manejar errores globales (401 → logout) ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('labtrack_token');
      localStorage.removeItem('labtrack_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
