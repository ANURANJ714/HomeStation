import express from 'express';
import { verifyAdmin } from '../../middlewares/adminAuth.js';
import { loadCouponsPage, createCoupon, editCoupon, toggleStatus, deleteCoupon } from '../../controllers/admin/adminCouponController.js';

const router = express.Router();

router.get('/', verifyAdmin, loadCouponsPage);
router.post('/create', verifyAdmin, createCoupon);
router.patch('/edit/:id', verifyAdmin, editCoupon);
router.patch('/toggle-status/:id', verifyAdmin, toggleStatus);
router.delete('/delete/:id', verifyAdmin, deleteCoupon);

export default router;