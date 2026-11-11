import mongoose from 'mongoose';
import { SaleReturn } from '../models/SaleReturn.js';
import { Sale } from '../models/Sale.js';
import { Batch } from '../models/Batch.js';
import { Customer } from '../models/Customer.js';
import { StockMovement } from '../models/StockMovement.js';
import { returnRepository } from '../repositories/return.repository.js';
import { inventoryService } from './inventory.service.js';
import { ApiError } from '../utils/ApiError.js';

export class ReturnService {
  /**
   * Process Customer Return & Refund
   * 
   * Highlights:
   * 1. Duplicate Request Protection via idempotencyKey.
   * 2. Full and Partial Returns strictly linked to original invoice.
   * 3. Exact quantity validation: cannot return more than purchased minus prior returns.
   * 4. Inspection Guard: Restocks ONLY eligible, inspected, unexpired products.
   * 5. Damaged, spoiled, or expired returned goods are quarantined without polluting healthy stock.
   * 6. Preserves audit history: original sale remains intact with updated returnStatus & totalRefunded.
   * 7. Recalculates customer spending and loyalty points.
   */
  async processReturn({
    saleId,
    invoiceNumber,
    items = [],
    refundMethod = 'Cash',
    processedBy = 'Admin',
    notes = '',
    idempotencyKey = null
  }) {
    // 1. Idempotency Check (Duplicate refund protection)
    if (idempotencyKey && idempotencyKey.trim() !== '') {
      const existingReturn = await returnRepository.findByIdempotencyKey(idempotencyKey.trim());
      if (existingReturn) {
        return {
          saleReturn: existingReturn,
          isDuplicate: true,
          message: `Idempotent response: Returning already processed return record "${existingReturn.returnNumber}". No duplicate refund issued.`
        };
      }
    }

    // 2. Fetch Original Sale Document
    let sale = null;
    if (saleId && mongoose.Types.ObjectId.isValid(saleId)) {
      sale = await Sale.findById(saleId);
    } else if (invoiceNumber && invoiceNumber.trim() !== '') {
      sale = await Sale.findOne({ invoiceNumber: invoiceNumber.trim().toUpperCase() });
    }

    if (!sale) {
      throw ApiError.notFound(`Original invoice "${invoiceNumber || saleId}" not found.`);
    }

    if (sale.status === 'Cancelled') {
      throw ApiError.badRequest(`Invoice "${sale.invoiceNumber}" is cancelled and cannot accept returns.`);
    }

    // 3. Validate Items Array
    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('At least one item is required to process a return.');
    }

    const returnNumber = await returnRepository.generateNextReturnNumber();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedReturnItems = [];
    let totalRefundAmount = 0;
    let totalReturnedQty = 0;

    // Track state modifications for compensating rollback on unexpected error
    const completedRestocks = []; // Track [{ batchId, restockedQty }]

    try {
      for (const retItem of items) {
        const pid = retItem.productId || retItem.product;
        if (!pid) {
          throw ApiError.badRequest('Missing product ID in return item.');
        }

        // Find matching item line in original invoice
        const originalLineItem = sale.items.find(
          (it) => it.product.toString() === pid.toString()
        );

        if (!originalLineItem) {
          throw ApiError.badRequest(`Product was not part of original invoice ${sale.invoiceNumber}.`);
        }

        const returnQty = parseInt(retItem.returnQuantity, 10);
        if (isNaN(returnQty) || returnQty <= 0) {
          throw ApiError.badRequest(`Return quantity for "${originalLineItem.name}" must be greater than 0.`);
        }

        const alreadyReturned = originalLineItem.returnedQuantity || 0;
        const remainingEligibleQty = originalLineItem.quantity - alreadyReturned;

        if (returnQty > remainingEligibleQty) {
          throw ApiError.badRequest(
            `Cannot return ${returnQty} units of "${originalLineItem.name}". ` +
            `Originally purchased: ${originalLineItem.quantity}, Already returned: ${alreadyReturned}, Eligible: ${remainingEligibleQty}.`
          );
        }

        // Calculate line refund based on trusted unit price from original sale
        const unitRate = originalLineItem.unitPrice;
        const lineRefund = Math.round(unitRate * returnQty * 100) / 100;
        totalRefundAmount += lineRefund;
        totalReturnedQty += returnQty;

        // Resolve condition: 'Resellable', 'Damaged', 'Expired', 'Quarantined'
        const condition = ['Resellable', 'Damaged', 'Expired', 'Quarantined'].includes(retItem.condition)
          ? retItem.condition
          : 'Resellable';

        // Find primary batch originally deducted for this item
        const originalBatchInfo = originalLineItem.batchesDeducted?.[0] || null;
        let batchDoc = null;
        if (originalBatchInfo?.batchId) {
          batchDoc = await Batch.findById(originalBatchInfo.batchId);
        }

        // Inspection & Shelf-Life Safety Check:
        // Restock ONLY if:
        // 1. Condition is strictly 'Resellable'
        // 2. Batch exists and expiry date has NOT passed!
        let restocked = false;
        let restockBatchId = null;
        let restockBatchNumber = originalBatchInfo?.batchNumber || '---';

        if (condition === 'Resellable' && batchDoc) {
          const expDate = new Date(batchDoc.expiryDate);
          expDate.setHours(0, 0, 0, 0);

          if (expDate.getTime() > today.getTime()) {
            // Unexpired & Good Condition -> RESTOCK HEALTHY INVENTORY
            await Batch.updateOne(
              { _id: batchDoc._id },
              { $inc: { availableQuantity: returnQty } }
            );
            restocked = true;
            restockBatchId = batchDoc._id;
            completedRestocks.push({ batchId: batchDoc._id, restockedQty: returnQty });
          } else {
            // Expired while in customer possession -> DO NOT RESTOCK INTO HEALTHY INVENTORY!
            restocked = false;
          }
        }

        processedReturnItems.push({
          product: originalLineItem.product,
          name: originalLineItem.name,
          sku: originalLineItem.sku,
          originalQuantity: originalLineItem.quantity,
          alreadyReturnedQuantity: alreadyReturned,
          returnQuantity: returnQty,
          unitPrice: unitRate,
          lineRefund,
          batch: restockBatchId,
          batchNumber: restockBatchNumber,
          condition,
          restocked,
          reason: retItem.reason?.trim() || 'Customer return'
        });

        // Update returnedQuantity count on original invoice line item
        originalLineItem.returnedQuantity = alreadyReturned + returnQty;
      }
    } catch (err) {
      // ⚠️ COMPENSATING ROLLBACK: Restore batch quantities if error occurred
      for (const rb of completedRestocks) {
        await Batch.updateOne({ _id: rb.batchId }, { $inc: { availableQuantity: -rb.restockedQty } });
      }
      throw err;
    }

