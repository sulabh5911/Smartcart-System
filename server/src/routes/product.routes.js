import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { validateCreateProduct, validateUpdateProduct } from '../validators/product.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Product CRUD Routes with RBAC
// View products: Admin, Manager, Cashier (Cashier needs to read products for barcode scanning & pricing)
router.get('/', authenticate, authorize('admin', 'manager', 'cashier'), productController.getProducts);
router.get('/barcode', authenticate, authorize('admin', 'manager', 'cashier'), productController.getProductByBarcode);
router.get('/:id', authenticate, authorize('admin', 'manager', 'cashier'), productController.getProductById);

// Modify products: Admin and Manager only
router.post('/', authenticate, authorize('admin', 'manager'), validateCreateProduct, productController.createProduct);
router.patch('/:id', authenticate, authorize('admin', 'manager'), validateUpdateProduct, productController.updateProduct);
router.put('/:id', authenticate, authorize('admin', 'manager'), validateUpdateProduct, productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin', 'manager'), productController.deleteProduct);

export default router;
