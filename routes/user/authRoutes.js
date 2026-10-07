import express from 'express';
import passport from 'passport';
import { forwardAuthenticated } from '../../middlewares/auth.js';
import { loadLogin, processLogin, loadRegister, processRegister, loadOtpPage, 
         verifyOtp, loadForgotPassword, processForgotPassword, loadResetPassword, processResetPassword,
         resendOtp } from '../../controllers/user/authController.js'; 
import { authLimiter, otpLimiter } from '../../middlewares/rateLimiter.js';

const router = express.Router();

router.get('/login', forwardAuthenticated, loadLogin);
router.post('/login', authLimiter, processLogin);

router.get('/register', forwardAuthenticated, loadRegister);
router.post('/register', authLimiter, processRegister);

router.get('/verify-otp', loadOtpPage);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/resend-otp', otpLimiter, resendOtp);

router.get('/forgot-password', forwardAuthenticated, loadForgotPassword);
router.post('/forgot-password', authLimiter, processForgotPassword);

router.get('/reset-password', loadResetPassword);
router.patch('/reset-password', authLimiter, processResetPassword);

router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/user/login' }),
    (req, res) => {
        if (req.user && req.user.isNewRegistration) {
            res.redirect('/user/profile');
        } else {
            res.redirect('/home');
        }
    }
);

export default router;