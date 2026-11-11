import mongoose from 'mongoose';
import { StockMovement } from '../models/StockMovement.js';

/**
 * StockMovement Repository
 * Handles queries and persistent storage of all stock audits and transitions.
 */
export class StockMovementRepository {
  async create(movementData) {
    return await StockMovement.create(movementData);
  }

  async findAll({
    page = 1,
    limit = 20,
    productId = null,
    movementType = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      filter.product = new mongoose.Types.ObjectId(productId);
    }
    if (movementType && movementType.trim() !== '') {
      filter.movementType = movementType.trim();
    }

    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const total = await StockMovement.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum) || 1;

    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku unit sellingPrice')
      .populate('batch', 'batchNumber expiryDate purchasePrice')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return {
      movements,
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
}

export const stockMovementRepository = new StockMovementRepository();
