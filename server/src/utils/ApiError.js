/**
 * Custom API Error Class
 * JavaScript ke Error object ko extend karta hai taaki hum HTTP status code,
 * validation error arrays, aur operational flag attach kar sakein.
 */
export class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
    super(message);
    this.success = false;
    this.statusCode = statusCode;
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.isOperational = true; // Expected operational error vs unknown code bug

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Pre-configured helper factory methods
  static badRequest(message = 'Invalid request data', errors = []) {
    return new ApiError(400, message, errors);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static unauthorized(message = 'Authentication required / Invalid credentials', errors = []) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'Access Denied: You do not have permission for this resource', errors = []) {
    return new ApiError(403, message, errors);
  }

  static conflict(message = 'Resource already exists / Duplicate entry') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', errors = []) {
    return new ApiError(429, message, errors);
  }

  static internal(message = 'Internal server error occurred') {
    return new ApiError(500, message);
  }
}

