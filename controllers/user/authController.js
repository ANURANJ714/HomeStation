import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import passport from 'passport';
import * as userAuthService from '../../services/user/authService.js'
import { sendOtpEmail } from '../../services/user/emailService.js';
import logger from '../../utils/logger.js';

export const loadLogin = async (req, res) => {
    try {
        const errorMessage = req.query.error || null;
        const clientIp = req.ip;

        logger.info(`User login page accessed from IP: ${clientIp}`);

        res.render('user/userlogin', { errorMessage }); 

    } catch (error) {
        logger.error(`Error loading user login page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the login page."
        });
    }
};

export const processLogin = (req, res, next) => {
    try {
        const clientIp = req.ip;
        const emailAttempt = req.body.email || 'Unknown Email'; 

        passport.authenticate('local', (err, user, info) => {
            if (err) {
                logger.error(`Authentication error for ${emailAttempt} (IP: ${clientIp}): ${err.message}`);
                return res.status(500).json({ 
                    success: false, 
                    message: "An internal server error occurred during authentication." 
                });
            }

            if (!user) {
                logger.warn(`Failed login attempt for ${emailAttempt} (IP: ${clientIp}): ${info.message}`);
                return res.status(401).json({ 
                    success: false, 
                    message: info.message 
                });
            }
            
            req.logIn(user, { keepSessionInfo: true }, (loginErr) => {
                if (loginErr) {
                    logger.error(`Session establishment error for ${user.email} (IP: ${clientIp}): ${loginErr.message}`);
                    return res.status(500).json({ 
                        success: false, 
                        message: "A session error occurred while logging in." 
                    });
                }

                logger.info(`User (${user.email}) successfully logged in. IP: ${clientIp}`);

                return res.status(200).json({
                    success: true,
                    message: "Login successful.",
                    user: { 
                        id: user._id, 
                        email: user.email, 
                        role: user.role 
                    }
                });
            });
            
        })(req, res, next);

    } catch (error) {
        logger.error(`Unexpected sync error in processLogin (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "An unexpected server error occurred." 
        });
    }
};

