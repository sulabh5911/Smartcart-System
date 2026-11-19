import mongoose from 'mongoose';

/**
 * Purchase Schema (Inward Stock Receipt / PO)
 * Records official procurement orders and stock inward batches from suppliers.
 */
const purchaseSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'Purchase order number is required'],
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
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required'],
      index: true
    },
    supplierName: {
      type: String,
      required: true,
      trim: true
    },
    invoiceReference: {
      type: String,
      trim: true,
      default: '' // Supplier invoice number (e.g. SUP-INV-2026-99)
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
        batchNumber: {
          type: String,
          required: [true, 'Batch number is required for receiving stock'],
          trim: true
        },
        expiryDate: {
          type: Date,
          required: [true, 'Expiry date is required for stock batch']
        },
        purchasePrice: {
          type: Number,
          required: true,
          min: 0
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        lineTotal: {
          type: Number,
          required: true,
          min: 0
        },
        batch: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch'
        }
      }
    ],
    itemsCount: {
      type: Number,
      required: true,
      default: 0
    },
    totalQuantity: {
      type: Number,
      required: true,
      default: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0
    },
    receivingStatus: {
      type: String,
      enum: ['Received', 'Partial', 'Cancelled'],
      default: 'Received',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Partial'],
      default: 'Paid'
    },
    receivedBy: {
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

// Index for date and status queries
purchaseSchema.index({ createdAt: -1, receivingStatus: 1 });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
