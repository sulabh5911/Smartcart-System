import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Batch } from '../models/Batch.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { Purchase } from '../models/Purchase.js';
import { StockMovement } from '../models/StockMovement.js';
import { stockMovementRepository } from '../repositories/stockMovement.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { supplierProvidesProduct } from '../utils/supplierRelations.js';

/**
 * Inventory Service
 * Authoritative Business Layer for Supermarket Stock Management
 * 
 * Guarantees:
 * 1. Batch quantities are always the single source of truth.
 * 2. Never permits negative stock levels.
 * 3. Logs every stock movement with reference, reason, and authorizer.
 * 4. Supports soft-delete archiving of products.
 */
export class InventoryService {
  /**
   * 1. Inventory Summary & Stock Valuation
   * Uses MongoDB Aggregation Pipeline for O(1) memory and high performance.
   */
  async getSummary() {
    // Pipeline 1: Aggregate Total Stock Units and Financial Valuation across all batches
    const batchAgg = await Batch.aggregate([
      {
        $group: {
          _id: null,
          totalUnits: { $sum: '$availableQuantity' },
          totalValuation: {
            $sum: { $multiply: ['$availableQuantity', '$purchasePrice'] }
          },
          urgentCount: {
            $sum: {
              $cond: [{ $in: ['$status', ['Urgent', 'Expired']] }, 1, 0]
            }
          }
        }
      }
    ]);

    const batchStats = batchAgg[0] || {
      totalUnits: 0,
      totalValuation: 0,
      urgentCount: 0
    };

    // Pipeline 2: Product Catalog Counts
    const totalProducts = await Product.countDocuments({ isArchived: { $ne: true } });
    const lowStockCount = await Product.countDocuments({
      isArchived: { $ne: true },
      status: 'Low Stock'
    });
    const outOfStockCount = await Product.countDocuments({
      isArchived: { $ne: true },
      status: 'Out of Stock'
    });
    const archivedCount = await Product.countDocuments({ isArchived: true });

    return {
      totalProducts,
      totalUnits: batchStats.totalUnits,
      totalValuation: Math.round(batchStats.totalValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
      urgentBatchesCount: batchStats.urgentCount,
      archivedProductsCount: archivedCount
    };
  }

  /**
   * 2. Paginated Batches List with dynamic search and category filtering
   */
  async getBatches({
    page = 1,
    limit = 10,
    search = '',
    category = '',
    productId = '',
    status = '',
    sortBy = 'expiryDate',
    sortOrder = 'asc'
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // 1. Build product match filter if searching or category filtering
    const productMatch = { isArchived: { $ne: true } };

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      productMatch._id = new mongoose.Types.ObjectId(productId);
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      productMatch.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ];
    }

    if (category && category.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(category.trim())) {
        productMatch.category = new mongoose.Types.ObjectId(category.trim());
      } else {
        const catDoc = await Category.findOne({
          name: { $regex: new RegExp(`^${category.trim()}$`, 'i') }
        });
        if (catDoc) {
          productMatch.category = catDoc._id;
        }
      }
    }

    // Matching product IDs
    const matchingProducts = await Product.find(productMatch).select('_id');
    const allowedProductIds = matchingProducts.map((p) => p._id);

