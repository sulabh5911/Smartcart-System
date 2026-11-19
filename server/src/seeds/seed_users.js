import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

export async function createInitialAdmin() {
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD before bootstrapping.'
    );
  }

  if (password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must be at least 12 characters long.');
  }

  if (await User.exists({})) {
    throw new Error('Users already exist. Create staff through the authenticated Users API.');
  }

  const admin = await User.create({
    name,
    email,
    password,
    role: 'admin',
    isActive: true
  });

  console.log(`Initial administrator created for ${email}.`);
  return admin;
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed_users.js')) {
  (async () => {
    try {
      await connectDB();
      await createInitialAdmin();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Failed to create initial administrator:', err.message);
      await disconnectDB();
      process.exit(1);
    }
  })();
}
