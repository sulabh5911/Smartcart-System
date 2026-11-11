import { Router } from 'express';
import { saleController } from '../controllers/sale.controller.js';
import { validateCheckout } from '../validators/sale.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// All sales routes require authentication
// Cashiers, Managers, and Admins can all ring up sales and search invoices
router.use(authenticate, authorize('admin', 'manager', 'cashier'));

// POST /api/sales/checkout (Complete POS Checkout)
router.post('/checkout', validateCheckout, saleController.checkout);

// GET /api/sales (Paginated Sales History with filters)
router.get('/', saleController.getSales);

// GET /api/sales/invoice/:invoiceNumber (Get sale by invoice number for reprinting)
router.get('/invoice/:invoiceNumber', saleController.getSaleByInvoiceNumber);

// GET /api/sales/:id (Get sale by ID)
router.get('/:id', saleController.getSaleById);

export default router;
