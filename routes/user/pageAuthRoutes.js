import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { noCache } from '../../middlewares/cache.js';
import { loadCartPage, changeQuantityController, removeCartItemController } from '../../controllers/user/cartController.js';

const router = express.Router();

router.use(noCache);

router.get('/cart', ensureAuthenticated, loadCartPage);
router.post('/cart/change-quantity', ensureAuthenticated, changeQuantityController);
router.post('/cart/remove-item', ensureAuthenticated, removeCartItemController);

export default router;