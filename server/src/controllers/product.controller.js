import { productService } from '../services/product.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Product Controller
 * Handles HTTP requests for Products
 */
export class ProductController {
  // GET /api/products
  getProducts = asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.getAllProducts(req.query);

    return ApiResponse.success(
      res,
      products,
      `Products fetched successfully (${products.length} items)`,
      200,
      pagination
    );
  });

  // GET /api/products/:id
  getProductById = asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    return ApiResponse.success(res, product, 'Product details fetched successfully');
  });

  // GET /api/products/barcode?code=...
  getProductByBarcode = asyncHandler(async (req, res) => {
    const product = await productService.getProductByBarcode(req.query.code);
    return ApiResponse.success(res, product, 'Product barcode lookup succeeded');
  });

  // POST /api/products
  createProduct = asyncHandler(async (req, res) => {
    const newProduct = await productService.createProduct(req.body);
    return ApiResponse.created(res, newProduct, `Product "${newProduct.name}" created successfully`);
  });

  // PATCH /api/products/:id
  updateProduct = asyncHandler(async (req, res) => {
    const updated = await productService.updateProduct(req.params.id, req.body);
    return ApiResponse.success(res, updated, `Product "${updated.name}" updated successfully`);
  });

  // DELETE /api/products/:id
  deleteProduct = asyncHandler(async (req, res) => {
    const deleted = await productService.deleteProduct(req.params.id);
    return ApiResponse.success(res, deleted, `Product "${deleted.name}" deleted successfully`);
  });
}

export const productController = new ProductController();