    // 4. Log Immutable Stock Movements
    for (const item of processedReturnItems) {
      if (item.restocked && item.batch) {
        const batch = await Batch.findById(item.batch);
        const newStock = batch?.availableQuantity || item.returnQuantity;
        const prevStock = Math.max(0, newStock - item.returnQuantity);

        await StockMovement.create({
          product: item.product,
          batch: item.batch,
          movementType: 'RETURN',
          quantity: item.returnQuantity,
          previousStock: prevStock,
          newStock,
          reason: `Customer return restocked to batch ${item.batchNumber} (${returnNumber})`,
          reference: returnNumber,
          performedBy: processedBy
        });
      } else {
        // Damaged, Quarantined, or Expired: Log write-off / quarantine audit without adding to healthy inventory
        await StockMovement.create({
          product: item.product,
          batch: item.batch || null,
          movementType: 'DAMAGE_WRITE_OFF',
          quantity: 0, // 0 change to available inventory because it was quarantined
          previousStock: 0,
          newStock: 0,
          reason: `Customer return quarantined - ${item.condition} goods (Return #${returnNumber})`,
          reference: returnNumber,
          performedBy: processedBy
        });
      }

      // Recalculate Product Stock & Status
      await inventoryService._updateProductStockStatus(item.product.toString());
    }

    // 5. Update Original Sale Record Status & Refunds
    sale.totalRefunded = Math.round(((sale.totalRefunded || 0) + totalRefundAmount) * 100) / 100;

    // Check if all line items are fully returned
    const allItemsFullyReturned = sale.items.every(
      (it) => (it.returnedQuantity || 0) >= it.quantity
    );

    if (allItemsFullyReturned) {
      sale.returnStatus = 'Full';
      sale.status = 'Refunded';
    } else {
      sale.returnStatus = 'Partial';
    }
    await sale.save();

    // 6. Update Customer Spending and Loyalty Points if registered
    if (sale.customer && mongoose.Types.ObjectId.isValid(sale.customer)) {
      const pointDeduction = Math.floor(totalRefundAmount / 100);
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: {
          totalSpent: -totalRefundAmount,
          loyaltyPoints: -pointDeduction
        }
      });
    }

    // 7. Persist Authoritative SaleReturn Record
    const saleReturn = await returnRepository.create({
      returnNumber,
      idempotencyKey: idempotencyKey?.trim() || undefined,
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer || null,
      customerName: sale.customerName || 'Walk-in Customer',
      items: processedReturnItems,
      totalReturnedQty,
      refundAmount: Math.round(totalRefundAmount * 100) / 100,
      refundMethod: ['Cash', 'UPI', 'Store Credit'].includes(refundMethod) ? refundMethod : 'Cash',
      status: 'Completed',
      processedBy,
      notes
    });

    return {
      saleReturn,
      originalSale: sale,
      isDuplicate: false,
      message: `Return ${returnNumber} processed successfully. Refund amount: ₹${totalRefundAmount.toFixed(2)} via ${refundMethod}.`
    };
  }

  async getAllReturns(query) {
    return await returnRepository.findAll(query);
  }

  async getReturnById(id) {
    const ret = await returnRepository.findById(id);
    if (!ret) {
      throw ApiError.notFound(`Return record with ID ${id} not found.`);
    }
    return ret;
  }

  async getReturnsBySale(saleId) {
    return await returnRepository.findBySaleId(saleId);
  }
}

export const returnService = new ReturnService();
