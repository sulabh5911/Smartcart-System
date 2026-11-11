import mongoose from 'mongoose';

/**
 * StockMovement Schema
 * Complete Audit Trail for Inventory Movements
 * Every stock addition, adjustment, or sale is immutably logged here.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required for stock movement'],
      index: true
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true
    },
    movementType: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: [
        'RECEIPT',              // Stock receiving from supplier / PO
        'ADJUSTMENT_ADD',       // Inventory audit count addition
        'ADJUSTMENT_SUBTRACT',  // Inventory audit reduction
        'DAMAGE_WRITE_OFF',     // Spoiled, broken, or expired stock removed
        'THEFT_LOSS',           // Unaccounted discrepancy
        'SALE',                 // POS checkout reduction
        'RETURN',               // Customer return to inventory
        'ARCHIVE',              // Product soft-archived
        'UNARCHIVE'             // Product restored from archive
      ],
      index: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity changed is required'],
      validate: {
        validator: (v) => Number.isInteger(v),
        message: 'Quantity must be an integer'
      }
    },
    previousStock: {
      type: Number,
      required: [true, 'Previous stock level is required']
    },
    newStock: {
      type: Number,
      required: [true, 'New stock level is required'],
      min: [0, 'New stock cannot be negative']
    },
    reason: {
      type: String,
      required: [true, 'Reason for movement is required for audit compliance'],
      trim: true,
      maxlength: [250, 'Reason cannot exceed 250 characters']
    },
    reference: {
      type: String,
      trim: true,
      default: 'N/A' // e.g. PO-2026-101, ADJ-882, INV-0042
    },
    performedBy: {
      type: String,
      default: 'Admin',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast timeline queries on a specific product
stockMovementSchema.index({ product: 1, createdAt: -1 });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
