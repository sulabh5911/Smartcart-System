import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Customer lookup & creation during checkout: Admin, Manager, Cashier
router.get('/', authenticate, authorize('admin', 'manager', 'cashier'), customerController.getCustomers);
router.get('/:id', authenticate, authorize('admin', 'manager', 'cashier'), customerController.getCustomerById);
router.get('/:id/invoices', authenticate, authorize('admin', 'manager', 'cashier'), customerController.getCustomerInvoices);
router.post('/', authenticate, authorize('admin', 'manager', 'cashier'), customerController.createCustomer);

// Customer profile update: Admin and Manager only
router.put('/:id', authenticate, authorize('admin', 'manager'), customerController.updateCustomer);

export default router;
