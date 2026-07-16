import express from 'express';
import { checkOptionalAuth } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { loadProductsCatalogPage, loadProductDetailViewPage, executeCatalogSearchPage } from '../../controllers/user/userProductController.js';
import { loadHomePage, loadContactPage } from '../../controllers/user/pageController.js';
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
router.get('/search', executeCatalogSearchPage);

router.get('/contact', loadContactPage);


export default router;