import passport from 'passport';
import crypto from 'crypto';
import User from '../../models/User.js';
import { sendOtpEmail } from '../../services/user/emailService.js';
import bcrypt from 'bcryptjs';
import * as authService from '../../services/admin/adminAuthService.js';
import logger from '../../utils/logger.js';

export const getAdminLogin = (req, res) => {
    try {
        if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
            logger.info(`Active admin session detected for ${req.user.email}. Redirecting to dashboard.`);
            return res.redirect('/admin/dashboard');
        }

        logger.info(`Admin login page accessed from IP: ${req.ip}`);
        
        res.render('admin/adminLogin', { errorMessage: null });

    } catch (error) {
        logger.error(`Error loading admin login page: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the login page."
        });
    }
};

export const postAdminLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const validation = await authService.validateLoginInput(email, password);
        if (!validation.isValid) {
            logger.warn(`Failed admin login attempt (Validation): ${email} - ${validation.message}`);
            return res.status(400).json({ success: false, message: validation.message });
        }

        const authResult = await authService.verifyAdminCredentials(email, password);
        if (!authResult.isAuthenticated) {
            logger.warn(`Failed admin login attempt (Credentials): ${email}`);
            return res.status(401).json({ success: false, message: authResult.message });
        }

        const user = authResult.user;

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                logger.error(`Login Session Error for Admin ${email}: ${loginErr.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            req.session.save((saveErr) => {
                if (saveErr) {
                    logger.error(`Session Save Error for Admin ${email}: ${saveErr.message}`);
                    return res.status(500).json({ success: false, message: "Session error during login." });
                }

                logger.info(`Admin logged in successfully: ${email}`);

                return res.status(200).json({
                    success: true,
                    message: "Login successful! Redirecting...",
                    redirectUrl: "/admin/dashboard",
                });
            });
        });

    } catch (error) {
        logger.error(`Admin Login Controller Error for ${req.body.email}: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "Internal server error."
        });
    }
};

export const getForgotPassword = (req, res) => {
    try {
        if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
            logger.info(`Active admin session detected for ${req.user.email}. Redirecting away from forgot password page.`);
            return res.redirect('/admin/dashboard');
        }

        logger.info(`Admin forgot password page accessed from IP: ${req.ip}`);
        
        res.render('admin/forgotadminpassword');

    } catch (error) {
        logger.error(`Error loading admin forgot password page: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the page."
        });
    }
};

export const postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const clientIp = req.ip;

        const result = await authService.checkAdminExists(email);

        if (!result.isValid) {
            logger.warn(`Admin password reset blocked: Invalid email or non-admin account (${email}). IP: ${clientIp}`);
            
            return res.status(404).json({ 
                success: false, 
                message: "No admin account found with this email address." 
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        await sendOtpEmail(email, otp);

        req.session.adminResetEmail = email; 
        req.session.adminOtp = otp;
        req.session.adminOtpExpires = Date.now() + 60 * 1000; 
        req.session.adminOtpContext = 'forgot_password'; 

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during admin password reset for ${email}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }
            
            logger.info(`Admin password reset initiated. OTP sent to ${email}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "OTP sent to your registered admin email.",
                redirectUrl: "/admin/verify-otp"
            });
        });

    } catch (error) {
        logger.error(`Admin Forgot Password Error (${req.body.email}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            title: "Server Error",
            message: "Server error occurred." 
        });
    }
};

