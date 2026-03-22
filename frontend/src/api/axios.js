import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('lf_tok');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const data = err.response?.data;
    if (data?.message === 'Invalid token') {
      localStorage.removeItem('lf_tok');
      window.location.reload();
    }
    return Promise.resolve(data || { success: false, message: 'Server error' });
  }
);

export default api;
