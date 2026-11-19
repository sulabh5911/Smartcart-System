import mongoose from 'mongoose';
import { productRepository } from '../repositories/product.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { batchRepository } from '../repositories/batch.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeBarcode } from '../utils/barcode.js';

/**
 * Product Service
 * Business logic for supermarket product catalog:
 * - SKU uniqueness check
 * - Category resolution (supports both Category ObjectId & Category Name string)
 * - Initial inventory batch creation
 * - Query pagination, search, category filter and sorting
 */
export class ProductService {
  async getAllProducts(queryParams = {}) {
    return await productRepository.findAll(queryParams);
  }

  async getProductById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    return product;
  }

  async getProductByBarcode(value) {
    const barcode = normalizeBarcode(value);
    if (!barcode) {
      throw ApiError.badRequest('A barcode query parameter is required.');
    }

    const product = await productRepository.findByBarcode(barcode);
    if (!product) {
      throw ApiError.notFound('No active product was found for this barcode.');
    }

    return product;
  }

  async createProduct(productData) {
    // 1. SKU Uniqueness check
    const existingSku = await productRepository.findBySku(productData.sku);
    if (existingSku) {
      throw ApiError.conflict(
        `A product with SKU "${productData.sku.toUpperCase()}" already exists. SKU must be unique.`
      );
    }

    const barcode = normalizeBarcode(productData.barcode);
    if (barcode && (await productRepository.findBarcodeCollision(barcode))) {
      throw ApiError.conflict('This barcode is already assigned to another product.');
    }

    // 2. Resolve Category Reference (Supports either ObjectId or Category Name string)
    let categoryId = null;
    if (mongoose.Types.ObjectId.isValid(productData.category)) {
      const catDoc = await categoryRepository.findById(productData.category);
      if (!catDoc) {
        throw ApiError.badRequest(`Category with ID "${productData.category}" does not exist.`);
      }
      categoryId = catDoc._id;
    } else {
      const catDoc = await categoryRepository.findByName(productData.category);
      if (!catDoc) {
        throw ApiError.badRequest(
          `Category "${productData.category}" does not exist. Please create or choose an existing category.`
        );
      }
      categoryId = catDoc._id;
    }

    const initialQty = Number(productData.initialStock ?? productData.stock ?? 0);
    if (!Number.isInteger(initialQty) || initialQty < 0) {
      throw ApiError.badRequest('Initial stock must be a non-negative whole number.');
    }

    let initialBatch = null;
    if (initialQty > 0) {
      if (!productData.expiryDate) {
        throw ApiError.badRequest('Expiry date is required when receiving initial stock.');
      }
      const expiryDate = new Date(productData.expiryDate);
      const expiryDay = new Date(expiryDate);
      expiryDay.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(expiryDate.getTime()) || expiryDay <= today) {
        throw ApiError.badRequest('Initial stock expiry date must be after today.');
      }

      const purchasePriceValue = productData.purchasePrice ?? productData.costPrice;
      if (purchasePriceValue == null || purchasePriceValue === '') {
        throw ApiError.badRequest('Purchase price is required when receiving initial stock.');
      }
      const purchasePrice = Number(purchasePriceValue);
      if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        throw ApiError.badRequest('Initial stock purchase price must be a valid non-negative number.');
      }

      const batchNumber = typeof productData.batchNumber === 'string' ? productData.batchNumber.trim() : '';
      initialBatch = {
        batchNumber: batchNumber || `B0${Math.floor(10 + Math.random() * 90)}`,
        mfgDate: productData.mfgDate || new Date(),
        expiryDate,
        purchasePrice
      };
    }

    // 3. Create Product document
    const newProduct = await productRepository.create({
      name: productData.name.trim(),
      sku: productData.sku.trim().toUpperCase(),
      barcode,
      category: categoryId,
      unit: productData.unit || 'packet',
      sellingPrice: Number(productData.sellingPrice || productData.price),
      minStockAlert: Number(productData.minStockAlert) || 20,
      description: productData.description || '',
      image: typeof productData.image === 'string' ? productData.image.trim() : ''
    });

    // 4. If initial batch details are provided, create the initial inventory batch
    if (initialBatch) {
      await batchRepository.create({
        batchNumber: initialBatch.batchNumber,
        product: newProduct._id,
        mfgDate: initialBatch.mfgDate,
        expiryDate: initialBatch.expiryDate,
        purchasePrice: initialBatch.purchasePrice,
        availableQuantity: initialQty
      });
    }

    // Return the created product with populated category and batches
    return await productRepository.findById(newProduct._id);
  }

  async updateProduct(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const safeUpdateData = {};
    for (const field of [
      'name',
      'sku',
      'barcode',
      'category',
      'unit',
      'sellingPrice',
      'price',
      'minStockAlert',
      'description',
      'image'
    ]) {
      if (Object.hasOwn(updateData, field)) safeUpdateData[field] = updateData[field];
    }

    // Check SKU collision if updating SKU
    if (safeUpdateData.sku) {
      const existingSku = await productRepository.findBySku(safeUpdateData.sku);
      if (existingSku && existingSku._id.toString() !== id) {
        throw ApiError.conflict(`SKU "${safeUpdateData.sku}" is already taken by another product.`);
      }
      safeUpdateData.sku = safeUpdateData.sku.trim().toUpperCase();
    }

    if (Object.hasOwn(safeUpdateData, 'barcode')) {
      safeUpdateData.barcode = normalizeBarcode(safeUpdateData.barcode) ?? null;
      if (
        safeUpdateData.barcode &&
        (await productRepository.findBarcodeCollision(safeUpdateData.barcode, id))
      ) {
        throw ApiError.conflict('This barcode is already assigned to another product.');
      }
    }

    // Resolve category if updating category
    if (safeUpdateData.category) {
      if (mongoose.Types.ObjectId.isValid(safeUpdateData.category)) {
        const category = await categoryRepository.findById(safeUpdateData.category);
        if (!category) {
          throw ApiError.badRequest(`Category with ID "${safeUpdateData.category}" does not exist.`);
        }
        safeUpdateData.category = category._id;
      } else {
        const catDoc = await categoryRepository.findByName(safeUpdateData.category);
        if (!catDoc) {
          throw ApiError.badRequest(`Category "${safeUpdateData.category}" does not exist.`);
        }
        safeUpdateData.category = catDoc._id;
      }
    }

    if (safeUpdateData.name !== undefined) safeUpdateData.name = safeUpdateData.name.trim();
    if (safeUpdateData.description !== undefined) safeUpdateData.description = safeUpdateData.description.trim();
    if (safeUpdateData.sellingPrice === undefined && safeUpdateData.price !== undefined) {
      safeUpdateData.sellingPrice = Number(safeUpdateData.price);
    }
    delete safeUpdateData.price;

    const updated = await productRepository.update(id, safeUpdateData);
    if (!updated) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    return updated;
  }

  async deleteProduct(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const deleted = await productRepository.delete(id);
    if (!deleted) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    return deleted;
  }
}

export const productService = new ProductService();
