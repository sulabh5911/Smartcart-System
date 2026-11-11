import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

export function validateReceiveStock(req, res, next) {
  const { productId, batchNumber, purchasePrice, expiryDate, quantity } = req.body;
  const errors = [];

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    errors.push('Valid productId is required');
  }

  if (!batchNumber || typeof batchNumber !== 'string' || batchNumber.trim().length === 0) {
    errors.push('Batch number is required (e.g. B001)');
  }

  const price = parseFloat(purchasePrice);
  if (purchasePrice === undefined || isNaN(price) || price < 0) {
    errors.push('Purchase price must be a non-negative number');
  }

  const qty = parseInt(quantity, 10);
  if (quantity === undefined || isNaN(qty) || qty <= 0) {
    errors.push('Received quantity must be a positive integer greater than 0');
  }

  if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
    errors.push('Valid expiry date is required');
  }

  if (errors.length > 0) {
    return next(ApiError.validationError(errors));
  }

  next();
}

export function validateAdjustStock(req, res, next) {
  const { batchId, adjustmentType, quantity, reason } = req.body;
  const errors = [];

  if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
    errors.push('Valid batchId is required');
  }

  const allowedTypes = ['ADD', 'SUBTRACT', 'SET'];
  if (!adjustmentType || !allowedTypes.includes(adjustmentType.toUpperCase())) {
    errors.push('Adjustment type must be one of: ADD, SUBTRACT, SET');
  }

  const qty = parseInt(quantity, 10);
  if (quantity === undefined || isNaN(qty) || qty < 0) {
    errors.push('Quantity must be a non-negative integer');
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    errors.push('Reason is required and must be at least 3 characters long for audit trail');
  }

  if (errors.length > 0) {
    return next(ApiError.validationError(errors));
  }

  next();
}
