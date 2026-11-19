import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Dedicated MongoDB Connection Handler
 * Mongoose ke through MongoDB database se connect karta hai.
 * Connection events ko listen karta hai aur graceful disconnect support karta hai.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000 // 5 seconds me timeout agar server unreachable ho
    });

    console.log(`===============================================`);
    console.log(`🍃 MongoDB Connected Successfully!`);
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`🗄️ Database: ${conn.connection.name}`);
    console.log(`===============================================`);

    // Connection Events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`⚠️ MongoDB disconnected.`);
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed!`);
    console.error(`Reason: ${error.message}`);
    console.error(`\n💡 Troubleshooting Tips:`);
    console.error(`1. Check if MongoDB service is running in Windows: Get-Service -Name MongoDB`);
    console.error('2. Check that MONGODB_URI in server/.env starts with mongodb:// or mongodb+srv:// and contains no extra key text.');
    console.error(`3. Default port is 27017.\n`);
    
    // In production we usually exit the process if DB connection fails
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Cleanly close connection on shutdown
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🍃 MongoDB connection closed through app termination.');
  } catch (error) {
    console.error(`Error closing MongoDB: ${error.message}`);
  }
};
