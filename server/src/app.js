import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { requestLogger } from './middlewares/logger.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

// 1. Global Middlewares
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Built-in body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Custom request logger
app.use(requestLogger);

// 2. Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Smart Mart Pro Supermarket REST API',
    version: config.apiVersion,
    environment: config.nodeEnv,
    documentation: 'See Postman collection in guide or test endpoints under /api'
  });
});

// 3. API Sub-router mounting
app.use('/api', apiRouter);

// 4. 404 Route Not Found Handler
app.use(notFoundHandler);

// 5. Centralized Error Handler (Must be last middleware)
app.use(errorHandler);

export default app;
