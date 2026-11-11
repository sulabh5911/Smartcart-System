import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export class UserService {
  /**
   * Get all users with search, role filter, active status and pagination
   */
  async getAllUsers(query = {}) {
    const { search, role, isActive, page = 1, limit = 20 } = query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && ['admin', 'manager', 'cashier'].includes(role)) {
      filter.role = role;
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take),
      User.countDocuments(filter)
    ]);

    return {
      users: users.map((u) => u.toJSON()),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take)
      }
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff user not found.');
    }
    return user.toJSON();
  }

  /**
   * Create a new staff user (Admin only)
   */
  async createUser(data) {
    const { name, email, password, role, phone } = data;

    if (!name || !email || !password) {
      throw ApiError.badRequest('Name, email, and initial password are required.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      throw ApiError.conflict('A user with this email address already exists.');
    }

    if (password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters long.');
    }

    const validRoles = ['admin', 'manager', 'cashier'];
    const assignedRole = validRoles.includes(role) ? role : 'cashier';

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password, // Pre-save hook will hash this via bcrypt
      role: assignedRole,
      phone: phone ? phone.trim() : '',
      isActive: true
    });

    return user.toJSON();
  }

  /**
   * Update staff user details (Admin only)
   */
  async updateUser(id, data) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff user not found.');
    }

    if (data.name) user.name = data.name.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    if (data.role && ['admin', 'manager', 'cashier'].includes(data.role)) {
      user.role = data.role;
    }
    if (data.isActive !== undefined) {
      user.isActive = Boolean(data.isActive);
    }

    if (data.email) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (cleanEmail !== user.email) {
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
          throw ApiError.conflict('Another user already exists with this email address.');
        }
        user.email = cleanEmail;
      }
    }

    await user.save();
    return user.toJSON();
  }

  /**
   * Toggle staff user active status (deactivate / reactivate)
   */
  async toggleUserStatus(id, isActive) {
    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff user not found.');
    }

    user.isActive = Boolean(isActive);
    await user.save();
    return user.toJSON();
  }

  /**
   * Admin password reset for a staff user
   */
  async resetPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters long.');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound('Staff user not found.');
    }

    user.password = newPassword; // Pre-save hook will re-hash
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    return { message: 'Password has been successfully reset.' };
  }
}

export const userService = new UserService();
