
import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

// Allowed frontend URLs
const allowedOrigins = [
  'http://localhost:5173',
  'https://smartcart-system.vercel.app',
  'https://smartcart-system-qnzld7p9e-sulabh5911s-projects.vercel.app'
];

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Built-in body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Custom request logger
app.use(requestLogger);

// Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Smart Mart Pro Supermarket REST API',
    version: config.apiVersion,
    environment: config.nodeEnv,
    documentation: 'See Postman collection in guide or test endpoints under /api'
  });
});

// API routes
app.use('/api', apiRouter);

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

export default app;