export const loadRegister = async (req, res) => {
    try {
        const clientIp = req.ip;

        logger.info(`User registration page accessed from IP: ${clientIp}`);

        res.render('user/createaccount'); 

    } catch (error) {
        logger.error(`Error loading user registration page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the registration page."
        });
    }
};

export const processRegister = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;
        const clientIp = req.ip;

        if (password !== confirmPassword) {
            logger.warn(`Registration blocked: Passwords do not match for ${email}. IP: ${clientIp}`);
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        if (req.session.otp && req.session.otpExpires > Date.now()) {
            if (req.session.tempUserData && req.session.tempUserData.email === email) {
                logger.info(`Intercepted double-click during registration for ${email}: OTP already active. IP: ${clientIp}`);
                return res.status(200).json({ 
                    success: true, 
                    message: "OTP already sent. Please check your email." 
                });
            }
        }

        await userAuthService.validateRegistrationData(fullName,email, phone, password);

        const otp = crypto.randomInt(100000, 999999).toString();
        await sendOtpEmail(email, otp);

        req.session.resetEmail = null; 
        req.session.canResetPassword = false;
        req.session.tempUserData = { fullName, email, phone, password };
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 60 * 1000; 
        req.session.otpContext = 'registration';

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during registration for ${email}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`Registration initiated. OTP sent to ${email}. IP: ${clientIp}`);
            return res.status(200).json({ success: true, message: "OTP sent successfully." });
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.statusCode ? error.message : "An internal server error occurred!";

        if (statusCode >= 500) {
            logger.error(`Registration Error (IP: ${req.ip}, Email: ${req.body.email}): ${error.message}\nStack: ${error.stack}`);
        } else {
            logger.warn(`Registration validation failed for ${req.body.email}: ${message}`);
        }

        return res.status(statusCode).json({ success: false, message: message });
    }
};

export const loadOtpPage = (req, res) => {
    try {
        const clientIp = req.ip;

        if (!req.session.tempUserData && !req.session.resetEmail) {
            logger.warn(`Unauthorized or expired access attempt to user OTP verification page. IP: ${clientIp}`);
            return res.redirect('/user/register');
        }

        const emailToVerify = req.session.tempUserData 
            ? req.session.tempUserData.email 
            : req.session.resetEmail;
        
        logger.info(`User OTP verification page accessed for email: ${emailToVerify}. IP: ${clientIp}`);

        res.render('user/verify-otp', { email: emailToVerify });

    } catch (error) {
        logger.error(`Error loading user OTP verification page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the verification page."
        });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const clientIp = req.ip;

        if (!req.session.tempUserData && !req.session.resetEmail) {
            logger.warn(`User OTP resend blocked: Session expired or missing. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Session expired. Please start over." 
            });
        }

        const emailToVerify = req.session.tempUserData 
            ? req.session.tempUserData.email 
            : req.session.resetEmail;
            
        const now = Date.now();

        if (req.session.lastOtpRequest && now - req.session.lastOtpRequest < 60000) {
            const remainingSeconds = Math.ceil((60000 - (now - req.session.lastOtpRequest)) / 1000);
            
            logger.warn(`User OTP resend blocked: Rate limit triggered for ${emailToVerify}. Wait ${remainingSeconds}s. IP: ${clientIp}`);
            
            return res.status(429).json({ 
                success: false, 
                message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.` 
            });
        }
        
        req.session.lastOtpRequest = now;
        const newOtp = crypto.randomInt(100000, 999999).toString();
        req.session.otp = newOtp;
        req.session.otpExpires = now + 60 * 1000; 

        await sendOtpEmail(emailToVerify, newOtp);

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during user OTP resend for ${emailToVerify}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`A new user OTP was successfully sent to ${emailToVerify}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "OTP resent successfully." 
            });
        });
        
    } catch (error) {
        logger.error(`User Resend OTP Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Error resending OTP." 
        });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const clientIp = req.ip;

        const emailContext = req.session.tempUserData?.email || req.session.resetEmail || 'Unknown Email';
        const hasValidSession = req.session.tempUserData || req.session.resetEmail;

        if (!hasValidSession || !req.session.otp) {
            logger.warn(`User OTP verify blocked: Session expired or missing for ${emailContext}. IP: ${clientIp}`);
            return res.status(400).json({ success: false, message: "Session expired. Please start over." });
        }

        if (Date.now() > req.session.otpExpires) {
            logger.warn(`User OTP verify failed: OTP expired for ${emailContext}. IP: ${clientIp}`);
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (otp !== req.session.otp) {
            logger.warn(`User OTP verify failed: Invalid OTP entered for ${emailContext}. IP: ${clientIp}`);
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }

        if (req.session.otpContext === 'registration') {
            
            const newUser = await userAuthService.createLocalUser(req.session.tempUserData);

            req.session.tempUserData = null;
            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.otpContext = null;

            req.logIn(newUser, { keepSessionInfo: true }, (err) => {
                if (err) {
                    logger.error(`Auto-login failed after registration for ${newUser.email} (IP: ${clientIp}): ${err.message}`);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Account created but failed to log in automatically' 
                    });
                }
                
                req.session.save((saveErr) => {
                    if (saveErr) {
                        logger.error(`Session save error after registration for ${newUser.email}: ${saveErr.message}`);
                        return res.status(500).json({ success: false, message: "Session error during login." });
                    }
                    
                    logger.info(`User (${newUser.email}) registered and auto-logged in successfully. IP: ${clientIp}`);
                    
                    return res.status(200).json({
                        success: true, 
                        message: 'Account created successfully', 
                        redirectUrl: '/user/profile'
                    });
                });
            });
            return; 

        } else if (req.session.otpContext === 'forgot_password') {
            
            req.session.canResetPassword = true;

            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.otpContext = null;

            req.session.save((saveErr) => {
                if (saveErr) {
                    logger.error(`Session save error during password reset OTP verify for ${emailContext}: ${saveErr.message}`);
                    return res.status(500).json({ success: false, message: "Session error." });
                }
                
                logger.info(`User OTP successfully verified for password reset (${emailContext}). IP: ${clientIp}`);
                
                return res.status(200).json({
                    success: true,
                    message: "OTP Verified!",
                    redirectUrl: '/user/reset-password'
                });
            });
        }

    } catch (error) {
        logger.error(`Verify OTP Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "An error occurred during verification." 
        });
    }
};

export const loadForgotPassword = async (req, res) => {
    try {
        const clientIp = req.ip;

        logger.info(`User forgot password page accessed from IP: ${clientIp}`);

        res.render('user/forgotpassword'); 

    } catch (error) {
        logger.error(`Error loading user forgot password page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the forgot password page."
        });
    }
};

