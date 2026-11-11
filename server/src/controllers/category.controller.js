import { categoryService } from '../services/category.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Category Controller
 * Handles HTTP requests for Categories
 */
export class CategoryController {
  // GET /api/categories
  getCategories = asyncHandler(async (req, res) => {
    const categories = await categoryService.getAllCategories();
    return ApiResponse.success(res, categories, 'Categories fetched successfully');
  });

  // GET /api/categories/:id
  getCategoryById = asyncHandler(async (req, res) => {
    const category = await categoryService.getCategoryById(req.params.id);
    return ApiResponse.success(res, category, 'Category fetched successfully');
  });

  // POST /api/categories
  createCategory = asyncHandler(async (req, res) => {
    const newCategory = await categoryService.createCategory(req.body);
    return ApiResponse.created(res, newCategory, 'Category created successfully');
  });

  // PATCH /api/categories/:id
  updateCategory = asyncHandler(async (req, res) => {
    const updated = await categoryService.updateCategory(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Category updated successfully');
  });

  // DELETE /api/categories/:id
  deleteCategory = asyncHandler(async (req, res) => {
    const deleted = await categoryService.deleteCategory(req.params.id);
    return ApiResponse.success(res, deleted, 'Category deleted successfully');
  });
}

export const categoryController = new CategoryController();
