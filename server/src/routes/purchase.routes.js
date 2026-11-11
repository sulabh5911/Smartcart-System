import { Router } from 'express';
import { purchaseController } from '../controllers/purchase.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Inward stock procurement and PO history: Admin and Manager only
router.use(authenticate, authorize('admin', 'manager'));

router.post('/receive', purchaseController.receiveStock);
router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchaseById);

export default router;
