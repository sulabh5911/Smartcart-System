import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

/**
 * Health Check Controller
 * System diagnostic endpoint for ping, uptime, and server health.
 */
export const getHealth = asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    project: 'Smart Mart Pro Supermarket API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    nodeVersion: process.version,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  };

  return ApiResponse.success(res, healthData, 'Smart Mart Pro server is healthy and operational 🚀');
});
