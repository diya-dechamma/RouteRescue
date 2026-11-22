import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

export const incidentAPI = {
  getAll: (params) => api.get('/incidents/', { params }),
  getOne: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents/', data),
  updateStatus: (id, status) => api.put(`/incidents/${id}/status`, { status }),
  analyze: (id) => api.post(`/incidents/${id}/analyze`),
};

export const teamAPI = {
  getAll: () => api.get('/teams/'),
  getAvailable: () => api.get('/teams/available'),
  create: (data) => api.post('/teams/', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  updateAvailability: (id, availability) => api.put(`/teams/${id}/availability`, { availability }),
  assign: (data) => api.post('/teams/assign', data),
};

export const roadAPI = {
  getAll: () => api.get('/roads/'),
  getNetwork: () => api.get('/roads/network'),
  updateCondition: (id, data) => api.put(`/roads/${id}/condition`, data),
  predictAccessibility: (data) => api.post('/roads/predict', data),
};

export const routeAPI = {
  optimize: (data) => api.post('/routes/optimize', data),
  recalculate: (data) => api.post('/routes/recalculate', data),
  getForAssignment: (id) => api.get(`/routes/assignment/${id}`),
};

export const resourceAPI = {
  getAllocations: () => api.get('/resources/allocations'),
  allocate: () => api.post('/resources/allocate'),
  getSummary: () => api.get('/resources/summary'),
};

export const assignmentAPI = {
  getAll: () => api.get('/assignments/'),
  getOne: (id) => api.get(`/assignments/${id}`),
  autoAssign: () => api.post('/assignments/auto-assign'),
};

export default api;
