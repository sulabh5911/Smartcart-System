import { purchaseService } from '../services/purchase.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class PurchaseController {
  receiveStock = asyncHandler(async (req, res) => {
    const result = await purchaseService.receiveStock(req.body);
    const payload = {
      purchase: result.purchase,
      isDuplicate: !!result.isDuplicate
    };
    if (result.isDuplicate) {
      return ApiResponse.success(res, payload, result.message, 200);
    }
    return ApiResponse.created(res, payload, result.message);
  });

  getPurchases = asyncHandler(async (req, res) => {
    const purchases = await purchaseService.getAllPurchases(req.query);
    return ApiResponse.success(res, purchases, `Fetched ${purchases.length} purchase receipts`);
  });

  getPurchaseById = asyncHandler(async (req, res) => {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    return ApiResponse.success(res, purchase, `Purchase receipt ${purchase.poNumber} fetched successfully`);
  });
}

export const purchaseController = new PurchaseController();
