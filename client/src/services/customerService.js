import api from './api';

/**
 * Customer API Service
 * Handles customer retrieval, search and registration
 */
export const customerService = {
  // GET /api/customers
  getAll: async (params = {}) => {
    return await api.get('/customers', { params });
  },

  // GET /api/customers/:id
  getById: async (id) => {
    return await api.get(`/customers/${id}`);
  },

  // POST /api/customers
  create: async (customerData) => {
    return await api.post('/customers', customerData);
  },

  // PUT /api/customers/:id
  update: async (id, updateData) => {
    return await api.put(`/customers/${id}`, updateData);
  },

  // GET /api/customers/:id/invoices
  getInvoices: async (id) => {
    return await api.get(`/customers/${id}/invoices`);
  }
};
