import mongoose from 'mongoose';
import { categoryRepository } from '../repositories/category.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';

/**
 * Category Service
 * Handles business validation and operations for categories.
 */
export class CategoryService {
  async getAllCategories() {
    return await categoryRepository.findAll();
  }

  async getCategoryById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid category ID format');
    }
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw ApiError.notFound(`Category with ID ${id} not found`);
    }
    return category;
  }

  async createCategory(categoryData) {
    const existing = await categoryRepository.findByName(categoryData.name);
    if (existing) {
      throw ApiError.conflict(
        `Category with name "${categoryData.name}" already exists. Category names must be unique.`
      );
    }

    return await categoryRepository.create(categoryData);
  }

  async updateCategory(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid category ID format');
    }

    if (updateData.name) {
      const existing = await categoryRepository.findByName(updateData.name);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict(
          `Category with name "${updateData.name}" already exists.`
        );
      }
    }

    const updated = await categoryRepository.update(id, updateData);
    if (!updated) {
      throw ApiError.notFound(`Category with ID ${id} not found`);
    }
    return updated;
  }

  async deleteCategory(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid category ID format');
    }

    const [hasProducts, hasSuppliers] = await Promise.all([
      Product.exists({ category: id }),
      Supplier.exists({ categories: id })
    ]);
    if (hasProducts || hasSuppliers) {
      throw ApiError.conflict(
        'Cannot delete a category linked to products or suppliers. Reassign those records first.'
      );
    }

    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw ApiError.notFound(`Category with ID ${id} not found`);
    }
    return deleted;
  }
}

export const categoryService = new CategoryService();
