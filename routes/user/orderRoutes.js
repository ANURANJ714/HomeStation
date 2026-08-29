import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { loadUserOrdersPage, loadUserOrderDetailPage, loadInvoicePage, postCancelOrder } from '../../controllers/user/orderController.js';

const router = express.Router();

router.get('/orders', ensureAuthenticated, loadUserOrdersPage);
router.get('/orders/detail/:orderId', ensureAuthenticated, loadUserOrderDetailPage);
router.post('/orders/cancel', ensureAuthenticated, postCancelOrder);
router.get('/orders/invoice/:orderId', ensureAuthenticated, loadInvoicePage);

export default router;