import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

/**
 * MongoDB Mongoose Category Repository
 * Handles persistent database operations for categories.
 */
export class CategoryRepository {
  async findAll(filter = {}) {
    // Categories with calculated active product count using aggregation
    const categories = await Category.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'category',
          as: 'products'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          description: 1,
          color: 1,
          status: 1,
          productCount: { $size: '$products' },
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { name: 1 } }
    ]);

    return categories;
  }

  async findById(id) {
    return await Category.findById(id);
  }

  async findByName(name) {
    if (!name) return null;
    return await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
  }

  async create(categoryData) {
    return await Category.create(categoryData);
  }

  async update(id, updateData) {
    return await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });
  }

  async delete(id) {
    return await Category.findByIdAndDelete(id);
  }
}

export const categoryRepository = new CategoryRepository();
