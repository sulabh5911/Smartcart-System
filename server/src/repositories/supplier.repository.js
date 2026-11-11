import { Supplier } from '../models/Supplier.js';

export class SupplierRepository {
  async findAll({ search = '', status = '', limit = 50 } = {}) {
    const filter = {};
    if (search && search.trim() !== '') {
      const q = search.trim();
      filter.$or = [
        { companyName: { $regex: q, $options: 'i' } },
        { contactPerson: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ];
    }
    if (status && status.trim() !== '') {
      filter.status = status.trim();
    }

    return await Supplier.find(filter).sort({ companyName: 1 }).limit(limit).lean();
  }

  async findById(id) {
    return await Supplier.findById(id).lean();
  }

  async create(supplierData) {
    return await Supplier.create(supplierData);
  }

  async update(id, updateData) {
    return await Supplier.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
  }

  async ensureDefaultSuppliers() {
    const count = await Supplier.countDocuments();
    if (count === 0) {
      await Supplier.create([
        {
          companyName: 'Nestlé India Ltd',
          contactPerson: 'Rajat Kapoor',
          phone: '+91 98101 22334',
          email: 'orders.delhi@nestle.com',
          address: 'Plot 4, DLF Cyber City, Gurugram, Haryana',
          gstin: '07AAACN1234F1Z5',
          category: 'Packaged Foods & Beverages',
          paymentTerms: 'Net 30',
          balanceDue: 45000,
          totalPurchases: 320000,
          totalOrders: 14,
          status: 'Active'
        },
        {
          companyName: 'Amul (GCMMF)',
          contactPerson: 'Suresh Patel',
          phone: '+91 98250 11223',
          email: 'delhi.dairy@amul.coop',
          address: 'Amul Dairy Road, Anand, Gujarat',
          gstin: '24AAACG1234D1Z2',
          category: 'Dairy Products',
          paymentTerms: 'Immediate',
          balanceDue: 0,
          totalPurchases: 450000,
          totalOrders: 28,
          status: 'Active'
        },
        {
          companyName: 'ITC Limited (Foods Division)',
          contactPerson: 'Manish Rawat',
          phone: '+91 98300 44556',
          email: 'fmcg.supply@itc.in',
          address: 'Virginia House, 37 J.L. Nehru Road, Kolkata',
          gstin: '19AAACI1234E1Z3',
          category: 'Staples & Biscuits',
          paymentTerms: 'Net 15',
          balanceDue: 18500,
          totalPurchases: 210000,
          totalOrders: 9,
          status: 'Active'
        },
        {
          companyName: 'Tata Consumer Products Ltd',
          contactPerson: 'Vikas Nambiar',
          phone: '+91 98220 55667',
          email: 'distributor@tataconsumer.com',
          address: '1, Bishop Lefroy Road, Kolkata',
          gstin: '19AAACT1234C1Z8',
          category: 'Tea, Coffee & Salt',
          paymentTerms: 'Net 30',
          balanceDue: 8200,
          totalPurchases: 180000,
          totalOrders: 8,
          status: 'Active'
        }
      ]);
    }
  }
}

export const supplierRepository = new SupplierRepository();
