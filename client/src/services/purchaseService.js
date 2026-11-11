import api from './api';

/**
 * Purchase API Service
 * Handles inward stock receipts, purchase orders, and supplier receipts
 */
export const purchaseService = {
  // POST /api/purchases/receive
  receiveStock: async (receiveData) => {
    return await api.post('/purchases/receive', receiveData);
  },

  // GET /api/purchases
  getAll: async (params = {}) => {
    return await api.get('/purchases', { params });
  },

  // GET /api/purchases/:id
  getById: async (id) => {
    return await api.get(`/purchases/${id}`);
  }
};
