
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || 'System Admin';

    // Validate environment variables
    if (!email || !password) {
      throw new Error('Admin email or password is missing');
    }

    if (password.length < 12) {
      throw new Error('Password must contain at least 12 characters');
    }

    // Check whether this email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error('This email is already registered. Use another email.');
    }

    // Create new Admin
    await User.create({
      name,
      email,
      password,
      role: 'admin',
      isActive: true
    });

    console.log('New Admin created successfully!');
    console.log('Admin Email:', email);

  } catch (error) {
    console.error('Admin creation failed:', error.message);
    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
