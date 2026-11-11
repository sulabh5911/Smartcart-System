import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// Public routes
router.post('/login', loginRateLimiter, authController.login);

// Protected routes (Require valid JWT Bearer token)
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);
router.put('/profile', authenticate, authController.updateProfile);

export default router;
