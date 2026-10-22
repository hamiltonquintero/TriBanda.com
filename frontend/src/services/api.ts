import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://tribanda-api.onrender.com/api/v1',
});


// Adjunta el token JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirige al login si el token expira o es inválido
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      // Solo redirigir si no estamos ya en login o en ruta pública
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/publico')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
