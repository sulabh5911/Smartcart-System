import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

/**
 * Centralized Error Handling Middleware
 * Puri application me jo bhi error throw hoga ya next(err) se aayega,
 * wo sab yahan centralized handle hoga.
 * 
 * Rules:
 * 1. Must take 4 arguments: (err, req, res, next)
 * 2. Returns structured, consistent JSON
 * 3. Never leaks internal server stack traces to users in production
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Agar error ApiError ka instance nahi hai (e.g. standard SyntaxError ya TypeError)
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, [error.message], err.stack);
  }

  const responsePayload = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors && error.errors.length > 0 ? error.errors : [error.message],
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  };

  return res.status(error.statusCode).json(responsePayload);
};
