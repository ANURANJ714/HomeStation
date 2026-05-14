import express from 'express';
import { getAdminLogin, postAdminLogin, getAdminDashboard, postAdminLogout, 
         getForgotPassword, postForgotPassword, getVerifyOtp, postVerifyOtp, 
         resendAdminOtp, getResetPassword, patchResetPassword } from '../../controllers/admin/adminAuthController.js';
import { getUserManagement, toggleUserStatus, addUser } from '../../controllers/admin/adminUserController.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/dashboard', verifyAdmin, getAdminDashboard);
router.get('/forgot-password', getForgotPassword);
router.post('/forgot-password', postForgotPassword);
router.get('/verify-otp', getVerifyOtp);
router.post('/verify-otp', postVerifyOtp);
router.post('/resend-otp', resendAdminOtp);
router.get('/reset-password', getResetPassword);
router.patch('/reset-password', patchResetPassword);

router.get('/users', verifyAdmin, getUserManagement);
router.patch('/users/:user_id/status', verifyAdmin, toggleUserStatus);
router.post('/users', verifyAdmin, addUser);
router.post('/logout', verifyAdmin, postAdminLogout);


export default router;