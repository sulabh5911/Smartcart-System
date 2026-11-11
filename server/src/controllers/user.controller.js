import { userService } from '../services/user.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export class UserController {
  /**
   * GET /api/users
   */
  async getAllUsers(req, res, next) {
    try {
      const result = await userService.getAllUsers(req.query);
      return ApiResponse.success(res, result.users, 'Staff users retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return ApiResponse.success(res, { user }, 'Staff user retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users
   */
  async createUser(req, res, next) {
    try {
      const newUser = await userService.createUser(req.body);
      return ApiResponse.created(res, { user: newUser }, 'New staff user created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const updatedUser = await userService.updateUser(req.params.id, req.body);
      return ApiResponse.success(res, { user: updatedUser }, 'Staff user updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const updatedUser = await userService.toggleUserStatus(req.params.id, isActive);
      return ApiResponse.success(
        res,
        { user: updatedUser },
        `Staff user ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/:id/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { newPassword } = req.body;
      const result = await userService.resetPassword(req.params.id, newPassword);
      return ApiResponse.success(res, result, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
