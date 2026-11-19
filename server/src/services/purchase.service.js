import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase.js';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { Batch } from '../models/Batch.js';
import { StockMovement } from '../models/StockMovement.js';
import { purchaseRepository } from '../repositories/purchase.repository.js';
import { inventoryService } from './inventory.service.js';
import { ApiError } from '../utils/ApiError.js';
import { supplierProvidesProduct } from '../utils/supplierRelations.js';

export class PurchaseService {
  /**
   * Receive Inward Stock from Supplier (PO / Stock Receipt)
   * 
   * Highlights:
   * 1. Duplicate Request Protection via idempotencyKey.
   * 2. Authoritative Batch Creation: batch number, purchase price, quantity, expiry date.
   * 3. Atomic stock increase & compensating rollback on unexpected failure.
   * 4. Immutable StockMovement audit logging (movementType: 'RECEIPT').
   * 5. Catalog stock status recalculation.
   * 6. Supplier purchase volume aggregation.
   */
  async receiveStock({
    supplierId,
    supplierName,
    invoiceReference = '',
    items = [],
    paymentStatus = 'Paid',
    receivedBy = 'Admin',
    notes = '',
    idempotencyKey = null
  }) {
    if (idempotencyKey != null && typeof idempotencyKey !== 'string') {
      throw ApiError.badRequest('Idempotency key must be a string.');
    }
    if (typeof invoiceReference !== 'string') {
      throw ApiError.badRequest('Supplier invoice reference must be a string.');
    }

    // 1. Idempotency Check (Duplicate receipt protection)
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      const existingPO = await purchaseRepository.findByIdempotencyKey(idempotencyKey.trim());
      if (existingPO) {
        return {
          purchase: existingPO,
          isDuplicate: true,
          message: `Idempotent response: Returning already processed stock receipt "${existingPO.poNumber}". No duplicate inventory added.`
        };
      }
    }

