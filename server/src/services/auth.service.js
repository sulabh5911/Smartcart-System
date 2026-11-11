import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateToken } from '../utils/jwt.js';

export class AuthService {
  /**
   * Authenticate staff user with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login(email, password) {
    if (!email || !password) {
      throw ApiError.badRequest('Please provide both email and password.');
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query user and explicitly select hidden password field
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    // Generic safe error message to prevent account enumeration
    const invalidCredentialsMsg = 'Invalid email address or password.';

    if (!user) {
      throw ApiError.unauthorized(invalidCredentialsMsg);
    }

    // Check if account is temporarily locked due to repeated failures
    if (user.isLocked()) {
      const waitMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      throw ApiError.tooManyRequests(
        `Account temporarily locked due to excessive failed attempts. Please retry in ${waitMinutes} minute(s).`
      );
    }

    // Check if account is deactivated
    if (!user.isActive) {
      throw ApiError.forbidden(
        'This staff account has been deactivated. Please contact the store administrator.'
      );
    }

    // Verify password hash
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 consecutive failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await user.save();
      throw ApiError.unauthorized(invalidCredentialsMsg);
    }

    // Successful login: reset failure counter and update lastLogin
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate signed JWT
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name
    });

    return {
      user: user.toJSON(),
      token
    };
  }

  /**
   * Get authenticated user profile
   * @param {string} userId
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found.');
    }
    return user.toJSON();
  }

  /**
   * Update own profile
   * @param {string} userId
   * @param {Object} updateData
   */
  async updateProfile(userId, { name, phone, currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();

    if (newPassword) {
      if (!currentPassword) {
        throw ApiError.badRequest('Current password is required to set a new password.');
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw ApiError.unauthorized('Current password does not match.');
      }
      if (newPassword.length < 6) {
        throw ApiError.badRequest('New password must be at least 6 characters long.');
      }
      user.password = newPassword; // Will be hashed by pre-save hook
    }

    await user.save();
    return user.toJSON();
  }
}

export const authService = new AuthService();
