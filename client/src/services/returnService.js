import api from './api';

/**
 * Return & Refund API Service
 * Handles customer returns, restock inspection, and refund processing
 */
export const returnService = {
  // POST /api/returns
  processReturn: async (returnData) => {
    return await api.post('/returns', returnData);
  },

  // GET /api/returns
  getAll: async (params = {}) => {
    return await api.get('/returns', { params });
  },

  // GET /api/returns/:id
  getById: async (id) => {
    return await api.get(`/returns/${id}`);
  },

  // GET /api/returns/sale/:saleId
  getBySale: async (saleId) => {
    return await api.get(`/returns/sale/${saleId}`);
  }
};
