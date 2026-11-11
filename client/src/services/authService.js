import api from './api';

export const authService = {
  /**
   * Log in staff member
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data; // { user, token }
  },

  /**
   * Get currently authenticated user profile
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  /**
   * Log out staff member
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('smartmart_token');
      localStorage.removeItem('smartmart_user');
    }
  },

  /**
   * Update own profile
   */
  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData);
    return response.data.user;
  }
};

export default authService;
