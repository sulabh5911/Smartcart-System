import api from './api';

/**
 * Inventory API Service
 * Handles HTTP communication for Supermarket Inventory, Batches, Stock Movements & Valuation
 */
export const inventoryService = {
  // GET /api/inventory/summary
  getSummary: async () => {
    return await api.get('/inventory/summary');
  },

  // GET /api/inventory/batches (query params: page, limit, search, category, status, sortBy, sortOrder)
  getBatches: async (params = {}) => {
    return await api.get('/inventory/batches', { params });
  },

  // POST /api/inventory/receive
  receiveStock: async (receiveData) => {
    return await api.post('/inventory/receive', receiveData);
  },

  // POST /api/inventory/adjust
  adjustStock: async (adjustmentData) => {
    return await api.post('/inventory/adjust', adjustmentData);
  },

  // GET /api/inventory/movements (query params: page, limit, productId, movementType)
  getMovements: async (params = {}) => {
    return await api.get('/inventory/movements', { params });
  },

  // POST /api/inventory/products/:id/archive
  archiveProduct: async (id, data = {}) => {
    return await api.post(`/inventory/products/${id}/archive`, data);
  },

  // POST /api/inventory/products/:id/unarchive
  unarchiveProduct: async (id, data = {}) => {
    return await api.post(`/inventory/products/${id}/unarchive`, data);
  },

  // GET /api/batches/expiring?days=...
  getExpiringBatches: async (days = 'all') => {
    return await api.get('/batches/expiring', { params: { days } });
  }
};
