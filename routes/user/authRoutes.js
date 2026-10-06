import express from 'express';
import passport from 'passport';
import { loadLogin, processLogin, loadRegister, processRegister, loadOtpPage, 
         verifyOtp, loadForgotPassword, processForgotPassword, loadResetPassword, processResetPassword,
         resendOtp } from '../../controllers/user/authController.js'; 

const router = express.Router();

router.get('/login', loadLogin);
router.post('/login', processLogin);

router.get('/register', loadRegister);
router.post('/register', processRegister);

router.get('/verify-otp', loadOtpPage);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

router.get('/forgot-password', loadForgotPassword);
router.post('/forgot-password', processForgotPassword);

router.get('/reset-password', loadResetPassword);
router.patch('/reset-password', processResetPassword);

router.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/user/login' }),
    (req, res) => {
        if(req.user && req.user.isNewRegistration){
            res.redirect('/user/profile');
        }else{
            res.redirect('/home');
        }
    }
);

export default router;