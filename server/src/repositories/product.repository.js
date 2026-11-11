import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Batch } from '../models/Batch.js';
import { Category } from '../models/Category.js';

/**
 * MongoDB Mongoose Product Repository
 * Handles persistent querying, pagination, search, category filtering,
 * and batch-aggregated stock calculation.
 */
export class ProductRepository {
  async findAll({
    page = 1,
    limit = 10,
    search = '',
    category = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // 1. Build Query Filter
    const filter = {};

    // Text / Regex Search (name, SKU, or barcode)
    if (search && search.trim() !== '') {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { barcode: { $regex: q, $options: 'i' } }
      ];
    }

    // Category Filter (support category ObjectId or category name string)
    if (category && category.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(category.trim())) {
        filter.category = new mongoose.Types.ObjectId(category.trim());
      } else {
        const catDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${category.trim()}$`, 'i') }
        });
        if (catDoc) {
          filter.category = catDoc._id;
        } else {
          // If category name doesn't match any category, return empty result
          filter.category = new mongoose.Types.ObjectId();
        }
      }
    }

    // Stock Status Filter & Archive Filter
    if (status && status.trim() !== '') {
      if (status.trim() === 'Archived') {
        filter.isArchived = true;
      } else {
        filter.status = status.trim();
        filter.isArchived = { $ne: true };
      }
    } else {
      filter.isArchived = { $ne: true };
    }

    // 2. Sort Options
    const sort = {};
    const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    sort[sortBy] = order;

    // 3. Execute query with population & batch calculation
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Retrieve products with populated category
    const products = await Product.find(filter)
      .populate('category', 'name slug color')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Attach total quantity aggregated from batches for each product
    const productIds = products.map((p) => p._id);
    const batchTotals = await Batch.aggregate([
      { $match: { product: { $in: productIds } } },
      { $group: { _id: '$product', totalStock: { $sum: '$availableQuantity' } } }
    ]);

    const batchStockMap = new Map();
    batchTotals.forEach((b) => batchStockMap.set(b._id.toString(), b.totalStock));

    const enrichedProducts = products.map((prod) => {
      const stock = batchStockMap.get(prod._id.toString()) ?? 0;
      return {
        ...prod,
        stock,
        // Computed dynamic status based on live batch stock vs threshold
        status:
          stock <= 0
            ? 'Out of Stock'
            : stock <= prod.minStockAlert
            ? 'Low Stock'
            : 'In Stock'
      };
    });

    return {
      products: enrichedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    };
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const product = await Product.findById(id)
      .populate('category', 'name slug color')
      .lean();

    if (!product) return null;

    // Fetch all active batches for this product
    const batches = await Batch.find({ product: id }).sort({ expiryDate: 1 }).lean();
    const stock = batches.reduce((acc, b) => acc + b.availableQuantity, 0);

    return {
      ...product,
      stock,
      batches
    };
  }

  async findBySku(sku) {
    if (!sku) return null;
    return await Product.findOne({ sku: sku.trim().toUpperCase() });
  }

  async create(productData) {
    return await Product.create(productData);
  }

  async update(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('category', 'name slug color');
  }

  /**
   * Product Archive (Soft Delete) instead of destructive delete
   * Preserves historical sales and inventory movement audit logs
   */
  async archive(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Product.findByIdAndUpdate(
      id,
      { isArchived: true, status: 'Archived', archivedAt: new Date() },
      { new: true }
    ).populate('category', 'name slug color');
  }

  async unarchive(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const prod = await Product.findById(id);
    if (!prod) return null;

    // Recalculate status from remaining batch stock
    const batches = await Batch.find({ product: id });
    const stock = batches.reduce((acc, b) => acc + b.availableQuantity, 0);
    const status =
      stock <= 0
        ? 'Out of Stock'
        : stock <= prod.minStockAlert
        ? 'Low Stock'
        : 'In Stock';

    return await Product.findByIdAndUpdate(
      id,
      { isArchived: false, status, archivedAt: null },
      { new: true }
    ).populate('category', 'name slug color');
  }

  async delete(id) {
    // Soft-archive by default to maintain audit trail and prevent orphaned records
    return await this.archive(id);
  }
}

export const productRepository = new ProductRepository();
