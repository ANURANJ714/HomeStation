import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { upload } from '../../config/cloudinary.js';
import { getProfile, updateProfile, updatePassword, logoutUser,
         loadVerifyEmailPage, verifyEmailChange, resendEmailOtp } from '../../controllers/user/profileController.js';
import {loadWishlistPage} from '../../controllers/user/wishlistController.js';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(noCache);

router.get('/profile', getProfile);
router.patch('/profile', upload.single('profileImage'), updateProfile);
router.patch('/password', updatePassword);
router.get('/verify-email', loadVerifyEmailPage);
router.post('/verify-email-change', verifyEmailChange);
router.post('/resend-email-otp', resendEmailOtp);
router.get('/wishlist', loadWishlistPage);

router.post('/logout', logoutUser);

export default router;