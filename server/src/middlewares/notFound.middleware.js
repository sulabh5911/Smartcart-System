import { ApiError } from '../utils/ApiError.js';

/**
 * 404 Route Not Found Middleware
 * Jab koi client aise route par hit karta hai jo server me defined nahi hai.
 */
export const notFoundHandler = (req, res, next) => {
  next(
    ApiError.notFound(
      `Route '${req.method} ${req.originalUrl}' does not exist on this server.`
    )
  );
};
