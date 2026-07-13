import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { noCache } from '../../middlewares/cache.js';
import { loadCartPage, changeQuantityController, removeCartItemController } from '../../controllers/user/cartController.js';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(noCache);

router.get('/cart', loadCartPage);
router.post('/cart/change-quantity', changeQuantityController);
router.post('/cart/remove-item', removeCartItemController);

export default router;