import { returnService } from '../services/return.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class ReturnController {
  processReturn = asyncHandler(async (req, res) => {
    const result = await returnService.processReturn(req.body);
    const payload = {
      saleReturn: result.saleReturn,
      originalSale: result.originalSale,
      isDuplicate: !!result.isDuplicate
    };
    if (result.isDuplicate) {
      return ApiResponse.success(res, payload, result.message, 200);
    }
    return ApiResponse.created(res, payload, result.message);
  });

  getReturns = asyncHandler(async (req, res) => {
    const returns = await returnService.getAllReturns(req.query);
    return ApiResponse.success(res, returns, `Fetched ${returns.length} return audit records`);
  });

  getReturnById = asyncHandler(async (req, res) => {
    const returnRecord = await returnService.getReturnById(req.params.id);
    return ApiResponse.success(res, returnRecord, `Return record ${returnRecord.returnNumber} fetched successfully`);
  });

  getReturnsBySale = asyncHandler(async (req, res) => {
    const returns = await returnService.getReturnsBySale(req.params.saleId);
    return ApiResponse.success(res, returns, `Fetched returns for sale ID ${req.params.saleId}`);
  });
}

export const returnController = new ReturnController();
