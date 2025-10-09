import { api } from './api';

export const auth = {
  login: (credentials) => api.post('/api/auth/login', credentials).then(r => r.data),
  me: () => api.get('/api/auth/me').then(r => r.data),
};

export const leads = {
  list: (params) => api.get('/api/admin/leads', { params }).then(r => r.data),
  distribute: () => api.post('/api/admin/distribute-leads').then(r => r.data),
  remove: (id) => api.delete(`/api/admin/leads/${id}`).then(r => r.data),
};

export const employees = {
  list: () => api.get('/api/admin/employees').then(r => r.data),
};

export const calls = {
  start: (leadId) => api.post('/api/calls/start', { leadId }).then(r => r.data),
  end: (payload) => api.post('/api/calls/end', payload).then(r => r.data),
};

export const recordings = {
  adminList: (params) => api.get('/api/recordings/admin/recordings', { params }).then(r => r.data),
  myList: () => api.get('/api/recordings/employee/recordings').then(r => r.data),
};



