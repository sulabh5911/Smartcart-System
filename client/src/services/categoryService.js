import api from './api';

/**
 * Category API Service
 * Handles all HTTP communication for Supermarket Categories
 */
export const categoryService = {
  // GET /api/categories
  getAll: async () => {
    return await api.get('/categories');
  },

  // GET /api/categories/:id
  getById: async (id) => {
    return await api.get(`/categories/${id}`);
  },

  // POST /api/categories
  create: async (categoryData) => {
    return await api.post('/categories', categoryData);
  },

  // PATCH /api/categories/:id
  update: async (id, updateData) => {
    return await api.patch(`/categories/${id}`, updateData);
  },

  // DELETE /api/categories/:id
  delete: async (id) => {
    return await api.delete(`/categories/${id}`);
  }
};
