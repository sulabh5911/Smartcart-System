import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { validateReceiveStock, validateAdjustStock } from '../validators/inventory.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// 1. Inventory Summary & Valuation (Admin & Manager only)
router.get('/summary', authenticate, authorize('admin', 'manager'), inventoryController.getSummary);

// 2. Batches list (Admin, Manager, Cashier - Cashier needs to see stock level & batches)
router.get('/batches', authenticate, authorize('admin', 'manager', 'cashier'), inventoryController.getBatches);

// 3. Stock Receiving (Admin & Manager only)
router.post('/receive', authenticate, authorize('admin', 'manager'), validateReceiveStock, inventoryController.receiveStock);

// 4. Authorized Stock Adjustment (Damage, Spoilage, Discrepancy - Admin & Manager only)
router.post('/adjust', authenticate, authorize('admin', 'manager'), validateAdjustStock, inventoryController.adjustStock);

// 5. Stock Movements Audit Trail (Admin & Manager only)
router.get('/movements', authenticate, authorize('admin', 'manager'), inventoryController.getMovements);

// 6. Product Soft-Archive & Unarchive (Admin & Manager only)
router.post('/products/:id/archive', authenticate, authorize('admin', 'manager'), inventoryController.archiveProduct);
router.post('/products/:id/unarchive', authenticate, authorize('admin', 'manager'), inventoryController.unarchiveProduct);

export default router;
