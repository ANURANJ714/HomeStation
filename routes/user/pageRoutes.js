import express from 'express';
import { checkOptionalAuth } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { loadProductsCatalogPage, loadProductDetailViewPage } from '../../controllers/user/userProductController.js';
import { loadHomePage } from '../../controllers/user/pageController.js';
import { toggleWishlistItem, deleteWishlistItem } from '../../controllers/user/wishlistController.js';
import { addToCartController } from '../../controllers/user/cartController.js';

const router = express.Router();

router.use(checkOptionalAuth);
router.use(noCache);

router.get('/', loadHomePage);
router.get('/home', loadHomePage);

router.get('/products', loadProductsCatalogPage);

router.post('/wishlist/add', toggleWishlistItem);
router.post('/cart/add', addToCartController);
router.post('/wishlist/remove', deleteWishlistItem);

router.get('/products/:id', loadProductDetailViewPage);


export default router;