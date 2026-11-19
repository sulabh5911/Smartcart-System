import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

export function normalizeSupplierReferenceIds(values, fieldName) {
  if (!Array.isArray(values)) {
    throw ApiError.badRequest(`${fieldName} must be an array of IDs.`);
  }

  const ids = values.map((value) => value?._id ?? value);
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw ApiError.badRequest(`${fieldName} contains an invalid ID.`);
  }

  return [...new Set(ids.map((id) => id.toString()))];
}

export function collectSupplierCategoryIds(categoryIds, products) {
  const productCategoryIds = products.map((product) => product.category?.toString());
  if (productCategoryIds.some((categoryId) => !categoryId)) {
    throw ApiError.badRequest('One or more selected products do not have a valid category.');
  }

  return [...new Set([...categoryIds, ...productCategoryIds])];
}

export function supplierProvidesProduct(supplier, product) {
  const productId = (product?._id || product).toString();
  const productIds = (supplier.products || []).map((value) => (value?._id || value).toString());
  if (productIds.length) return productIds.includes(productId);

  const categoryIds = (supplier.categories || []).map((value) => (value?._id || value).toString());
  if (categoryIds.length) {
    const categoryId = (product.category?._id || product.category)?.toString();
    return Boolean(categoryId && categoryIds.includes(categoryId));
  }

  return true;
}

export function buildSupplierRelations(categories, products) {
  const categoryIds = [...new Set(categories.map((category) => category._id.toString()))];

  return {
    categories: categoryIds,
    products: products.map((product) => product._id),
    category: categories.map((category) => category.name).join(', ')
  };
}
