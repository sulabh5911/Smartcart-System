import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// All staff user management routes require Admin privileges
router.use(authenticate, authorize('admin'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.patch('/:id/status', userController.toggleStatus);
router.post('/:id/reset-password', userController.resetPassword);

export default router;
