import { Sale } from '../models/Sale.js';

export class SaleRepository {
  async create(saleData) {
    return await Sale.create(saleData);
  }

  async findById(id) {
    return await Sale.findById(id)
      .populate('items.product', 'name sku unit sellingPrice category image')
      .populate('customer', 'name phone email loyaltyPoints')
      .lean();
  }

  async findByInvoiceNumber(invoiceNumber) {
    return await Sale.findOne({ invoiceNumber: invoiceNumber.trim().toUpperCase() })
      .populate('items.product', 'name sku unit sellingPrice category image')
      .populate('customer', 'name phone email loyaltyPoints')
      .lean();
  }

  async findByIdempotencyKey(key) {
    if (!key) return null;
    return await Sale.findOne({ idempotencyKey: key.trim() })
      .populate('items.product', 'name sku unit sellingPrice category image')
      .populate('customer', 'name phone email loyaltyPoints')
      .lean();
  }

  async findAll({
    page = 1,
    limit = 10,
    search = '',
    paymentMethod = '',
    startDate = null,
    endDate = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (search && search.trim() !== '') {
      const q = search.trim();
      filter.$or = [
        { invoiceNumber: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } }
      ];
    }

    if (paymentMethod && paymentMethod.trim() !== '') {
      filter.paymentMethod = paymentMethod.trim();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const total = await Sale.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum) || 1;

    const sales = await Sale.find(filter)
      .populate('customer', 'name phone loyaltyPoints')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return {
      sales,
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

  async generateNextInvoiceNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}-`;

    const lastSaleToday = await Sale.findOne({
      invoiceNumber: { $regex: `^${prefix}` }
    })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber');

    let seq = 1;
    if (lastSaleToday && lastSaleToday.invoiceNumber) {
      const parts = lastSaleToday.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }
}

export const saleRepository = new SaleRepository();