    // 2. Validate Supplier
    let resolvedSupplier = null;
    if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
      resolvedSupplier = await Supplier.findById(supplierId);
    } else if (supplierName && supplierName.trim() !== '') {
      resolvedSupplier = await Supplier.findOne({
        companyName: { $regex: new RegExp(`^${supplierName.trim()}$`, 'i') }
      });
    }

    if (!resolvedSupplier) {
      throw ApiError.badRequest('A valid registered supplier is required for inward stock receipts.');
    }
    if (resolvedSupplier.status !== 'Active') {
      throw ApiError.badRequest('Cannot receive stock from an inactive supplier.');
    }

    // 3. Validate Items Array
    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('At least one product line item is required for a purchase receipt.');
    }

    if (!['Paid', 'Pending', 'Partial'].includes(paymentStatus)) {
      throw ApiError.badRequest('Payment status must be Paid, Pending, or Partial.');
    }

    // Generate PO Number
    const poNumber = await purchaseRepository.generateNextPONumber();

    const processedItems = [];
    let calculatedSubtotal = 0;
    let totalQtyReceived = 0;

    // Plan for atomic execution and rollback tracking
    const completedBatchIncrements = []; // Track [{ batchId, addedQty, isNew }]

    try {
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          throw ApiError.badRequest('Each purchase item must be an object.');
        }
        const pid = item.productId || item.product;
        if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
          throw ApiError.badRequest(`Invalid or missing product ID in purchase item.`);
        }

        const product = await Product.findById(pid);
        if (!product) {
          throw ApiError.notFound(`Product with ID ${pid} does not exist in store catalog.`);
        }
        if (product.isArchived) {
          throw ApiError.badRequest(`Cannot receive stock for archived product "${product.name}".`);
        }
        if (!supplierProvidesProduct(resolvedSupplier, product)) {
          throw ApiError.badRequest(
            `Product "${product.name}" is not linked to supplier "${resolvedSupplier.companyName}".`
          );
        }

        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw ApiError.badRequest(`Received quantity for "${product.name}" must be an integer greater than 0.`);
        }

        const purchasePrice = Number(item.purchasePrice);
        if (
          item.purchasePrice == null ||
          (typeof item.purchasePrice === 'string' && item.purchasePrice.trim() === '') ||
          !['number', 'string'].includes(typeof item.purchasePrice) ||
          !Number.isFinite(purchasePrice) ||
          purchasePrice < 0
        ) {
          throw ApiError.badRequest(`Valid purchase cost is required for "${product.name}".`);
        }

        const batchNo = typeof item.batchNumber === 'string' ? item.batchNumber.trim() : '';
        if (!batchNo) {
          throw ApiError.badRequest(`Batch number is required for receiving "${product.name}".`);
        }

        const expiryDate = new Date(item.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          throw ApiError.badRequest(`Valid expiry date is required for batch ${batchNo} of "${product.name}".`);
        }
        const expiryDay = new Date(expiryDate);
        expiryDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDay <= today) {
          throw ApiError.badRequest(`Batch ${batchNo} of "${product.name}" must expire after today.`);
        }

        const lineTotal = Math.round(purchasePrice * qty * 100) / 100;
        calculatedSubtotal += lineTotal;
        totalQtyReceived += qty;

        // Find or create batch
        let batchDoc = await Batch.findOne({ product: product._id, batchNumber: batchNo });
        let isNewBatch = false;
        let previousStock = 0;

        if (batchDoc) {
          if (
            batchDoc.supplier &&
            batchDoc.supplier.toString() !== resolvedSupplier._id.toString()
          ) {
            throw ApiError.conflict(
              `Batch ${batchNo} of "${product.name}" is already linked to a different supplier.`
            );
          }
          previousStock = batchDoc.availableQuantity;
          // Increment existing batch quantity
          batchDoc.availableQuantity += qty;
          batchDoc.purchasePrice = purchasePrice;
          batchDoc.expiryDate = expiryDate;
          batchDoc.supplier = resolvedSupplier._id;
          batchDoc.supplierName = resolvedSupplier.companyName;
          await batchDoc.save();
        } else {
          // Create new authoritative batch
          isNewBatch = true;
          batchDoc = await Batch.create({
            batchNumber: batchNo,
            product: product._id,
            supplier: resolvedSupplier._id,
            supplierName: resolvedSupplier.companyName,
            expiryDate,
            purchasePrice,
            availableQuantity: qty,
          });
        }

        completedBatchIncrements.push({
          batchId: batchDoc._id,
          batchNumber: batchNo,
          productId: product._id,
          productName: product.name,
          addedQty: qty,
          previousStock,
          newStock: previousStock + qty,
          isNew: isNewBatch,
          purchasePrice
        });

        processedItems.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          batchNumber: batchNo,
          expiryDate,
          purchasePrice,
          quantity: qty,
          lineTotal,
          batch: batchDoc._id
        });
      }
    } catch (err) {
      // ⚠️ COMPENSATING ROLLBACK: Undo any batch additions executed before error
      for (const step of completedBatchIncrements) {
        if (step.isNew) {
          await Batch.findByIdAndDelete(step.batchId);
        } else {
          await Batch.updateOne({ _id: step.batchId }, { $inc: { availableQuantity: -step.addedQty } });
        }
      }
      throw err;
    }

    // 4. Log Immutable StockMovement Audit Trail for Each Line Received
    for (const step of completedBatchIncrements) {
      await StockMovement.create({
        product: step.productId,
        batch: step.batchId,
        movementType: 'RECEIPT',
        quantity: step.addedQty,
        previousStock: step.previousStock,
        newStock: step.newStock,
        reason: `Inward stock receipt from ${resolvedSupplier.companyName} (${poNumber})`,
        reference: poNumber,
        performedBy: receivedBy
      });
    }

    // 5. Update Product Status & Recalculate Catalog Stock for each touched product
    const uniqueProductIds = [...new Set(completedBatchIncrements.map((s) => s.productId.toString()))];
    for (const pid of uniqueProductIds) {
      await inventoryService._updateProductStockStatus(pid);
    }

    // 6. Financial summary
    const cleanSubtotal = Math.round(calculatedSubtotal * 100) / 100;
    const taxAmount = 0;
    const grandTotal = cleanSubtotal;

    // 7. Persist Authoritative Purchase Order Document
    const purchase = await purchaseRepository.create({
      poNumber,
      idempotencyKey: idempotencyKey?.trim() || undefined,
      supplier: resolvedSupplier._id,
      supplierName: resolvedSupplier.companyName,
      invoiceReference: invoiceReference.trim(),
      items: processedItems,
      itemsCount: processedItems.length,
      totalQuantity: totalQtyReceived,
      subtotal: cleanSubtotal,
      taxAmount,
      taxPercent: 0,
      grandTotal,
      receivingStatus: 'Received',
      paymentStatus,
      receivedBy,
      notes
    });

    // 8. Update Supplier Stats
    await Supplier.findByIdAndUpdate(resolvedSupplier._id, {
      $inc: { totalPurchases: grandTotal, totalOrders: 1 }
    });

    return {
      purchase,
      isDuplicate: false,
      message: `Stock receipt ${poNumber} processed successfully. ${totalQtyReceived} units added across ${processedItems.length} batches.`
    };
  }

  async getAllPurchases(query) {
    return await purchaseRepository.findAll(query);
  }

  async getPurchaseById(id) {
    const purchase = await purchaseRepository.findById(id);
    if (!purchase) {
      throw ApiError.notFound(`Purchase Order with ID ${id} not found.`);
    }
    return purchase;
  }
}

export const purchaseService = new PurchaseService();
