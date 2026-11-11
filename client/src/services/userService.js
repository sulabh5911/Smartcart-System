import api from './api';

export const userService = {
  /**
   * Get paginated staff users with optional search & role filter
   */
  async getAll(params = {}) {
    const response = await api.get('/users', { params });
    return {
      users: response.data || [],
      pagination: response.meta || {}
    };
  },

  /**
   * Get single user by ID
   */
  async getById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data.user;
  },

  /**
   * Create new staff user (Admin only)
   */
  async create(userData) {
    const response = await api.post('/users', userData);
    return response.data.user;
  },

  /**
   * Update staff user
   */
  async update(id, userData) {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.user;
  },

  /**
   * Toggle staff active status (activate/deactivate)
   */
  async toggleStatus(id, isActive) {
    const response = await api.patch(`/users/${id}/status`, { isActive });
    return response.data.user;
  },

  /**
   * Admin reset password
   */
  async resetPassword(id, newPassword) {
    const response = await api.post(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  }
};

export default userService;
