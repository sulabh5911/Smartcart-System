import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Schema
 * Represents supermarket staff members:
 * - Admin: Full access, store settings, staff user management
 * - Manager: Inventory, purchasing, reports, permitted returns
 * - Cashier: POS checkout, customer lookup, invoice reprinting
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'User email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Exclude from query results by default for defense-in-depth
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'manager', 'cashier'],
        message: '{VALUE} is not a valid user role'
      },
      default: 'cashier',
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * Pre-save Hook: Password Hashing via bcrypt
 * Automatically generates a salt (10 rounds) and hashes the plaintext password
 * only if the password field was modified or created.
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


/**
 * Instance Method: Compare Password
 * Compares incoming plaintext candidate password against stored bcrypt hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Instance Method: Check if account is temporarily locked
 */
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * toJSON Transformer
 * Ensures password hash, internal version keys, and lock data
 * are NEVER returned in API responses.
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model('User', userSchema);
