import api from './api';

/**
 * Product API Service
 * Handles all HTTP communication for Supermarket Products
 */
export const productService = {
  // GET /api/products (supports query parameters: page, limit, search, category, status, sortBy, sortOrder)
  getAll: async (params = {}) => {
    return await api.get('/products', { params });
  },

  // GET /api/products/:id
  getById: async (id) => {
    return await api.get(`/products/${id}`);
  },

  // GET /api/products/barcode?code=...
  getByBarcode: async (code) => {
    return await api.get('/products/barcode', { params: { code } });
  },

  // POST /api/products
  create: async (productData) => {
    return await api.post('/products', productData);
  },

  // PATCH /api/products/:id
  update: async (id, updateData) => {
    return await api.patch(`/products/${id}`, updateData);
  },

  // DELETE /api/products/:id
  delete: async (id) => {
    return await api.delete(`/products/${id}`);
  }
};
