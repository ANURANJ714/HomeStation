import express from 'express';
import { verifyAdmin } from '../../middlewares/adminAuth.js';
import { getAdminDashboard, updateBannerTextHandler } from '../../controllers/admin/adminDashboardController.js';

const router = express.Router();

router.get('/dashboard', verifyAdmin, getAdminDashboard);
router.patch('/dashboard/banner', verifyAdmin, updateBannerTextHandler);

export default router;