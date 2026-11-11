import mongoose from 'mongoose';

/**
 * SaleReturn Schema
 * Official audit record for full and partial customer returns and refunds.
 * Tracks inspected product condition and whether healthy inventory was restocked.
 */
const saleReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: [true, 'Return number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      index: true
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: [true, 'Original sale reference is required'],
      index: true
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      uppercase: true,
      trim: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        name: {
          type: String,
          required: true
        },
        sku: {
          type: String,
          required: true
        },
        originalQuantity: {
          type: Number,
          required: true,
          min: 1
        },
        alreadyReturnedQuantity: {
          type: Number,
          default: 0,
          min: 0
        },
        returnQuantity: {
          type: Number,
          required: true,
          min: 1
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0
        },
        lineRefund: {
          type: Number,
          required: true,
          min: 0
        },
        batch: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch'
        },
        batchNumber: {
          type: String,
          default: '---'
        },
        condition: {
          type: String,
          enum: ['Resellable', 'Damaged', 'Expired', 'Quarantined'],
          required: true,
          default: 'Resellable'
        },
        restocked: {
          type: Boolean,
          default: false // Only true if condition is 'Resellable' AND batch is not expired!
        },
        reason: {
          type: String,
          default: 'Customer return',
          trim: true
        }
      }
    ],
    totalReturnedQty: {
      type: Number,
      required: true,
      min: 1
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },
    refundMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Store Credit'],
      default: 'Cash',
      required: true
    },
    status: {
      type: String,
      enum: ['Completed', 'Cancelled'],
      default: 'Completed',
      index: true
    },
    processedBy: {
      type: String,
      default: 'Admin',
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

saleReturnSchema.index({ createdAt: -1 });

export const SaleReturn = mongoose.model('SaleReturn', saleReturnSchema);
