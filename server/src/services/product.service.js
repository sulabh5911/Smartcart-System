import mongoose from 'mongoose';
import { productRepository } from '../repositories/product.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { batchRepository } from '../repositories/batch.repository.js';
import { ApiError } from '../utils/ApiError.js';

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

  async createProduct(productData) {
    // 1. SKU Uniqueness check
    const existingSku = await productRepository.findBySku(productData.sku);
    if (existingSku) {
      throw ApiError.conflict(
        `A product with SKU "${productData.sku.toUpperCase()}" already exists. SKU must be unique.`
      );
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

    // 3. Create Product document
    const newProduct = await productRepository.create({
      name: productData.name.trim(),
      sku: productData.sku.trim().toUpperCase(),
      barcode: productData.barcode?.trim() || `89012345${Math.floor(1000 + Math.random() * 9000)}`,
      category: categoryId,
      unit: productData.unit || 'packet',
      sellingPrice: Number(productData.sellingPrice || productData.price),
      minStockAlert: Number(productData.minStockAlert) || 20,
      description: productData.description || '',
      image: productData.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&auto=format&fit=crop&q=80'
    });

    // 4. If initial batch details are provided, create the initial inventory batch
    const initialQty = Number(productData.initialStock ?? productData.stock);
    if (initialQty && initialQty > 0) {
      await batchRepository.create({
        batchNumber: productData.batchNumber || `B0${Math.floor(10 + Math.random() * 90)}`,
        product: newProduct._id,
        mfgDate: productData.mfgDate || new Date(),
        expiryDate: productData.expiryDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // default 6 months
        purchasePrice: Number(productData.purchasePrice ?? productData.costPrice) || Math.round(newProduct.sellingPrice * 0.8),
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

    // Check SKU collision if updating SKU
    if (updateData.sku) {
      const existingSku = await productRepository.findBySku(updateData.sku);
      if (existingSku && existingSku._id.toString() !== id) {
        throw ApiError.conflict(`SKU "${updateData.sku}" is already taken by another product.`);
      }
      updateData.sku = updateData.sku.toUpperCase();
    }

    // Resolve category if updating category
    if (updateData.category) {
      if (!mongoose.Types.ObjectId.isValid(updateData.category)) {
        const catDoc = await categoryRepository.findByName(updateData.category);
        if (!catDoc) {
          throw ApiError.badRequest(`Category "${updateData.category}" does not exist.`);
        }
        updateData.category = catDoc._id;
      }
    }

    const updated = await productRepository.update(id, updateData);
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
