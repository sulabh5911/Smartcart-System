import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

export async function seedStaffUsers() {
  console.log('👤 Seeding / Updating Staff Users for RBAC testing...');

  const staffMembers = [
    {
      name: 'Supermarket Admin',
      email: 'admin@smartmartpro.com',
      password: 'AdminPassword123!',
      role: 'admin',
      phone: '+91 98765 00001',
      isActive: true
    },
    {
      name: 'Ramesh Verma (Store Manager)',
      email: 'manager@smartmartpro.com',
      password: 'ManagerPassword123!',
      role: 'manager',
      phone: '+91 98765 00002',
      isActive: true
    },
    {
      name: 'Pooja Sharma (Head Cashier)',
      email: 'cashier@smartmartpro.com',
      password: 'CashierPassword123!',
      role: 'cashier',
      phone: '+91 98765 00003',
      isActive: true
    }
  ];

  for (const staff of staffMembers) {
    let existingUser = await User.findOne({ email: staff.email });
    if (!existingUser) {
      await User.create(staff);
      console.log(`  ➕ Created ${staff.role.toUpperCase()}: ${staff.email}`);
    } else {
      existingUser.name = staff.name;
      existingUser.role = staff.role;
      existingUser.phone = staff.phone;
      existingUser.isActive = true;
      existingUser.password = staff.password; // pre-save will re-hash
      existingUser.failedLoginAttempts = 0;
      existingUser.lockUntil = null;
      await existingUser.save();
      console.log(`  🔄 Updated ${staff.role.toUpperCase()}: ${staff.email}`);
    }
  }

  console.log('✅ Staff users ready.');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed_users.js')) {
  (async () => {
    try {
      await connectDB();
      await seedStaffUsers();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Failed to seed users:', err);
      process.exit(1);
    }
  })();
}
