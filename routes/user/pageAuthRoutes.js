import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { noCache } from '../../middlewares/cache.js';
import { loadCartPage, changeQuantityController, removeCartItemController, applyCouponController} from '../../controllers/user/cartController.js';
import { postCartItems } from '../../controllers/user/checkoutController.js';

const router = express.Router();

router.use(noCache);

router.get('/cart', ensureAuthenticated, loadCartPage);
router.patch('/cart/change-quantity', ensureAuthenticated, changeQuantityController);
router.delete('/cart/remove-item', ensureAuthenticated, removeCartItemController);
router.post('/cart/checkout', ensureAuthenticated, postCartItems);
router.post('/cart/apply-coupon', ensureAuthenticated, applyCouponController);

export default router;