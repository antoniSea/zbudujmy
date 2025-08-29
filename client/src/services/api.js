import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https:///oferty.soft-synergy.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Don't set Content-Type for FormData, let browser handle it
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  register: (userData) => api.post('/api/auth/register', userData),
};

export const projectsAPI = {
  getAll: (params) => api.get('/api/projects', { params }).then(res => res.data),
  getById: (id) => api.get(`/api/projects/${id}`).then(res => res.data),
  create: (data) => api.post('/api/projects', data).then(res => res.data),
  update: (id, data) => api.put(`/api/projects/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/api/projects/${id}`).then(res => res.data),
  getStats: () => api.get('/api/projects/stats/overview').then(res => res.data),
  addNote: (id, text) => api.post(`/api/projects/${id}/notes`, { text }).then(res => res.data),
  addFollowUp: (id, note) => api.post(`/api/projects/${id}/followups`, { note }).then(res => res.data),
};

export const portfolioAPI = {
  getAll: (params) => api.get('/api/portfolio', { params }).then(res => res.data),
  getById: (id) => api.get(`/api/portfolio/${id}`).then(res => res.data),
  create: (data) => {
    // If data is FormData, let browser set the Content-Type header automatically
    const config = data instanceof FormData ? { headers: {} } : {};
    return api.post('/api/portfolio', data, config).then(res => res.data);
  },
  update: (id, data) => {
    // If data is FormData, let browser set the Content-Type header automatically
    const config = data instanceof FormData ? { headers: {} } : {};
    return api.put(`/api/portfolio/${id}`, data, config).then(res => res.data);
  },
  delete: (id) => api.delete(`/api/portfolio/${id}`).then(res => res.data),
  updateOrder: (id, order) => api.put(`/api/portfolio/${id}/order`, { order }).then(res => res.data),
  toggleStatus: (id) => api.patch(`/api/portfolio/${id}/toggle`).then(res => res.data),
};

export const offersAPI = {
  generate: (projectId) => api.post(`/api/offers/generate/${projectId}`).then(res => res.data),
  preview: (projectId) => api.get(`/api/offers/preview/${projectId}`).then(res => res.data),

}; 