import { supplierRepository } from '../repositories/supplier.repository.js';
import { ApiError } from '../utils/ApiError.js';

export class SupplierService {
  async getAllSuppliers(query) {
    await supplierRepository.ensureDefaultSuppliers();
    return await supplierRepository.findAll(query);
  }

  async getSupplierById(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw ApiError.notFound(`Supplier with ID ${id} not found`);
    }

    // Dynamic import to prevent circular dependency
    const { Purchase } = await import('../models/Purchase.js');
    const purchases = await Purchase.find({ supplier: id }).sort({ createdAt: -1 }).lean();

    return {
      supplier,
      purchases,
      totalOrdersCount: purchases.length
    };
  }

  async createSupplier(data) {
    if (!data.companyName || data.companyName.trim().length < 2) {
      throw ApiError.badRequest('Company name must be at least 2 characters');
    }
    if (!data.phone || data.phone.trim().length < 6) {
      throw ApiError.badRequest('Valid phone number is required');
    }

    return await supplierRepository.create({
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson?.trim() || '---',
      phone: data.phone.trim(),
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      gstin: data.gstin?.trim()?.toUpperCase() || '',
      category: data.category?.trim() || 'General FMCG',
      paymentTerms: data.paymentTerms || 'Immediate',
      balanceDue: Number(data.balanceDue) || 0,
      status: data.status || 'Active'
    });
  }

  async updateSupplier(id, data) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Supplier with ID ${id} not found`);
    }

    const updateData = {};
    if (data.companyName !== undefined) updateData.companyName = data.companyName.trim();
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson.trim();
    if (data.phone !== undefined) updateData.phone = data.phone.trim();
    if (data.email !== undefined) updateData.email = data.email.trim();
    if (data.address !== undefined) updateData.address = data.address.trim();
    if (data.gstin !== undefined) updateData.gstin = data.gstin.trim().toUpperCase();
    if (data.category !== undefined) updateData.category = data.category.trim();
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.balanceDue !== undefined) updateData.balanceDue = Number(data.balanceDue);
    if (data.status !== undefined) updateData.status = data.status;

    return await supplierRepository.update(id, updateData);
  }
}

export const supplierService = new SupplierService();
