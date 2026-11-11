import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate a signed JSON Web Token (JWT)
 * @param {Object} payload - User identification and role data: { id, role, email, name }
 * @param {string|number} expiresIn - Expiration string (e.g., '24h', '7d')
 * @returns {string} - Cryptographically signed JWT token string
 */
export function generateToken(payload, expiresIn = config.jwtExpiresIn) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn
  });
}

/**
 * Verify and decode a JSON Web Token
 * @param {string} token - JWT token string from Authorization header
 * @returns {Object} - Decoded payload { id, role, email, name, iat, exp }
 * @throws {Error} - JsonWebTokenError, TokenExpiredError
 */
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
