import { Purchase } from '../models/Purchase.js';

export class PurchaseRepository {
  async generateNextPONumber() {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${todayStr}-`;
    const count = await Purchase.countDocuments({
      poNumber: { $regex: `^${prefix}` }
    });
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  async findByIdempotencyKey(key) {
    if (!key) return null;
    return await Purchase.findOne({ idempotencyKey: key.trim() }).lean();
  }

  async findAll({ search = '', limit = 50 } = {}) {
    const filter = {};
    if (search && search.trim() !== '') {
      const q = search.trim();
      filter.$or = [
        { poNumber: { $regex: q, $options: 'i' } },
        { supplierName: { $regex: q, $options: 'i' } },
        { invoiceReference: { $regex: q, $options: 'i' } }
      ];
    }
    return await Purchase.find(filter)
      .populate('supplier', 'companyName phone email gstin')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async findById(id) {
    return await Purchase.findById(id)
      .populate('supplier', 'companyName phone email gstin address paymentTerms')
      .populate('items.product', 'name sku unit sellingPrice category')
      .lean();
  }

  async create(purchaseData) {
    return await Purchase.create(purchaseData);
  }
}

export const purchaseRepository = new PurchaseRepository();
