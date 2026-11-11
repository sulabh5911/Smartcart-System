import dotenv from 'dotenv';

dotenv.config();

/**
 * Application Environment Configuration
 */
export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartmart_pro',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'smartmart_pro_supermarket_jwt_secret_key_2026_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  apiVersion: 'v1.0.0'
};

