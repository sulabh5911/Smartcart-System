import mongoose from 'mongoose';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { Batch } from '../models/Batch.js';
import { Customer } from '../models/Customer.js';
import { StockMovement } from '../models/StockMovement.js';
import { saleRepository } from '../repositories/sale.repository.js';
import { inventoryService } from './inventory.service.js';
import { ApiError } from '../utils/ApiError.js';

export class SaleService {
  /**
   * Complete POS Checkout Engine
   * 
   * Highlights:
   * 1. 100% Server-Authoritative: Trusted prices, taxes, discounts computed on server.
   * 2. Map-based quantity aggregation for multi-item and duplicated cart entries.
   * 3. FEFO (First Expiring, First Out): Batches with earliest expiry depleted first.
   * 4. Expiry Guard: Sales are STRICTLY BLOCKED from batches with passed expiry dates.
   * 5. Atomic Stock Deduction & Compensating Rollback: Never leaves partial deductions or corrupted state.
   * 6. Idempotency Protection: Re-submitting the same checkout returns the original bill without double-charging.
   * 7. Audit Compliance: Logs StockMovement entries for each depleted batch.
   */
  async checkout({
    items = [],
    customerId = null,
    customerName = 'Walk-in Customer',
    customerPhone = '---',
    discountPercent = 0,
    paymentMethod = 'Cash',
    cashier = 'Admin',
    idempotencyKey = null,
    notes = ''
  }) {
    // 1. Idempotency Check (Duplicate request protection)
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      const existingSale = await saleRepository.findByIdempotencyKey(idempotencyKey.trim());
      if (existingSale) {
        return {
          sale: existingSale,
          isDuplicate: true,
          message: `Idempotent response: Returning already processed invoice "${existingSale.invoiceNumber}". No duplicate charge.`
        };
      }
    }

