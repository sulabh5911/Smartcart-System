import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { validateCreateCategory } from '../validators/category.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Category CRUD Routes with RBAC
// View categories: Admin, Manager, Cashier (for POS and inventory display)
router.get('/', authenticate, authorize('admin', 'manager', 'cashier'), categoryController.getCategories);
router.get('/:id', authenticate, authorize('admin', 'manager', 'cashier'), categoryController.getCategoryById);

// Modify categories: Admin and Manager only
router.post('/', authenticate, authorize('admin', 'manager'), validateCreateCategory, categoryController.createCategory);
router.patch('/:id', authenticate, authorize('admin', 'manager'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin', 'manager'), categoryController.deleteCategory);

export default router;
