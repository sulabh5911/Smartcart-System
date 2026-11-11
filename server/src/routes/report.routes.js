import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Store financial reports & analytics: Admin and Manager only
// Cashiers attempting to access gross profit / margins are blocked with HTTP 403 Forbidden
router.use(authenticate, authorize('admin', 'manager'));

router.get('/dashboard', reportController.getDashboardMetrics);
router.get('/analytics', reportController.getDetailedAnalytics);
router.get('/export/csv', reportController.exportCSV);

export default router;