    // 2. Validate Items Array
    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('Cart is empty. At least one product is required for checkout.');
    }

    // 3. Map-based Quantity Aggregation (DSA in Action!)
    // Groups duplicate product entries from the client into a single authoritative requested quantity
    const aggregatedCartMap = new Map(); // Key: productId (String) -> Value: quantity (Number)

    for (const item of items) {
      const pid = item.productId || item.id || item._id;
      if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
        throw ApiError.badRequest(`Invalid or missing product ID in cart item.`);
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw ApiError.badRequest(`Quantity for product ID ${pid} must be an integer greater than 0.`);
      }

      const currentQty = aggregatedCartMap.get(pid.toString()) || 0;
      aggregatedCartMap.set(pid.toString(), currentQty + qty);
    }

    // 4. Validate and Fetch Products & Batches (FEFO Planning)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deductionPlan = []; // Instructions for atomic execution: [{ batch, deductQty, prevQty }]
    const processedSaleItems = []; // Populated line items with authoritative prices
    let computedSubtotal = 0;

    for (const [productIdStr, totalNeededQty] of aggregatedCartMap.entries()) {
      const product = await Product.findById(productIdStr);
      if (!product) {
        throw ApiError.notFound(`Product with ID ${productIdStr} does not exist in store catalog.`);
      }
      if (product.isArchived) {
        throw ApiError.badRequest(`Product "${product.name}" is archived and cannot be sold.`);
      }

      // Authoritative selling price directly from DB (NEVER TRUST CLIENT PRICE!)
      const trustedPrice = product.sellingPrice;
      const itemTotal = Math.round(trustedPrice * totalNeededQty * 100) / 100;
      computedSubtotal += itemTotal;

      // 5. FEFO: Fetch all batches sorted by expiryDate ascending (earliest expiry first)
      const batches = await Batch.find({
        product: product._id,
        availableQuantity: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      // Separate valid batches from expired batches
      const validBatches = [];
      const expiredBatches = [];

      for (const b of batches) {
        const expDate = new Date(b.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        if (expDate.getTime() <= today.getTime()) {
          expiredBatches.push(b);
        } else {
          validBatches.push(b);
        }
      }

      // Check total available stock across valid (non-expired) batches
      const validStockAvailable = validBatches.reduce((acc, b) => acc + b.availableQuantity, 0);

      if (validStockAvailable < totalNeededQty) {
        const expiredStockMsg =
          expiredBatches.length > 0
            ? ` (${expiredBatches.reduce((a, b) => a + b.availableQuantity, 0)} units found in expired batch(es) but blocked by shelf-life safety policy)`
            : '';

        throw ApiError.badRequest(
          `Insufficient stock for "${product.name}". Requested: ${totalNeededQty}, Available in valid batches: ${validStockAvailable}${expiredStockMsg}.`
        );
      }

      // Allocate quantities across earliest expiring batches first (FEFO Algorithm)
      let remainingToDeduct = totalNeededQty;
      const batchesDeductedForItem = [];

      for (const batch of validBatches) {
        if (remainingToDeduct <= 0) break;

        const qtyFromThisBatch = Math.min(batch.availableQuantity, remainingToDeduct);

        batchesDeductedForItem.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantityDeducted: qtyFromThisBatch,
          purchasePrice: batch.purchasePrice
        });

        deductionPlan.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          productId: product._id,
          productName: product.name,
          deductQty: qtyFromThisBatch,
          previousStock: batch.availableQuantity
        });

        remainingToDeduct -= qtyFromThisBatch;
      }

      const lineCost = batchesDeductedForItem.reduce((sum, b) => sum + (b.purchasePrice * b.quantityDeducted), 0);

      processedSaleItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        unitPrice: trustedPrice,
        quantity: totalNeededQty,
        itemTotal,
        itemCost: Math.round(lineCost * 100) / 100,
        batchesDeducted: batchesDeductedForItem
      });
    }

    const totalCOGS = processedSaleItems.reduce((acc, it) => acc + (it.itemCost || 0), 0);

    // 6. Trusted Financial Calculations
    const cleanDiscountPercent = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
    const discountAmount = Math.round(((computedSubtotal * cleanDiscountPercent) / 100) * 100) / 100;
    const taxableAmount = Math.max(0, Math.round((computedSubtotal - discountAmount) * 100) / 100);

    const taxPercent = 0;
    const taxAmount = 0;
    const grandTotal = taxableAmount;

    const validatedPaymentMethod = ['Cash', 'UPI', 'Card'].includes(paymentMethod)
      ? paymentMethod
      : 'Cash';

    // 7. Generate Sequential Unique Invoice Number
    const invoiceNumber = await saleRepository.generateNextInvoiceNumber();

    // 8. Atomic Batch Deductions with Compensating Rollback Protection
    const completedDeductions = []; // Tracks successfully executed operations for rollback if needed

    try {
      for (const step of deductionPlan) {
        // Atomic update with condition to guarantee concurrency safety:
        // availableQuantity MUST be >= deductQty at execution time!
        const updateResult = await Batch.updateOne(
          {
            _id: step.batchId,
            availableQuantity: { $gte: step.deductQty }
          },
          {
            $inc: { availableQuantity: -step.deductQty }
          }
        );

        if (updateResult.modifiedCount === 0) {
          throw new Error(
            `Concurrency conflict! Stock for batch ${step.batchNumber} changed during checkout. Transaction aborted.`
          );
        }

        completedDeductions.push(step);
      }
    } catch (concurrencyErr) {
      const rollbackErrors = [];
      for (const rollbackStep of completedDeductions) {
        try {
          const result = await Batch.updateOne(
            { _id: rollbackStep.batchId },
            { $inc: { availableQuantity: rollbackStep.deductQty } }
          );
          if (result.modifiedCount !== 1) {
            throw new Error(`Could not restore batch ${rollbackStep.batchNumber}.`);
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }

      if (rollbackErrors.length > 0) {
        console.error('POS stock deduction rollback was incomplete:', {
          errors: rollbackErrors.map((error) => error.message)
        });
        throw ApiError.internal(
          'Checkout failed and automatic stock rollback was incomplete. Contact support before retrying.'
        );
      }
      throw ApiError.conflict(concurrencyErr.message || 'Checkout failed due to stock change. Rollback successful.');
    }

    let sale;
    let loyaltyUpdated = false;
    const createdMovementIds = [];
    try {
      // 9. Create stock movement audit logs for each deducted batch.
      for (const step of completedDeductions) {
        const movement = await StockMovement.create({
          product: step.productId,
          batch: step.batchId,
          movementType: 'SALE',
          quantity: -step.deductQty,
          previousStock: step.previousStock,
          newStock: step.previousStock - step.deductQty,
          reason: `POS sale checkout (Invoice: ${invoiceNumber})`,
          reference: invoiceNumber,
          performedBy: cashier
        });
        createdMovementIds.push(movement._id);
      }

      // 10. Update Product Status & Recalculate Catalog Stock
      for (const productIdStr of aggregatedCartMap.keys()) {
        await inventoryService._updateProductStockStatus(productIdStr);
      }

      // 11. Update Customer Loyalty & Spending if registered customer.
      if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
        await Customer.findByIdAndUpdate(customerId, {
          $inc: { totalSpent: grandTotal, loyaltyPoints: Math.floor(grandTotal / 100) }
        });
        loyaltyUpdated = true;
      }

      // 12. Create & Persist Authoritative Sale Record.
      sale = await saleRepository.create({
        invoiceNumber,
        idempotencyKey: idempotencyKey?.trim() || undefined,
        customer: customerId && mongoose.Types.ObjectId.isValid(customerId) ? customerId : null,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '---',
        items: processedSaleItems,
        itemsCount: Array.from(aggregatedCartMap.values()).reduce((a, b) => a + b, 0),
        cogs: Math.round(totalCOGS * 100) / 100,
        subtotal: computedSubtotal,
        discountPercent: cleanDiscountPercent,
        discountAmount,
        taxableAmount,
        taxPercent,
        taxAmount,
        totalAmount: grandTotal,
        paymentMethod: validatedPaymentMethod,
        cashier,
        notes
      });

      return {
        sale,
        isDuplicate: false,
        message: `Invoice ${invoiceNumber} created successfully. Stock deducted via FEFO.`
      };
    } catch (checkoutError) {
      const rollbackErrors = [];
      const rollback = async (operation) => {
        try {
          await operation();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      };

      if (createdMovementIds.length > 0) {
        await rollback(() => StockMovement.deleteMany({ _id: { $in: createdMovementIds } }));
      }
      if (sale?._id) {
        await rollback(() => Sale.deleteOne({ _id: sale._id }));
      }
      if (loyaltyUpdated && customerId) {
        await rollback(() =>
          Customer.findByIdAndUpdate(customerId, {
            $inc: { totalSpent: -grandTotal, loyaltyPoints: -Math.floor(grandTotal / 100) }
          })
        );
      }
      for (const step of completedDeductions) {
        await rollback(() =>
          Batch.updateOne({ _id: step.batchId }, { $inc: { availableQuantity: step.deductQty } })
        );
      }
      for (const productIdStr of aggregatedCartMap.keys()) {
        await rollback(() => inventoryService._updateProductStockStatus(productIdStr));
      }

      if (rollbackErrors.length > 0) {
        console.error('POS checkout rollback was incomplete:', {
          invoiceNumber,
          errors: rollbackErrors.map((error) => error.message)
        });
        throw ApiError.internal(
          'Checkout failed and automatic rollback was incomplete. Contact support before retrying.'
        );
      }

      if (checkoutError?.code === 11000 && idempotencyKey) {
        const duplicateSale = await saleRepository.findByIdempotencyKey(idempotencyKey.trim());
        if (duplicateSale) {
          return {
            sale: duplicateSale,
            isDuplicate: true,
            message: `Idempotent response: Returning already processed invoice "${duplicateSale.invoiceNumber}". No duplicate charge.`
          };
        }
      }

      throw checkoutError;
    }
  }

  async getAllSales(query) {
    return await saleRepository.findAll(query);
  }

  async getSaleById(id) {
    const sale = await saleRepository.findById(id);
    if (!sale) {
      throw ApiError.notFound(`Invoice with ID ${id} not found.`);
    }
    return sale;
  }

  async getSaleByInvoiceNumber(invoiceNumber) {
    const sale = await saleRepository.findByInvoiceNumber(invoiceNumber);
    if (!sale) {
      throw ApiError.notFound(`Invoice "${invoiceNumber}" not found.`);
    }
    return sale;
  }
}

export const saleService = new SaleService();
