import { Router } from 'express';
import { storeSettingsController } from '../controllers/storeSettings.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/', storeSettingsController.get);
router.put('/', storeSettingsController.update);

export default router;
