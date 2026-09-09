import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { upload } from '../../config/cloudinary.js';
import { getProfile, updateProfile, updatePassword, logoutUser,
         loadVerifyEmailPage, verifyEmailChange, resendEmailOtp } from '../../controllers/user/profileController.js';
import { loadWishlistPage } from '../../controllers/user/wishlistController.js';
import { loadWalletPage } from '../../controllers/user/walletController.js';

const router = express.Router();

router.use(noCache);

router.get('/profile', ensureAuthenticated, getProfile);
router.patch('/profile', ensureAuthenticated, upload.single('profileImage'), updateProfile);
router.patch('/password', ensureAuthenticated, updatePassword);
router.get('/verify-email', ensureAuthenticated, loadVerifyEmailPage);
router.post('/verify-email-change', ensureAuthenticated, verifyEmailChange);
router.post('/resend-email-otp', ensureAuthenticated, resendEmailOtp);

router.get('/wishlist', ensureAuthenticated, loadWishlistPage);

router.get('/wallet', ensureAuthenticated, loadWalletPage);

router.post('/logout', logoutUser);

export default router;