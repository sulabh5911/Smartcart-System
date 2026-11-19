import mongoose from 'mongoose';

/**
 * Sale Schema (Invoice / Bill Record)
 * Authoritative record of a point-of-sale transaction in Smart Mart Pro.
 * Preserves exact server-computed prices, taxes, and FEFO batch deductions.
 */
const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
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
    customerPhone: {
      type: String,
      default: '---',
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
        unit: {
          type: String,
          default: 'piece'
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        itemTotal: {
          type: Number,
          required: true,
          min: 0
        },
        returnedQuantity: {
          type: Number,
          default: 0,
          min: 0
        },
        refundedAmount: {
          type: Number,
          default: 0,
          min: 0
        },
        // Audit trail of FEFO batches depleted for this item
        itemCost: {
          type: Number,
          default: 0,
          min: 0
        },
        batchesDeducted: [
          {
            batchId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Batch'
            },
            batchNumber: String,
            expiryDate: Date,
            quantityDeducted: Number,
            purchasePrice: Number
          }
        ]
      }
    ],
    itemsCount: {
      type: Number,
      required: true,
      default: 0
    },
    cogs: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxableAmount: {
      type: Number,
      required: true,
      min: 0
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalRefunded: {
      type: Number,
      default: 0,
      min: 0
    },
    returnStatus: {
      type: String,
      enum: ['None', 'Partial', 'Full'],
      default: 'None',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card'],
      required: [true, 'Payment method is required']
    },
    cashier: {
      type: String,
      default: 'Admin',
      trim: true
    },
    status: {
      type: String,
      enum: ['Completed', 'Refunded', 'Cancelled'],
      default: 'Completed',
      index: true
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

// Compound index for date and status filtering
saleSchema.index({ createdAt: -1, status: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
