import mongoose from 'mongoose';

/**
 * Product Schema
 * Supermarket Master Catalog Item
 * Stores common details: name, SKU, category reference, unit, and selling price.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [100, 'Product name cannot exceed 100 characters'],
      index: true
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-_]{3,20}$/, 'SKU must be 3-20 uppercase alphanumeric characters or hyphens'],
      index: true
    },
    barcode: {
      type: String,
      trim: true,
      validate: {
        validator: (value) => value == null || /^[\x20-\x7E]{1,64}$/.test(value),
        message: 'Barcode must contain 1-64 printable ASCII characters.'
      }
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category reference is required'],
      index: true
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      enum: {
        values: ['packet', 'pack', 'kg', 'g', 'can', 'bottle', 'bar', 'tube', 'bag', 'piece', 'loaf'],
        message: '{VALUE} is not a valid measurement unit'
      },
      default: 'packet'
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price (MRP) is required'],
      min: [0.01, 'Selling price must be greater than 0']
    },
    minStockAlert: {
      type: Number,
      default: 20,
      min: [0, 'Minimum stock alert cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Archived'],
      default: 'In Stock'
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound Text Index for fast catalog searches by name & SKU
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index(
  { barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string', $gt: '' } } }
);

export const Product = mongoose.model('Product', productSchema);
