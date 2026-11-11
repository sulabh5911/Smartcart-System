import mongoose from 'mongoose';

/**
 * Category Schema
 * Represents supermarket departments (Dairy, Snacks, Grocery, Beverages, etc.)
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
      index: true
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: ''
    },
    color: {
      type: String,
      default: '#3b82f6',
      match: [/^#([0-9A-F]{3}){1,2}$/i, 'Please provide a valid hex color code']
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to generate URL-safe slug if not provided
categorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
});

export const Category = mongoose.model('Category', categorySchema);
