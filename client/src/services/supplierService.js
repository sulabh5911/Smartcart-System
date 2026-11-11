import api from './api';

/**
 * Supplier API Service
 * Handles vendor directory, profiles and procurement history
 */
export const supplierService = {
  // GET /api/suppliers
  getAll: async (params = {}) => {
    return await api.get('/suppliers', { params });
  },

  // GET /api/suppliers/:id
  getById: async (id) => {
    return await api.get(`/suppliers/${id}`);
  },

  // POST /api/suppliers
  create: async (supplierData) => {
    return await api.post('/suppliers', supplierData);
  },

  // PUT /api/suppliers/:id
  update: async (id, updateData) => {
    return await api.put(`/suppliers/${id}`, updateData);
  }
};
