import express from 'express';
import { checkOptionalAuth } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { loadProductsCatalogPage, loadProductDetailViewPage, executeCatalogSearchPage, loadTopDealsPage, loadBestsellersPage } from '../../controllers/user/userProductController.js';
import { loadHomePage, loadContactPage, submitContactInquiryForm, loadPrivacyPolicyPage } from '../../controllers/user/pageController.js';
import { toggleWishlistItem, deleteWishlistItem } from '../../controllers/user/wishlistController.js';
import { addToCartController } from '../../controllers/user/cartController.js';

const router = express.Router();

router.use(noCache);

router.get('/', checkOptionalAuth, loadHomePage);
router.get('/home', checkOptionalAuth, loadHomePage);

router.get('/products', checkOptionalAuth, loadProductsCatalogPage);

router.post('/wishlist/add', checkOptionalAuth, toggleWishlistItem);
router.post('/cart/add', checkOptionalAuth, addToCartController);
router.post('/wishlist/remove', checkOptionalAuth, deleteWishlistItem);

router.get('/products/:id', checkOptionalAuth, loadProductDetailViewPage);
router.get('/search', checkOptionalAuth, executeCatalogSearchPage);

router.get('/contact', checkOptionalAuth, loadContactPage);
router.post('/contact/submit', checkOptionalAuth, submitContactInquiryForm);

router.get('/deals', checkOptionalAuth, loadTopDealsPage);
router.get('/bestsellers', checkOptionalAuth, loadBestsellersPage);
router.get('/privacy-policy', checkOptionalAuth, loadPrivacyPolicyPage);


export default router;