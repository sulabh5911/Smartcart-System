import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

/**
 * Server Startup Routine
 * 1. Establish connection with MongoDB
 * 2. Start HTTP server listener
 */
async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start listening on configured port
    const server = app.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`🛒 Smart Mart Pro REST API Server Online!`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`🩺 Health: http://localhost:${config.port}/api/health`);
      console.log(`📂 Categories: http://localhost:${config.port}/api/categories`);
      console.log(`📦 Products: http://localhost:${config.port}/api/products`);
      console.log(`🏷️ Batches: http://localhost:${config.port}/api/batches/expiring`);
      console.log(`===============================================`);
    });

    // Graceful Shutdown handlers
    const handleShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down server gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

startServer();
