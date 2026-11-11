import { ApiError } from '../utils/ApiError.js';

export function validateCheckout(req, res, next) {
  const { items, paymentMethod } = req.body;
  const errors = [];

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Checkout items array is required and must not be empty');
  }

  const allowedPaymentMethods = ['Cash', 'UPI', 'Card'];
  if (paymentMethod && !allowedPaymentMethods.includes(paymentMethod)) {
    errors.push(`Payment method must be one of: ${allowedPaymentMethods.join(', ')}`);
  }

  if (errors.length > 0) {
    return next(ApiError.validationError(errors));
  }

  next();
}
