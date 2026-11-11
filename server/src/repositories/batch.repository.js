import mongoose from 'mongoose';
import { Batch } from '../models/Batch.js';

/**
 * Batch Repository
 * Handles database operations for product inventory batches.
 */
export class BatchRepository {
  async create(batchData) {
    return await Batch.create(batchData);
  }

  async findByProduct(productId) {
    return await Batch.find({ product: productId })
      .sort({ expiryDate: 1 })
      .populate('product', 'name sku unit sellingPrice');
  }

  async findExpiringSoon(options = {}) {
    const { days = 30, status = '', search = '' } = typeof options === 'number' ? { days: options } : options;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = {};
    if (days !== 'all' && !isNaN(parseInt(days, 10))) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + parseInt(days, 10));
      futureDate.setHours(23, 59, 59, 999);
      filter.expiryDate = { $lte: futureDate };
    }

    const batches = await Batch.find(filter)
      .sort({ expiryDate: 1 })
      .populate({
        path: 'product',
        select: 'name sku unit sellingPrice category isArchived',
        populate: { path: 'category', select: 'name color slug' }
      })
      .lean();

    // Enrich with dynamic daysLeft and compute authoritative expiry alert tier
    const enriched = batches
      .filter((b) => b.product && !b.product.isArchived)
      .map((b) => {
        const expDate = new Date(b.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let computedStatus = 'Normal';
        let alertTier = 'Normal';
        let daysColor = 'bg-emerald-100 text-emerald-700';
        let statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';

        if (daysLeft <= 0) {
          computedStatus = 'Expired';
          alertTier = 'Expired';
          daysColor = 'bg-red-200 text-red-900';
          statusColor = 'bg-red-100 text-red-800 border border-red-300';
        } else if (daysLeft <= 7) {
          computedStatus = 'Urgent';
          alertTier = 'Urgent Warning';
          daysColor = 'bg-rose-100 text-rose-700';
          statusColor = 'bg-rose-50 text-rose-600 border border-rose-200';
        } else if (daysLeft <= 15) {
          computedStatus = 'Red Warning';
          alertTier = 'Red Warning';
          daysColor = 'bg-orange-100 text-orange-800';
          statusColor = 'bg-orange-50 text-orange-700 border border-orange-200';
        } else if (daysLeft <= 30) {
          computedStatus = 'Warning';
          alertTier = 'Warning';
          daysColor = 'bg-amber-100 text-amber-700';
          statusColor = 'bg-amber-50 text-amber-600 border border-amber-200';
        }

        return {
          ...b,
          daysLeft,
          status: computedStatus,
          alertTier,
          daysColor,
          statusColor,
          isSaleBlocked: daysLeft <= 0
        };
      });

    // Filter by status if specified
    if (status && status.trim() !== '') {
      return enriched.filter((b) => b.status.toLowerCase() === status.trim().toLowerCase());
    }

    // Filter by search query if specified
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      return enriched.filter(
        (b) =>
          b.product?.name?.toLowerCase().includes(q) ||
          b.product?.sku?.toLowerCase().includes(q) ||
          b.batchNumber?.toLowerCase().includes(q)
      );
    }

    return enriched;
  }

  async update(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Batch.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  async delete(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Batch.findByIdAndDelete(id);
  }
}

export const batchRepository = new BatchRepository();
