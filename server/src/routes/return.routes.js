import { Router } from 'express';
import { returnController } from '../controllers/return.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Returns workflow: Admin, Manager, Cashier
router.use(authenticate, authorize('admin', 'manager', 'cashier'));

router.post('/', returnController.processReturn);
router.get('/', returnController.getReturns);
router.get('/:id', returnController.getReturnById);
router.get('/sale/:saleId', returnController.getReturnsBySale);

export default router;
