import { supplierRepository } from '../repositories/supplier.repository.js';
import { ApiError } from '../utils/ApiError.js';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Purchase } from '../models/Purchase.js';
import { Batch } from '../models/Batch.js';
import {
  buildSupplierRelations,
  collectSupplierCategoryIds,
  normalizeSupplierReferenceIds
} from '../utils/supplierRelations.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SupplierService {
  async getAllSuppliers(query) {
    const suppliers = await supplierRepository.findAll(query);
    if (suppliers.length === 0) return suppliers;

    const suppliersById = new Map(suppliers.map((supplier) => [supplier._id.toString(), supplier]));
    const suppliersByName = new Map(
      suppliers.map((supplier) => [supplier.companyName.trim().toLowerCase(), supplier])
    );
    const supplierNames = [...new Set(suppliers.map((supplier) => supplier.companyName.trim()))];
    const byName = supplierNames.map((name) => ({
      supplierName: new RegExp(`^${escapeRegex(name)}$`, 'i')
    }));
    const filter = {
      $or: [{ supplier: { $in: suppliers.map((supplier) => supplier._id) } }, ...byName]
    };
    const [purchases, batches] = await Promise.all([
      Purchase.find(filter).select('supplier supplierName items.product items.name items.sku').lean(),
      Batch.find(filter).select('supplier supplierName product').populate('product', 'name sku').lean()
    ]);

    const productsBySupplier = new Map();
    const addHistoricalProduct = (record, product) => {
      const supplier =
        suppliersById.get(record.supplier?.toString()) ||
        suppliersByName.get(record.supplierName?.trim().toLowerCase());
      const productId = product?._id?.toString();
      if (!supplier || !productId || !product.name) return;

      const supplierId = supplier._id.toString();
      const products = productsBySupplier.get(supplierId) || new Map();
      products.set(productId, { _id: product._id, name: product.name, sku: product.sku || '' });
      productsBySupplier.set(supplierId, products);
    };

    for (const purchase of purchases) {
      for (const item of purchase.items || []) {
        addHistoricalProduct(purchase, {
          _id: item.product,
          name: item.name,
          sku: item.sku
        });
      }
    }
    for (const batch of batches) {
      addHistoricalProduct(batch, batch.product);
    }

    return suppliers.map((supplier) => ({
      ...supplier,
      historicalProducts: [...(productsBySupplier.get(supplier._id.toString())?.values() || [])]
    }));
  }

  async getSupplierById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid supplier ID format');
    }

    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      throw ApiError.notFound(`Supplier with ID ${id} not found`);
    }

    const supplierNamePattern = new RegExp(`^${escapeRegex(supplier.companyName.trim())}$`, 'i');
    const purchases = await Purchase.find({
      $or: [{ supplier: id }, { supplierName: supplierNamePattern }]
    }).sort({ createdAt: -1 }).lean();
    const historicalProducts = new Map();
    for (const purchase of purchases) {
      for (const item of purchase.items || []) {
        const productId = item.product?.toString();
        if (productId && !historicalProducts.has(productId)) {
          historicalProducts.set(productId, {
            _id: item.product,
            name: item.name,
            sku: item.sku
          });
        }
      }
    }
    supplier.historicalProducts = [...historicalProducts.values()];

    return {
      supplier,
      purchases,
      totalOrdersCount: purchases.length
    };
  }

  async createSupplier(data) {
    if (typeof data.companyName !== 'string' || data.companyName.trim().length < 2) {
      throw ApiError.badRequest('Company name must be at least 2 characters');
    }
    if (typeof data.phone !== 'string' || data.phone.trim().length < 6) {
      throw ApiError.badRequest('Valid phone number is required');
    }
    const balanceDue = Number(data.balanceDue ?? 0);
    if (!Number.isFinite(balanceDue) || balanceDue < 0) {
      throw ApiError.badRequest('Supplier balance due must be a non-negative number.');
    }

    const supplierData = {
      companyName: data.companyName.trim(),
      contactPerson: data.contactPerson?.trim() || '---',
      phone: data.phone.trim(),
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      gstin: data.gstin?.trim()?.toUpperCase() || '',
      category: data.category?.trim() || 'General FMCG',
      paymentTerms: data.paymentTerms || 'Immediate',
      balanceDue,
      status: data.status || 'Active'
    };

    if (Object.hasOwn(data, 'categories') || Object.hasOwn(data, 'products')) {
      Object.assign(supplierData, await this.resolveSupplierRelations(data));
    }

    return await supplierRepository.create(supplierData);
  }

  async updateSupplier(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid supplier ID format');
    }

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
    if (data.balanceDue !== undefined) {
      const balanceDue = Number(data.balanceDue);
      if (!Number.isFinite(balanceDue) || balanceDue < 0) {
        throw ApiError.badRequest('Supplier balance due must be a non-negative number.');
      }
      updateData.balanceDue = balanceDue;
    }
    if (data.status !== undefined) updateData.status = data.status;

    if (Object.hasOwn(data, 'categories') || Object.hasOwn(data, 'products')) {
      Object.assign(updateData, await this.resolveSupplierRelations(data, existing));
    }

    return await supplierRepository.update(id, updateData);
  }

  async resolveSupplierRelations(data, existing = {}) {
    const categoriesProvided = Object.hasOwn(data, 'categories');
    const productsProvided = Object.hasOwn(data, 'products');
    const categoryIds = normalizeSupplierReferenceIds(
      categoriesProvided ? data.categories : existing.categories || [],
      'categories'
    );
    const productIds = normalizeSupplierReferenceIds(
      productsProvided ? data.products : existing.products || [],
      'products'
    );

    const products = productIds.length
      ? await Product.find({
          _id: { $in: productIds }
        })
          .select('_id category')
          .lean()
      : [];
    if (products.length !== productIds.length) {
      throw ApiError.badRequest('One or more selected products do not exist or are archived.');
    }

    const allCategoryIds = collectSupplierCategoryIds(categoryIds, products);
    const categories = allCategoryIds.length
      ? await Category.find({ _id: { $in: allCategoryIds } }).select('_id name').lean()
      : [];
    if (categories.length !== allCategoryIds.length) {
      throw ApiError.badRequest('One or more selected categories do not exist.');
    }

    return buildSupplierRelations(categories, products);
  }
}

export const supplierService = new SupplierService();
