import { inventoryService } from '../services/inventory.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Inventory Controller
 * Handles HTTP endpoints for stock valuation, batches, receipts, adjustments, and movements.
 */
class InventoryController {
  // GET /api/inventory/summary
  getSummary = asyncHandler(async (req, res) => {
    const summary = await inventoryService.getSummary();
    return ApiResponse.success(res, summary, 'Inventory valuation and summary fetched successfully');
  });

  // GET /api/inventory/batches
  getBatches = asyncHandler(async (req, res) => {
    const result = await inventoryService.getBatches(req.query);
    return ApiResponse.success(
      res,
      result.batches,
      `Inventory batches fetched successfully (${result.batches.length} items)`,
      200,
      result.pagination
    );
  });

  // POST /api/inventory/receive
  receiveStock = asyncHandler(async (req, res) => {
    const result = await inventoryService.receiveStock(req.body);
    return ApiResponse.created(
      res,
      result,
      `Stock received successfully for batch ${result.batch.batchNumber}`
    );
  });

  // POST /api/inventory/adjust
  adjustStock = asyncHandler(async (req, res) => {
    const result = await inventoryService.adjustStock(req.body);
    return ApiResponse.success(
      res,
      result,
      `Stock adjustment recorded successfully for batch ${result.batch.batchNumber}`
    );
  });

  // GET /api/inventory/movements
  getMovements = asyncHandler(async (req, res) => {
    const result = await inventoryService.getMovements(req.query);
    return ApiResponse.success(
      res,
      result.movements,
      `Stock audit movements fetched successfully (${result.movements.length} logs)`,
      200,
      result.pagination
    );
  });

  // POST /api/inventory/products/:id/archive
  archiveProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, performedBy } = req.body;
    const archived = await inventoryService.archiveProduct(id, reason, performedBy);
    return ApiResponse.success(
      res,
      archived,
      `Product "${archived.name}" archived successfully. Historical records preserved.`
    );
  });

  // POST /api/inventory/products/:id/unarchive
  unarchiveProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { performedBy } = req.body;
    const unarchived = await inventoryService.unarchiveProduct(id, performedBy);
    return ApiResponse.success(
      res,
      unarchived,
      `Product "${unarchived.name}" unarchived and restored to active catalog.`
    );
  });
}

export const inventoryController = new InventoryController();
