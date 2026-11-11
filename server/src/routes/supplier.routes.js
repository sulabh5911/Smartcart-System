import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Supplier management: Admin and Manager only
router.use(authenticate, authorize('admin', 'manager'));

router.get('/', supplierController.getSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);

export default router;
