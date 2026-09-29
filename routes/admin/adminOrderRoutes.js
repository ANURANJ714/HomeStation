import express from 'express';
import { verifyAdmin  } from '../../middlewares/adminAuth.js';
import { loadOrdersPage, updateOrderStatus, loadViewOrderPage, handleReturnRequest } from '../../controllers/admin/adminOrderController.js';

const router = express.Router();

router.get('/orders', verifyAdmin, loadOrdersPage);
router.get('/orders/:orderId', verifyAdmin, loadViewOrderPage);
router.patch('/orders/status', verifyAdmin, updateOrderStatus);
router.patch('/orders/return-decision', verifyAdmin, handleReturnRequest);

export default router;