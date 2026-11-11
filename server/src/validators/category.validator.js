import { ApiError } from '../utils/ApiError.js';

/**
 * Category Creation Request Validator Middleware
 * Request body me aane wale data ki rules check karta hai.
 */
export const validateCreateCategory = (req, res, next) => {
  const { name, description, color } = req.body;
  const errors = [];

  // 1. Name is required and must be non-empty string
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Category "name" is required and cannot be empty.');
  } else if (name.trim().length < 2 || name.trim().length > 50) {
    errors.push('Category "name" must be between 2 and 50 characters long.');
  }

  // 2. Description length check (optional field)
  if (description && (typeof description !== 'string' || description.length > 200)) {
    errors.push('Category "description" must not exceed 200 characters.');
  }

  // 3. Hex color format check (optional field)
  if (color && !/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    errors.push('Category "color" must be a valid hex color code (e.g. #3b82f6).');
  }

  // If validation fails, abort request immediately with 400 Bad Request
  if (errors.length > 0) {
    return next(ApiError.badRequest('Category validation failed', errors));
  }

  next();
};
