import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { loadUserOrdersPage, loadUserOrderDetailPage, loadInvoicePage } from '../../controllers/user/orderController.js';

const router = express.Router();

router.get('/orders', ensureAuthenticated, loadUserOrdersPage);
router.get('/orders/detail/:orderId', ensureAuthenticated, loadUserOrderDetailPage);
router.get('/orders/invoice/:orderId', ensureAuthenticated, loadInvoicePage);

export default router;