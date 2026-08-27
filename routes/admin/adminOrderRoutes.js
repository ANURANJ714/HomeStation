import express from 'express';
import { verifyAdmin  } from '../../middlewares/adminAuth.js';
import { loadOrdersPage, updateOrderStatus, loadViewOrderPage } from '../../controllers/admin/adminOrderController.js';

const router = express.Router();

router.get('/orders', verifyAdmin, loadOrdersPage);
router.get('/orders/:orderId', verifyAdmin, loadViewOrderPage);
router.patch('/orders/status', verifyAdmin, updateOrderStatus);

export default router;