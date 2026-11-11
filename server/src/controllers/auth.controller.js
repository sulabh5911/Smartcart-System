import { authService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class AuthController {
  /**
   * POST /api/auth/login
   * Public endpoint with rate limiting
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return ApiResponse.success(res, result, 'Login successful. Welcome to Smart Mart Pro!');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Authenticated user info
   */
  async getMe(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user._id);
      return ApiResponse.success(res, { user: profile }, 'User profile fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Informs the client to clear stored tokens
   */
  async logout(req, res, next) {
    try {
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/auth/profile
   * Self profile update
   */
  async updateProfile(req, res, next) {
    try {
      const { name, phone, currentPassword, newPassword } = req.body;
      const updatedUser = await authService.updateProfile(req.user._id, {
        name,
        phone,
        currentPassword,
        newPassword
      });
      return ApiResponse.success(res, { user: updatedUser }, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
