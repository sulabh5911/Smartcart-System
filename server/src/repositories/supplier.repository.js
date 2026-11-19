import { Supplier } from '../models/Supplier.js';

export class SupplierRepository {
  populateReferences(query) {
    return query
      .populate('categories', 'name')
      .populate({
        path: 'products',
        select: 'name sku barcode category isArchived',
        populate: { path: 'category', select: 'name' }
      });
  }

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

    return await this.populateReferences(Supplier.find(filter))
      .sort({ companyName: 1 })
      .limit(limit)
      .lean();
  }

  async findById(id) {
    return await this.populateReferences(Supplier.findById(id)).lean();
  }

  async create(supplierData) {
    return await Supplier.create(supplierData);
  }

  async update(id, updateData) {
    return await Supplier.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
  }
}

export const supplierRepository = new SupplierRepository();
