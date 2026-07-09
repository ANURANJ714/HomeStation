import express from 'express';
import { checkOptionalAuth } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { loadCategoryPage } from '../../controllers/user/userProductController.js';
import {loadHomePage} from '../../controllers/user/pageController.js';
import { toggleWishlistItem } from '../../controllers/user/wishlistController.js';
import { addToCartController } from '../../controllers/user/cartController.js';

const router = express.Router();

router.use(checkOptionalAuth);
router.use(noCache);

router.get('/', loadHomePage);
router.get('/home', loadHomePage);

router.get('/products', loadCategoryPage);

router.post('/wishlist/add', toggleWishlistItem);
router.post('/cart/add', addToCartController);


export default router;