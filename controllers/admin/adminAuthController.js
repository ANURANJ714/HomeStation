import passport from 'passport';
import crypto from 'crypto';
import User from '../../models/User.js';
import { sendOtpEmail } from '../../services/user/emailService.js';
import bcrypt from 'bcryptjs';

export const getAdminLogin = (req, res) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/adminLogin', { errorMessage: null });
};

export const postAdminLogin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error("Passport Auth Error:", err);
            return res.status(500).json({ success: false, message: "Server error occurred." });
        }
        
        if (!user) {
            const errorMessage = (info && info.message) ? info.message : "Invalid email or password.";
            return res.status(401).json({ success: false, message: errorMessage });
        }
        
        if (user.role !== 'Admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied. You do not have administrator privileges." 
            });
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }
            
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error("Session save error:", saveErr);
                    return res.status(500).json({ success: false, message: "Session error during login." });
                }
                
                return res.status(200).json({
                    success: true,
                    message: "Login successful! Redirecting...",
                    redirectUrl: "/admin/dashboard"
                });
            });
        });
    })(req, res, next);
};

export const getAdminDashboard = (req, res) => {
    res.render('admin/dashboard', { admin: req.user }); 
};

export const getForgotPassword = (req, res) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/forgotadminpassword');
};

export const postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user || user.role !== 'Admin') {
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
                console.error("Session Save Error:", err);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }
            
            return res.status(200).json({ 
                success: true, 
                message: "OTP sent to your registered admin email.",
                redirectUrl: "/admin/verify-otp"
            });
        });

    } catch (error) {
        console.error("Admin Forgot Password Error:", error);
        return res.status(500).json({ success: false, message: "Server error occurred." });
    }
};

export const getVerifyOtp = (req, res) => {
    if (!req.session.adminResetEmail) {
        return res.redirect('/admin/forgot-password');
    }
    res.render('admin/verifyadmin-otp');
};

export const postVerifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.session.adminResetEmail || !req.session.adminOtp) {
            return res.status(400).json({ success: false, message: "Session expired. Please start over." });
        }

        if (Date.now() > req.session.adminOtpExpires) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (otp !== req.session.adminOtp) {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }

        req.session.canAdminResetPassword = true;
        req.session.adminOtp = null;
        req.session.adminOtpExpires = null;

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully!",
            redirectUrl: "/admin/reset-password"
        });

    } catch (error) {
        console.error("Admin OTP Verify Error:", error);
        return res.status(500).json({ success: false, message: "Server error occurred." });
    }
};

export const resendAdminOtp = async (req, res) => {
    try {
        if (!req.session.adminResetEmail) {
            return res.status(400).json({ success: false, message: "Session expired. Please start over." });
        }

        const now = Date.now();
        
        if (req.session.adminOtpExpires && now < req.session.adminOtpExpires) {
            const remainingSeconds = Math.ceil((req.session.adminOtpExpires - now) / 1000);
            return res.status(429).json({
                success: false,
                message: `OTP is still valid. Please wait ${remainingSeconds} seconds before requesting a new one.`
            });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        req.session.adminOtp = newOtp;
        req.session.adminOtpExpires = now + 60 * 1000; 

        await sendOtpEmail(req.session.adminResetEmail, newOtp);
        return res.status(200).json({ success: true, message: "A new OTP has been sent to your email." });

    } catch (error) {
        console.error("Admin Resend OTP Error:", error);
        return res.status(500).json({ success: false, message: "Error resending OTP." });
    }
};

export const getResetPassword = (req, res) => {
    if (!req.session.canAdminResetPassword || !req.session.adminResetEmail) {
        return res.redirect('/admin/forgot-password');
    }
    res.render('admin/resetadminpassword');
};

export const patchResetPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;
        const email = req.session.adminResetEmail;

        if (!email || !req.session.canAdminResetPassword) {
            return res.status(403).json({ success: false, message: "Session expired. Please start over." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ 
                success: false, 
                message: "Password does not meet security requirements." 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.findOneAndUpdate(
            { email: email, role: 'Admin' }, 
            { passwordHash: hashedPassword },
            { returnDocument: 'after' }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "Admin account not found." });
        }

        req.session.canAdminResetPassword = false;
        req.session.adminResetEmail = null;

        req.logIn(user, (err) => {
            if (err) {
                return res.status(200).json({ 
                    success: true, 
                    message: "Password updated successfully! Please log in.",
                    redirectUrl: '/admin/login' 
                });
            }
            
            return res.status(200).json({ 
                success: true, 
                message: "Password updated successfully!",
                redirectUrl: '/admin/dashboard'
            });
        });

    } catch (error) {
        console.error("Admin Reset Password Error:", error);
        res.status(500).json({ success: false, message: "Server error occurred." });
    }
};

export const postAdminLogout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            console.error("Admin logout error:", err);
            return next(err);
        }
        
        req.session.destroy((destroyErr) => {
            if (destroyErr) {
                console.error("Session destruction error:", destroyErr);
            }
            res.clearCookie('admin_session'); 
            res.redirect('/admin/login');
        });
    });
};