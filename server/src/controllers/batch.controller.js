import { batchRepository } from '../repositories/batch.repository.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class BatchController {
  getExpiringBatches = asyncHandler(async (req, res) => {
    const batches = await batchRepository.findExpiringSoon(req.query);
    return ApiResponse.success(res, batches, `Expiring batches fetched (${batches.length} items)`);
  });

  getBatchesByProduct = asyncHandler(async (req, res) => {
    const batches = await batchRepository.findByProduct(req.params.productId);
    return ApiResponse.success(res, batches, 'Batches fetched for product');
  });

  createBatch = asyncHandler(async (req, res) => {
    const batch = await batchRepository.create(req.body);
    return ApiResponse.created(res, batch, 'Inventory batch recorded successfully');
  });
}

export const batchController = new BatchController();
