import { Router } from 'express';
import healthRoutes from './health.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import batchRoutes from './batch.routes.js';
import inventoryRoutes from './inventory.routes.js';
import customerRoutes from './customer.routes.js';
import saleRoutes from './sale.routes.js';
import supplierRoutes from './supplier.routes.js';
import purchaseRoutes from './purchase.routes.js';
import returnRoutes from './return.routes.js';
import reportRoutes from './report.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import storeSettingsRoutes from './storeSettings.routes.js';

const router = Router();

// Mount feature sub-routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/health', healthRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/batches', batchRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customerRoutes);
router.use('/sales', saleRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/returns', returnRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', storeSettingsRoutes);


export default router;