export const getVerifyOtp = (req, res) => {
    try {
        if (!req.session.adminResetEmail) {
            logger.warn(`Unauthorized or expired access attempt to admin OTP verification page. IP: ${req.ip}`);
            return res.redirect('/admin/forgot-password');
        }

        logger.info(`Admin OTP verification page accessed for email: ${req.session.adminResetEmail}. IP: ${req.ip}`);
        res.render('admin/verifyadmin-otp');

    } catch (error) {
        logger.error(`Error loading admin OTP verification page: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the page."
        });
    }
};

export const postVerifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.session.adminResetEmail;
        const clientIp = req.ip;

        if (!email || !req.session.adminOtp) {
            logger.warn(`Admin OTP verify blocked: Session expired or missing. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Session expired. Please start over." 
            });
        }

        if (Date.now() > req.session.adminOtpExpires) {
            logger.warn(`Admin OTP verify failed: OTP expired for ${email}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "OTP has expired. Please request a new one." 
            });
        }

        if (otp !== req.session.adminOtp) {
            logger.warn(`Admin OTP verify failed: Invalid OTP entered for ${email}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Invalid OTP. Please try again." 
            });
        }

        req.session.canAdminResetPassword = true;
        req.session.adminOtp = null;
        req.session.adminOtpExpires = null;

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during admin OTP verification for ${email}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`Admin OTP successfully verified for ${email}. Proceeding to password reset. IP: ${clientIp}`);

            return res.status(200).json({
                success: true,
                message: "OTP verified successfully!",
                redirectUrl: "/admin/reset-password"
            });
        });

    } catch (error) {
        logger.error(`Admin OTP Verify Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            title: "Server Error",
            message: "Server error occurred." 
        });
    }
};

export const resendAdminOtp = async (req, res) => {
    try {
        const email = req.session.adminResetEmail;
        const clientIp = req.ip;

        if (!email) {
            logger.warn(`Admin OTP resend blocked: Session expired or missing. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Session expired. Please start over." 
            });
        }

        const now = Date.now();

        if (req.session.adminOtpExpires && now < req.session.adminOtpExpires) {
            const remainingSeconds = Math.ceil((req.session.adminOtpExpires - now) / 1000);
            
            logger.warn(`Admin OTP resend blocked: Requested too soon for ${email}. Wait ${remainingSeconds}s. IP: ${clientIp}`);
            
            return res.status(429).json({
                success: false,
                message: `OTP is still valid. Please wait ${remainingSeconds} seconds before requesting a new one.`
            });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        req.session.adminOtp = newOtp;
        req.session.adminOtpExpires = now + 60 * 1000; 

        await sendOtpEmail(email, newOtp);

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during admin OTP resend for ${email}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`A new admin OTP was successfully sent to ${email}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "A new OTP has been sent to your email." 
            });
        });

    } catch (error) {
        logger.error(`Admin Resend OTP Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            title: "Server Error",
            message: "Error resending OTP." 
        });
    }
};

export const getResetPassword = (req, res) => {
    try {
        const email = req.session.adminResetEmail;
        const clientIp = req.ip;

        if (!req.session.canAdminResetPassword || !email) {
            logger.warn(`Unauthorized or out-of-sequence access attempt to admin reset password page. IP: ${clientIp}`);
            return res.redirect('/admin/forgot-password');
        }

        logger.info(`Admin password reset page accessed for email: ${email}. IP: ${clientIp}`);

        res.render('admin/resetadminpassword');

    } catch (error) {
        logger.error(`Error loading admin reset password page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the page."
        });
    }
};

export const patchResetPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;
        const email = req.session.adminResetEmail;
        const clientIp = req.ip;

        if (!email || !req.session.canAdminResetPassword) {
            logger.warn(`Admin password reset blocked: Session expired or invalid state. IP: ${clientIp}`);
            return res.status(403).json({ 
                success: false, 
                message: "Session expired. Please start over." 
            });
        }

        if (password !== confirmPassword) {
            logger.warn(`Admin password reset blocked: Passwords do not match for ${email}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Passwords do not match." 
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            logger.warn(`Admin password reset blocked: Complexity requirements failed for ${email}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Password does not meet security requirements." 
            });
        }

        const result = await authService.updateAdminPassword(email, password);

        if (!result.isUpdated) {
            logger.warn(`Admin password reset failed: Account not found or not Admin (${email}). IP: ${clientIp}`);
            return res.status(404).json({ success: false, message: "Admin account not found." });
        }

        req.session.canAdminResetPassword = false;
        req.session.adminResetEmail = null;

        req.logIn(result.user, (err) => {
            if (err) {
                logger.error(`Admin auto-login failed after password reset for ${email}: ${err.message}`);
                
                return res.status(200).json({ 
                    success: true, 
                    message: "Password updated successfully! Please log in.",
                    redirectUrl: '/admin/login' 
                });
            }
            
            logger.info(`Admin password successfully reset and auto-logged in for ${email}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "Password updated successfully!",
                redirectUrl: '/admin/dashboard'
            });
        });

    } catch (error) {
        logger.error(`Admin Reset Password Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            title: "Server Error", 
            message: "Server error occurred." 
        });
    }
};

export const postAdminLogout = (req, res, next) => {
    try {
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        const clientIp = req.ip;

        req.logout((err) => {
            if (err) {
                logger.error(`Admin logout error for ${adminEmail} (IP: ${clientIp}): ${err.message}`);
                return res.status(500).json({ 
                    success: false, 
                    message: "An error occurred during the logout process." 
                });
            }
            
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    logger.error(`Session destruction error during logout for ${adminEmail}: ${destroyErr.message}`);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Failed to completely destroy session." 
                    });
                }
                
                res.clearCookie('admin_session'); 
                
                logger.info(`Admin (${adminEmail}) successfully logged out. IP: ${clientIp}`);
                
                return res.status(200).json({
                    success: true,
                    message: "Logged out successfully.",
                    redirectUrl: '/admin/login'
                });
            });
        });

    } catch (error) {
        logger.error(`Unexpected error during admin logout (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "An internal server error occurred." 
        });
    }
};