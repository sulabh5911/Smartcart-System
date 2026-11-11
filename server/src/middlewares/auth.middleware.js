import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

/**
 * Authentication Middleware
 * Validates the JWT Bearer token from the HTTP Authorization header.
 * Attaches the authenticated staff user document to `req.user`.
 * 
 * Flow:
 * 1. Checks for Authorization header (Bearer <token>)
 * 2. Cryptographically verifies JWT signature and expiration
 * 3. Verifies that the user still exists in MongoDB
 * 4. Verifies that the user account has not been deactivated
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(
        ApiError.unauthorized('Authentication required: Bearer token is missing or malformed.')
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next(
        ApiError.unauthorized('Authentication token is missing.')
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return next(
          ApiError.unauthorized('Authentication token has expired. Please log in again.')
        );
      }
      return next(
        ApiError.unauthorized('Invalid or tampered authentication token.')
      );
    }

    // Verify user exists in database and is active
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        ApiError.unauthorized('The user account associated with this session no longer exists.')
      );
    }

    if (!user.isActive) {
      return next(
        ApiError.forbidden('Your account has been deactivated. Please contact the store administrator.')
      );
    }

    // Attach user to request context (password hash is already excluded by toJSON/select)
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Role-Based Access Control (RBAC) Authorization Middleware
 * Higher-order middleware factory that checks if the authenticated user's role
 * is authorized to access the specific route.
 * 
 * @param {...string} allowedRoles - Allowed roles ('admin', 'manager', 'cashier')
 * @returns {Function} Express middleware function
 * 
 * Example:
 * router.get('/analytics', authenticate, authorize('admin', 'manager'), getAnalytics);
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        ApiError.unauthorized('Authentication required before checking permissions.')
      );
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access Denied: You do not have permission to perform this action. Required role(s): [${allowedRoles.join(
            ', '
          )}]. Your assigned role is '${req.user.role}'.`
        )
      );
    }

    next();
  };
}
