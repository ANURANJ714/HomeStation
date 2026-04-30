import express from 'express';
import passport from 'passport';
import {forwardAuthenticated} from '../../middlewares/auth.js';
import { loadLogin, processLogin, loadRegister, processRegister, loadOtpPage, 
         verifyOtp, loadForgotPassword, processForgotPassword, loadResetPassword, processResetPassword } from '../../controllers/user/authController.js'; 

const router = express.Router();

router.get('/login', forwardAuthenticated, loadLogin);
router.post('/login', processLogin);

router.get('/register', forwardAuthenticated, loadRegister);
router.post('/register', processRegister);

router.get('/verify-otp', loadOtpPage);
router.post('/verify-otp', verifyOtp);

router.get('/forgot-password', forwardAuthenticated, loadForgotPassword);
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