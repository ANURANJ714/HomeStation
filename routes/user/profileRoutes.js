import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import {noCache} from '../../middlewares/cache.js';
import { upload } from '../../config/cloudinary.js';
import { getProfile, updateProfile, updatePassword, logoutUser } from '../../controllers/user/profileController.js';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(noCache);

router.get('/profile', getProfile);
router.patch('/profile', upload.single('profileImage'), updateProfile);
router.patch('/password', updatePassword);
router.post('/logout', logoutUser);

export default router;