    // 2. Build Batch query filter
    const batchFilter = { product: { $in: allowedProductIds } };

    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      batchFilter.product = new mongoose.Types.ObjectId(productId);
    }

    if (status && status.trim() !== '') {
      batchFilter.status = status.trim();
    }

    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const total = await Batch.countDocuments(batchFilter);
    const totalPages = Math.ceil(total / limitNum) || 1;

    const batches = await Batch.find(batchFilter)
      .populate('supplier', 'companyName')
      .populate({
        path: 'product',
        select: 'name sku barcode unit sellingPrice minStockAlert category',
        populate: { path: 'category', select: 'name color slug' }
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const batchesMissingSupplier = batches.filter(
      (batch) => !batch.supplier?.companyName && !batch.supplierName && batch.product
    );
    if (batchesMissingSupplier.length > 0) {
      const purchaseMatches = batchesMissingSupplier.flatMap((batch) => [
        { 'items.batch': batch._id },
        {
          items: {
            $elemMatch: {
              product: batch.product._id,
              batchNumber: batch.batchNumber
            }
          }
        }
      ]);
      const receipts = await Purchase.find({ $or: purchaseMatches })
        .select('supplier supplierName items.batch items.product items.batchNumber')
        .sort({ createdAt: -1 })
        .lean();
      const supplierIds = [...new Set(
        receipts.map((receipt) => receipt.supplier?.toString()).filter(Boolean)
      )];
      const suppliers = supplierIds.length
        ? await Supplier.find({ _id: { $in: supplierIds } }).select('_id companyName').lean()
        : [];
      const supplierNamesById = new Map(
        suppliers.map((supplier) => [supplier._id.toString(), supplier.companyName])
      );
      const batchesById = new Map(
        batchesMissingSupplier.map((batch) => [batch._id.toString(), batch])
      );
      const batchesByProductAndNumber = new Map(
        batchesMissingSupplier.map((batch) => [
          `${batch.product._id.toString()}|${batch.batchNumber.trim().toUpperCase()}`,
          batch
        ])
      );

      for (const receipt of receipts) {
        const supplierName =
          receipt.supplierName || supplierNamesById.get(receipt.supplier?.toString()) || '';
        if (!supplierName) continue;

        for (const item of receipt.items || []) {
          const batch =
            (item.batch && batchesById.get(item.batch.toString())) ||
            batchesByProductAndNumber.get(
              `${item.product?.toString()}|${item.batchNumber?.trim().toUpperCase()}`
            );
          if (batch && !batch.supplierName && !batch.supplier?.companyName) {
            batch.supplierName = supplierName;
          }
        }
      }
    }

    // Format days to expiry for clean UI display
    const enrichedBatches = batches.map((b) => {
      const today = new Date();
      const expDate = new Date(b.expiryDate);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      return {
        ...b,
        daysToExpiry: diffDays,
        valuation: Math.round(b.availableQuantity * b.purchasePrice * 100) / 100
      };
    });

    return {
      batches: enrichedBatches,
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

  /**
   * 3. Stock Receiving (Inward Goods Receipt)
   * Authoritative entry: increases batch stock and logs StockMovement
   */
  async receiveStock({
    productId,
    supplierId = null,
    batchNumber,
    purchasePrice,
    mfgDate,
    expiryDate,
    quantity,
    reference = 'N/A',
    reason = 'Purchase order inward receipt',
    performedBy = 'Admin'
  }) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${productId} not found`);
    }
    if (product.isArchived) {
      throw ApiError.badRequest('Cannot receive stock for an archived product. Please unarchive it first.');
    }

    let supplier = null;
    if (supplierId) {
      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        throw ApiError.badRequest('Invalid supplier ID format');
      }
      supplier = await Supplier.findById(supplierId);
      if (!supplier || supplier.status !== 'Active') {
        throw ApiError.badRequest('A valid active supplier is required for this stock receipt.');
      }
      if (!supplierProvidesProduct(supplier, product)) {
        throw ApiError.badRequest(`Product "${product.name}" is not linked to supplier "${supplier.companyName}".`);
      }
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw ApiError.badRequest('Received quantity must be a positive integer greater than 0');
    }

    const cleanBatchNo = (batchNumber || '').trim().toUpperCase();
    if (!cleanBatchNo) {
      throw ApiError.badRequest('Batch number is required (e.g. B101)');
    }

    const costPrice = Number(purchasePrice);
    if (
      purchasePrice == null ||
      (typeof purchasePrice === 'string' && purchasePrice.trim() === '') ||
      !Number.isFinite(costPrice) ||
      costPrice < 0
    ) {
      throw ApiError.badRequest('Purchase price must be a valid non-negative number');
    }

    const expDate = new Date(expiryDate);
    if (isNaN(expDate.getTime())) {
      throw ApiError.badRequest('Valid expiry date is required');
    }
    const expiryDay = new Date(expDate);
    expiryDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDay <= today) {
      throw ApiError.badRequest('Expiry date must be after today');
    }

    // Check if batch already exists for this product
    let batch = await Batch.findOne({ product: productId, batchNumber: cleanBatchNo });
    let previousStock = 0;
    let newStock = 0;

    if (batch) {
      if (
        supplier &&
        batch.supplier &&
        batch.supplier.toString() !== supplier._id.toString()
      ) {
        throw ApiError.conflict(
          `Batch ${cleanBatchNo} of "${product.name}" is already linked to a different supplier.`
        );
      }
      // Existing batch: increment stock
      previousStock = batch.availableQuantity;
      newStock = previousStock + qty;
      batch.availableQuantity = newStock;
      batch.purchasePrice = costPrice; // update cost price if new lot
      batch.expiryDate = expDate;
      if (supplier) {
        batch.supplier = supplier._id;
        batch.supplierName = supplier.companyName;
      } else if (batch.supplier) {
        throw ApiError.conflict(
          `Batch ${cleanBatchNo} of "${product.name}" is already linked to a supplier. Select that supplier to receive more stock.`
        );
      }
      if (mfgDate) batch.mfgDate = new Date(mfgDate);
      await batch.save();
    } else {
      // New batch creation
      previousStock = 0;
      newStock = qty;
      batch = new Batch({
        product: productId,
        supplier: supplier?._id || null,
        supplierName: supplier?.companyName || '',
        batchNumber: cleanBatchNo,
        purchasePrice: costPrice,
        mfgDate: mfgDate ? new Date(mfgDate) : new Date(),
        expiryDate: expDate,
        availableQuantity: qty
      });
      await batch.save();
    }

    // Recalculate total product stock across all its batches
    await this._updateProductStockStatus(productId);

    // Audit Log: Record Stock Movement
    const movement = await StockMovement.create({
      product: productId,
      batch: batch._id,
      movementType: 'RECEIPT',
      quantity: qty,
      previousStock,
      newStock,
      reason,
      reference,
      performedBy
    });

    const populatedBatch = await Batch.findById(batch._id).populate({
      path: 'product',
      select: 'name sku unit sellingPrice status'
    }).populate('supplier', 'companyName');

    return {
      batch: populatedBatch,
      movement
    };
  }

  /**
   * 4. Authorized Stock Adjustment (Damage, Discrepancy, Audit Correction)
   * GUARANTEE: Never permits negative stock.
   */
  async adjustStock({
    batchId,
    adjustmentType = 'SUBTRACT', // 'ADD', 'SUBTRACT', 'SET'
    quantity,
    reason,
    reference = 'N/A',
    performedBy = 'Admin'
  }) {
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      throw ApiError.badRequest('Invalid batch ID format');
    }

    if (!reason || reason.trim().length < 3) {
      throw ApiError.badRequest('A specific reason (min 3 chars) is mandatory for authorized stock adjustment');
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      throw ApiError.notFound(`Batch with ID ${batchId} not found`);
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw ApiError.badRequest('Quantity must be a positive integer');
    }

    const previousStock = batch.availableQuantity;
    let newStock = previousStock;
    let qtyChange = 0;
    let movementType = 'ADJUSTMENT_SUBTRACT';

    const normalizedType = adjustmentType.toUpperCase();

    if (normalizedType === 'ADD') {
      newStock = previousStock + qty;
      qtyChange = qty;
      movementType = 'ADJUSTMENT_ADD';
    } else if (normalizedType === 'SUBTRACT') {
      newStock = previousStock - qty;
      qtyChange = -qty;

      // Classify reason
      const lowerReason = reason.toLowerCase();
      if (lowerReason.includes('damage') || lowerReason.includes('spoil') || lowerReason.includes('expire')) {
        movementType = 'DAMAGE_WRITE_OFF';
      } else if (lowerReason.includes('theft') || lowerReason.includes('loss') || lowerReason.includes('missing')) {
        movementType = 'THEFT_LOSS';
      } else {
        movementType = 'ADJUSTMENT_SUBTRACT';
      }
    } else if (normalizedType === 'SET') {
      newStock = qty;
      qtyChange = newStock - previousStock;
      movementType = qtyChange >= 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUBTRACT';
    } else {
      throw ApiError.badRequest(`Invalid adjustment type "${adjustmentType}". Must be ADD, SUBTRACT, or SET`);
    }

    // STRICT INVENTORY INTEGRITY RULE: Never allow negative stock!
    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock! Batch "${batch.batchNumber}" only has ${previousStock} units available. Cannot reduce by ${qty}.`
      );
    }

    // Update batch stock
    batch.availableQuantity = newStock;
    await batch.save();

    // Recalculate parent product stock & status
    await this._updateProductStockStatus(batch.product);

    // Audit log
    const movement = await StockMovement.create({
      product: batch.product,
      batch: batch._id,
      movementType,
      quantity: qtyChange,
      previousStock,
      newStock,
      reason,
      reference,
      performedBy
    });

    const updatedBatch = await Batch.findById(batch._id).populate({
      path: 'product',
      select: 'name sku unit sellingPrice status'
    });

    return {
      batch: updatedBatch,
      movement
    };
  }

  /**
   * 5. Product Archiving (Soft-Delete) & Unarchiving
   */
  async archiveProduct(id, reason = 'Archived by inventory manager', performedBy = 'Admin') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    const archived = await productRepository.archive(id);

    // Record audit event
    await StockMovement.create({
      product: id,
      movementType: 'ARCHIVE',
      quantity: 0,
      previousStock: 0,
      newStock: 0,
      reason: `Product archived: ${reason}`,
      reference: 'ARCHIVE-ACTION',
      performedBy
    });

    return archived;
  }

  async unarchiveProduct(id, performedBy = 'Admin') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const unarchived = await productRepository.unarchive(id);
    if (!unarchived) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    // Record audit event
    await StockMovement.create({
      product: id,
      movementType: 'UNARCHIVE',
      quantity: 0,
      previousStock: 0,
      newStock: 0,
      reason: 'Product unarchived and restored to active catalog',
      reference: 'UNARCHIVE-ACTION',
      performedBy
    });

    return unarchived;
  }

  /**
   * 6. Audit Trail: Get Stock Movements
   */
  async getMovements(params) {
    return await stockMovementRepository.findAll(params);
  }

  /**
   * Internal Helper: Recalculates Product total stock & sets dynamic status
   */
  async _updateProductStockStatus(productId) {
    const batches = await Batch.find({ product: productId });
    const totalStock = batches.reduce((sum, b) => sum + b.availableQuantity, 0);

    const product = await Product.findById(productId);
    if (!product) return;

    let newStatus = 'In Stock';
    if (product.isArchived) {
      newStatus = 'Archived';
    } else if (totalStock <= 0) {
      newStatus = 'Out of Stock';
    } else if (totalStock <= (product.minStockAlert || 20)) {
      newStatus = 'Low Stock';
    }

    product.status = newStatus;
    await product.save();
  }
}

export const inventoryService = new InventoryService();
