import { Router } from 'express';
import { batchController } from '../controllers/batch.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Batches queries: Admin, Manager, Cashier (for FEFO billing checkout & scanning)
router.get('/expiring', authenticate, authorize('admin', 'manager', 'cashier'), batchController.getExpiringBatches);
router.get('/product/:productId', authenticate, authorize('admin', 'manager', 'cashier'), batchController.getBatchesByProduct);

// Batch creation: Admin and Manager only
router.post('/', authenticate, authorize('admin', 'manager'), batchController.createBatch);

export default router;
