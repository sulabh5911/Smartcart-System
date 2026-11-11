import mongoose from 'mongoose';

/**
 * Customer Schema
 * Stores registered shoppers and loyalty members in the supermarket.
 */
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: '---',
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '---'
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    tier: {
      type: String,
      enum: ['General', 'Silver', 'Gold', 'Platinum'],
      default: 'General'
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

export const Customer = mongoose.model('Customer', customerSchema);
