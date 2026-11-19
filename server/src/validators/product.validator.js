import { ApiError } from '../utils/ApiError.js';
import { normalizeBarcode } from '../utils/barcode.js';

/**
 * Product Creation Request Validator Middleware
 */
export const validateCreateProduct = (req, res, next) => {
  const { name, sku, category, price, sellingPrice, stock, initialStock, purchasePrice, costPrice, barcode } = req.body;
  const errors = [];

  // 1. Name validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Product "name" is required and cannot be empty.');
  } else if (name.trim().length < 2 || name.trim().length > 100) {
    errors.push('Product "name" must be between 2 and 100 characters.');
  }

  // 2. SKU validation
  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    errors.push('Product "sku" is required.');
  } else if (!/^[A-Za-z0-9-_]{3,20}$/.test(sku.trim())) {
    errors.push('Product "sku" must be 3-20 alphanumeric characters or hyphens.');
  }

  // 3. Category validation
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('Product "category" is required.');
  }

  // 4. Price validation (accepts either sellingPrice or price)
  const finalPrice = sellingPrice ?? price;
  if (finalPrice === undefined || finalPrice === null || finalPrice === '') {
    errors.push('Product selling price ("sellingPrice" or "price") is required.');
  } else if (isNaN(finalPrice) || Number(finalPrice) <= 0) {
    errors.push('Selling price must be a positive number greater than 0.');
  }

  // 5. Stock validation (optional for product, but if provided must be non-negative)
  const finalStock = initialStock ?? stock;
  if (finalStock !== undefined && finalStock !== null && finalStock !== '') {
    if (isNaN(finalStock) || Number(finalStock) < 0 || !Number.isInteger(Number(finalStock))) {
      errors.push('Initial stock must be a non-negative integer (0 or greater).');
    }
  }

  // 6. Purchase / Cost price validation (optional)
  const finalCost = purchasePrice ?? costPrice;
  if (finalCost !== undefined && finalCost !== null && finalCost !== '') {
    if (isNaN(finalCost) || Number(finalCost) < 0) {
      errors.push('Purchase / Cost price cannot be negative.');
    }
  }

  try {
    normalizeBarcode(barcode);
  } catch (error) {
    if (!(error instanceof ApiError)) return next(error);
    errors.push(error.message);
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Product validation failed', errors));
  }

  next();
};

/**
 * Product Update Request Validator Middleware
 */
export const validateUpdateProduct = (req, res, next) => {
  const { name, sku, price, sellingPrice, minStockAlert, barcode } = req.body;
  const errors = [];

  if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
    errors.push('Product "name" must be at least 2 characters long.');
  }

  if (sku !== undefined && !/^[A-Za-z0-9-_]{3,20}$/.test(sku.trim())) {
    errors.push('Product "sku" must be 3-20 alphanumeric characters or hyphens.');
  }

  const finalPrice = sellingPrice ?? price;
  if (finalPrice !== undefined && (isNaN(finalPrice) || Number(finalPrice) <= 0)) {
    errors.push('Selling price must be greater than 0.');
  }

  if (minStockAlert !== undefined && (isNaN(minStockAlert) || Number(minStockAlert) < 0)) {
    errors.push('minStockAlert cannot be negative.');
  }

  if (barcode !== undefined) {
    try {
      normalizeBarcode(barcode);
    } catch (error) {
      if (!(error instanceof ApiError)) return next(error);
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Update validation failed', errors));
  }

  next();
};
