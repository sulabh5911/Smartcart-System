import mongoose from 'mongoose';

/**
 * Supplier Schema
 * FMCG Distributors, Manufacturers and Vendors
 */
const supplierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Supplier company name is required'],
      trim: true,
      index: true
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '---'
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: 'General FMCG'
    },
    paymentTerms: {
      type: String,
      enum: ['Immediate', 'Net 15', 'Net 30', 'Net 45', 'Cash on Delivery'],
      default: 'Immediate'
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPurchases: {
      type: Number,
      default: 0,
      min: 0
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Supplier = mongoose.model('Supplier', supplierSchema);
