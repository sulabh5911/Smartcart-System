import { SaleReturn } from '../models/SaleReturn.js';

export class ReturnRepository {
  async generateNextReturnNumber() {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RET-${todayStr}-`;
    const count = await SaleReturn.countDocuments({
      returnNumber: { $regex: `^${prefix}` }
    });
    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  async findByIdempotencyKey(key) {
    if (!key) return null;
    return await SaleReturn.findOne({ idempotencyKey: key.trim() }).lean();
  }

  async findAll({ search = '', limit = 50 } = {}) {
    const filter = {};
    if (search && search.trim() !== '') {
      const q = search.trim();
      filter.$or = [
        { returnNumber: { $regex: q, $options: 'i' } },
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } }
      ];
    }
    return await SaleReturn.find(filter)
      .populate('sale', 'invoiceNumber paymentMethod totalAmount createdAt')
      .populate('customer', 'name phone email loyaltyPoints')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async findById(id) {
    return await SaleReturn.findById(id)
      .populate('sale')
      .populate('customer')
      .populate('items.product', 'name sku unit sellingPrice')
      .lean();
  }

  async findBySaleId(saleId) {
    return await SaleReturn.find({ sale: saleId }).sort({ createdAt: -1 }).lean();
  }

  async create(returnData) {
    return await SaleReturn.create(returnData);
  }
}

export const returnRepository = new ReturnRepository();
