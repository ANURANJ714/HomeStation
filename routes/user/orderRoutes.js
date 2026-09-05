import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { loadUserOrdersPage, loadUserOrderDetailPage, loadInvoicePage, postCancelOrder, postReturnOrder } from '../../controllers/user/orderController.js';
import { submitReview } from '../../controllers/user/reviewController.js';

const router = express.Router();

router.get('/orders', ensureAuthenticated, loadUserOrdersPage);
router.get('/orders/detail/:orderId', ensureAuthenticated, loadUserOrderDetailPage);
router.post('/orders/cancel', ensureAuthenticated, postCancelOrder);
router.post('/orders/return', ensureAuthenticated, postReturnOrder);
router.get('/orders/invoice/:orderId', ensureAuthenticated, loadInvoicePage);

router.post('/reviews', ensureAuthenticated, submitReview);

export default router;