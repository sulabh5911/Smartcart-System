import mongoose from 'mongoose';

/**
 * Batch Schema
 * Supermarket Inventory Batches
 * Stores batch number, product reference, expiry date, purchase price and available quantity.
 */
const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required (e.g. B001)'],
      uppercase: true,
      trim: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required for every inventory batch'],
      index: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
      index: true
    },
    supplierName: {
      type: String,
      trim: true,
      default: ''
    },
    mfgDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is strictly required for shelf-life management'],
      index: true
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Wholesale purchase / cost price is required'],
      min: [0, 'Purchase price cannot be negative']
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity in stock is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer'
      },
      default: 0
    },
    status: {
      type: String,
      enum: ['Normal', 'Warning', 'Red Warning', 'Urgent', 'Expired'],
      default: 'Normal'
    }
  },
  {
    timestamps: true
  }
);

// Compound Unique Index: Same product cannot have duplicate batch numbers
batchSchema.index({ product: 1, batchNumber: 1 }, { unique: true });

// Pre-save hook: Automatically compute status based on days left until expiry
// Expiry rules:
// - <= 0 days: Expired (sales blocked)
// - 1-7 days: Urgent warning
// - 8-15 days: Red warning
// - 16-30 days: Warning
// - > 30 days: Normal
batchSchema.pre('save', function () {
  if (this.expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(this.expiryDate);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      this.status = 'Expired';
    } else if (diffDays <= 7) {
      this.status = 'Urgent';
    } else if (diffDays <= 15) {
      this.status = 'Red Warning';
    } else if (diffDays <= 30) {
      this.status = 'Warning';
    } else {
      this.status = 'Normal';
    }
  }
});

export const Batch = mongoose.model('Batch', batchSchema);