export const processForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const clientIp = req.ip;

        const result = await userAuthService.checkUserForPasswordReset(email);

        if (!result.isValid) {
            if (result.reason === 'NOT_FOUND') {
                logger.warn(`User password reset failed: No account found for ${email}. IP: ${clientIp}`);
                return res.status(404).json({ 
                    success: false, 
                    isExistingUser: false, 
                    message: "No account found with this email. Please create an account." 
                });
            }

            if (result.reason === 'GOOGLE_AUTH') {
                logger.warn(`User password reset blocked: Attempted on Google Auth account (${email}). IP: ${clientIp}`);
                return res.status(400).json({
                    success: false,
                    isExistingUser: true,
                    message: "This email is linked to a Google account. Please use 'Continue with Google' to log in."
                });
            }
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        await sendOtpEmail(email, otp);

        req.session.tempUserData = null; 
        req.session.resetEmail = email; 
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 60 * 1000; 
        req.session.otpContext = 'forgot_password'; 

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during user password reset for ${email}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }
            
            logger.info(`User password reset initiated. OTP sent to ${email}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                isExistingUser: true,
                message: "OTP sent to your email." 
            });
        });

    } catch (error) {
        logger.error(`User Forgot Password Error (IP: ${req.ip}, Email: ${req.body.email}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Server error." 
        });
    }
};

export const loadResetPassword = (req, res) => {
    try {
        const clientIp = req.ip;
        const email = req.session.resetEmail || 'Unknown Email';

        if (!req.session.canResetPassword || !req.session.resetEmail) {
            logger.warn(`Unauthorized or out-of-sequence access attempt to user new password page. IP: ${clientIp}`);
            return res.redirect('/user/forgot-password');
        }

        logger.info(`User new password page accessed for email: ${email}. IP: ${clientIp}`);

        res.render('user/newpassword');

    } catch (error) {
        logger.error(`Error loading user new password page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the page."
        });
    }
};

export const processResetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.session.resetEmail;
        const clientIp = req.ip;

        if (!email || !req.session.canResetPassword) {
            logger.warn(`User password reset blocked: Session expired or invalid state. IP: ${clientIp}`);
            return res.status(403).json({ 
                success: false, 
                message: "Session expired. Please start over." 
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            logger.warn(`User password reset blocked: Complexity requirements failed for ${email}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Password does not meet security requirements." 
            });
        }

        const result = await userAuthService.updateUserPassword(email, password);

        if (!result.isUpdated) {
            logger.warn(`User password reset failed: Account not found (${email}). IP: ${clientIp}`);
            return res.status(404).json({ success: false, message: "User account not found." });
        }

        req.session.canResetPassword = false;
        req.session.resetEmail = null;

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during user password reset for ${email}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`User password successfully reset for ${email}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "Password updated successfully!",
                redirectUrl: '/user/login'
            });
        });

    } catch (error) {
        logger.error(`User Reset Password Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Server error." 
        });
    }
};
