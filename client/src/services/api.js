import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
};

export const rooms = {
  getAll: async () => (await api.get('/api/rooms')).data,
  getById: async (id) => (await api.get(`/api/rooms/${id}`)).data,
  create: async (data) => (await api.post('/api/rooms', data)).data,
  join: async (id) => (await api.post(`/api/rooms/${id}/join`)).data,
  leave: async (id) => (await api.post(`/api/rooms/${id}/leave`)).data,
};

export const messages = {
  getByRoom: async (id) => (await api.get(`/api/rooms/${id}/messages`)).data,
  send: async (id, message) => (await api.post(`/api/rooms/${id}/messages`, message)).data,
};

export default { auth, rooms, messages };