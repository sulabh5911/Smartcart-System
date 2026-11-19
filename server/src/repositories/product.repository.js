import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Batch } from '../models/Batch.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const batchTotals = await Batch.aggregate([
      { $match: { product: { $in: productIds } } },
      {
        $group: {
          _id: '$product',
          totalStock: { $sum: '$availableQuantity' },
          sellableStock: {
            $sum: {
              $cond: [{ $gt: ['$expiryDate', today] }, '$availableQuantity', 0]
            }
          }
        }
      }
    ]);

    const batchStockMap = new Map();
    batchTotals.forEach((b) =>
      batchStockMap.set(b._id.toString(), {
        stock: b.totalStock,
        sellableStock: b.sellableStock
      })
    );

    const enrichedProducts = products.map((prod) => {
      const { stock = 0, sellableStock = 0 } = batchStockMap.get(prod._id.toString()) || {};
      return {
        ...prod,
        stock,
        sellableStock,
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
      products: await this.attachSuppliers(enrichedProducts),
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sellableStock = batches.reduce(
      (acc, batch) => acc + (new Date(batch.expiryDate) > today ? batch.availableQuantity : 0),
      0
    );

    const [enrichedProduct] = await this.attachSuppliers([{
      ...product,
      stock,
      sellableStock,
      batches
    }]);

    return enrichedProduct;
  }

  async attachSuppliers(products) {
    if (!products.length) return products;

    const suppliers = await Supplier.find({
      products: { $in: products.map((product) => product._id) }
    })
      .select('companyName status products')
      .lean();
    const suppliersByProduct = new Map();
    for (const supplier of suppliers) {
      for (const productId of supplier.products) {
        const key = productId.toString();
        const linkedSuppliers = suppliersByProduct.get(key) || [];
        linkedSuppliers.push({
          _id: supplier._id,
          companyName: supplier.companyName,
          status: supplier.status
        });
        suppliersByProduct.set(key, linkedSuppliers);
      }
    }

    return products.map((product) => ({
      ...product,
      suppliers: suppliersByProduct.get(product._id.toString()) || []
    }));
  }

  async findByBarcode(barcode) {
    const product = await Product.findOne({
      barcode,
      isArchived: { $ne: true },
      status: { $ne: 'Archived' }
    })
      .populate('category', 'name slug color')
      .lean();

    if (!product) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const batches = await Batch.find({
      product: product._id,
      availableQuantity: { $gt: 0 },
      expiryDate: { $gt: today }
    })
      .select('batchNumber expiryDate availableQuantity')
      .sort({ expiryDate: 1, _id: 1 })
      .lean();
    const sellableStock = batches.reduce((total, batch) => total + batch.availableQuantity, 0);

    return {
      ...product,
      stock: sellableStock,
      sellableStock,
      availability: {
        status: sellableStock > 0 ? 'In Stock' : 'Out of Stock',
        sellableQuantity: sellableStock,
        batches: batches.map(({ batchNumber, expiryDate, availableQuantity }) => ({
          batchNumber,
          expiryDate,
          availableQuantity
        }))
      }
    };
  }

  async findBySku(sku) {
    if (!sku) return null;
    return await Product.findOne({ sku: sku.trim().toUpperCase() });
  }

  async findBarcodeCollision(barcode, excludeId = null) {
    if (!barcode) return null;
    const filter = { barcode };
    if (excludeId) filter._id = { $ne: excludeId };
    return await Product.findOne(filter);
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
