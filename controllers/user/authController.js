import crypto from 'crypto';
import passport from 'passport';
import * as userAuthService from '../../services/user/authService.js';
import { sendOtpEmail } from '../../services/user/emailService.js';
import logger from '../../utils/logger.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const loadLogin = async (req, res) => {
    try {
        const errorMessage = req.query.error || null;
        const clientIp = req.ip;

        logger.info(`User login page accessed from IP: ${clientIp}`);

        return res.render('user/userlogin', { errorMessage }); 

    } catch (error) {
        logger.error(`Error loading user login page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            title: "Server Error",
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
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
                return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    message: err.message || COMMON_MESSAGES.SERVER_ERROR 
                });
            }

            if (!user) {
                logger.warn(`Failed login attempt for ${emailAttempt} (IP: ${clientIp}): ${info?.message || 'Unauthorized'}`);
                return res.status(STATUS_CODES.UNAUTHORIZED).json({ 
                    success: false, 
                    message: info?.message || "Invalid credentials." || COMMON_MESSAGES.UNAUTHORIZED 
                });
            }

            if (user.role === 'Admin') {
                logger.warn(`Admin login attempted on customer endpoint by ${user.email} (IP: ${clientIp})`);
                return res.status(STATUS_CODES.FORBIDDEN).json({
                    success: false,
                    message: "Admin accounts cannot sign in through the customer portal. Please use the Admin Portal." || COMMON_MESSAGES.FORBIDDEN
                });
            }
            
            req.logIn(user, { keepSessionInfo: true }, (loginErr) => {
                if (loginErr) {
                    logger.error(`Session establishment error for ${user.email} (IP: ${clientIp}): ${loginErr.message}`);
                    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                        success: false, 
                        message: loginErr.message || COMMON_MESSAGES.SERVER_ERROR 
                    });
                }

                logger.info(`User (${user.email}) successfully logged in. IP: ${clientIp}`);

                return res.status(STATUS_CODES.OK).json({
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
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const loadRegister = async (req, res) => {
    try {
        const clientIp = req.ip;

        logger.info(`User registration page accessed from IP: ${clientIp}`);

        return res.render('user/createaccount'); 

    } catch (error) {
        logger.error(`Error loading user registration page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            title: "Server Error",
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const processRegister = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword, referredBy } = req.body;
        const clientIp = req.ip;

        if (password !== confirmPassword) {
            logger.warn(`Registration blocked: Passwords do not match for ${email}. IP: ${clientIp}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Passwords do not match." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        if (req.session.otp && req.session.otpExpires > Date.now()) {
            if (req.session.tempUserData && req.session.tempUserData.email === email) {
                logger.info(`Intercepted double-click during registration for ${email}: OTP already active. IP: ${clientIp}`);
                return res.status(STATUS_CODES.OK).json({ 
                    success: true, 
                    message: "OTP already sent. Please check your email." 
                });
            }
        }

        await userAuthService.validateRegistrationData(fullName, email, phone, password);

        const otp = crypto.randomInt(100000, 999999).toString();
        await sendOtpEmail(email, otp);

        req.session.resetEmail = null; 
        req.session.canResetPassword = false;
        
        req.session.tempUserData = { 
            fullName, 
            email, 
            phone, 
            password,
            referredBy: referredBy ? referredBy.trim() : null 
        };
        
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 60 * 1000; 
        req.session.otpContext = 'registration';

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during registration for ${email}: ${err.message}`);
                return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    message: err.message || COMMON_MESSAGES.SERVER_ERROR 
                });
            }

            logger.info(`Registration initiated. OTP sent to ${email} | Referred By: ${referredBy || 'None'} | IP: ${clientIp}`);
            return res.status(STATUS_CODES.OK).json({ success: true, message: "OTP sent successfully." });
        });

    } catch (error) {
        const statusCode = error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
        const message = error.message || COMMON_MESSAGES.SERVER_ERROR;

        if (statusCode >= STATUS_CODES.INTERNAL_SERVER_ERROR) {
            logger.error(`Registration Error (IP: ${req.ip}, Email: ${req.body.email}): ${error.message}\nStack: ${error.stack}`);
        } else {
            logger.warn(`Registration validation failed for ${req.body.email}: ${message}`);
        }

        return res.status(statusCode).json({ 
            success: false, 
            message: message 
        });
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

        return res.render('user/verify-otp', { email: emailToVerify });

    } catch (error) {
        logger.error(`Error loading user OTP verification page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            title: "Server Error",
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const clientIp = req.ip;

        if (!req.session.tempUserData && !req.session.resetEmail) {
            logger.warn(`User OTP resend blocked: Session expired or missing. IP: ${clientIp}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Session expired. Please start over." || COMMON_MESSAGES.SESSION_EXPIRED 
            });
        }

        const emailToVerify = req.session.tempUserData 
            ? req.session.tempUserData.email 
            : req.session.resetEmail;
            
        const now = Date.now();

        if (req.session.lastOtpRequest && now - req.session.lastOtpRequest < 60000) {
            const remainingSeconds = Math.ceil((60000 - (now - req.session.lastOtpRequest)) / 1000);
            
            logger.warn(`User OTP resend blocked: Rate limit triggered for ${emailToVerify}. Wait ${remainingSeconds}s. IP: ${clientIp}`);
            
            return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({ 
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
                return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    message: err.message || COMMON_MESSAGES.SERVER_ERROR 
                });
            }

            logger.info(`A new user OTP was successfully sent to ${emailToVerify}. IP: ${clientIp}`);
            
            return res.status(STATUS_CODES.OK).json({ 
                success: true, 
                message: "OTP resent successfully." 
            });
        });
        
    } catch (error) {
        logger.error(`User Resend OTP Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
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
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Session expired. Please start over." || COMMON_MESSAGES.SESSION_EXPIRED 
            });
        }

        if (Date.now() > req.session.otpExpires) {
            logger.warn(`User OTP verify failed: OTP expired for ${emailContext}. IP: ${clientIp}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "OTP has expired. Please request a new one." || COMMON_MESSAGES.SESSION_EXPIRED 
            });
        }

        if (otp !== req.session.otp) {
            logger.warn(`User OTP verify failed: Invalid OTP entered for ${emailContext}. IP: ${clientIp}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Invalid OTP. Please try again." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        if (req.session.otpContext === 'registration') {
            const newUser = await userAuthService.createLocalUser(req.session.tempUserData);

            logger.info(`User registered successfully: ${newUser.email} | Assigned Code: ${newUser.referralCode} | Referred By: ${newUser.referredBy || 'None'} | IP: ${clientIp}`);

            req.session.tempUserData = null;
            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.otpContext = null;

            req.logIn(newUser, { keepSessionInfo: true }, (err) => {
                if (err) {
                    logger.error(`Auto-login failed after registration for ${newUser.email} (IP: ${clientIp}): ${err.message}`);
                    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                        success: false, 
                        message: err.message || 'Account created but failed to log in automatically' || COMMON_MESSAGES.SERVER_ERROR 
                    });
                }
                
                req.session.save((saveErr) => {
                    if (saveErr) {
                        logger.error(`Session save error after registration for ${newUser.email}: ${saveErr.message}`);
                        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                            success: false, 
                            message: saveErr.message || COMMON_MESSAGES.SERVER_ERROR 
                        });
                    }
                    
                    logger.info(`User (${newUser.email}) auto-logged in. Redirecting to profile. IP: ${clientIp}`);
                    
                    return res.status(STATUS_CODES.OK).json({ 
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
                    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                        success: false, 
                        message: saveErr.message || COMMON_MESSAGES.SERVER_ERROR 
                    });
                }
                
                logger.info(`User OTP successfully verified for password reset (${emailContext}). IP: ${clientIp}`);
                
                return res.status(STATUS_CODES.OK).json({ 
                    success: true, 
                    message: "OTP Verified!", 
                    redirectUrl: '/user/reset-password' 
                });
            });
        }

    } catch (error) {
        logger.error(`Verify OTP Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const loadForgotPassword = async (req, res) => {
    try {
        const clientIp = req.ip;

        logger.info(`User forgot password page accessed from IP: ${clientIp}`);

        return res.render('user/forgotpassword'); 

    } catch (error) {
        logger.error(`Error loading user forgot password page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            title: "Server Error",
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
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
                return res.status(STATUS_CODES.NOT_FOUND).json({ 
                    success: false, 
                    isExistingUser: false, 
                    message: "No account found with this email. Please create an account." || COMMON_MESSAGES.NOT_FOUND 
                });
            }

            if (result.reason === 'GOOGLE_AUTH') {
                logger.warn(`User password reset blocked: Attempted on Google Auth account (${email}). IP: ${clientIp}`);
                return res.status(STATUS_CODES.BAD_REQUEST).json({
                    success: false,
                    isExistingUser: true,
                    message: "This email is linked to a Google account. Please use 'Continue with Google' to log in." || COMMON_MESSAGES.BAD_REQUEST
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
                return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    message: err.message || COMMON_MESSAGES.SERVER_ERROR 
                });
            }
            
            logger.info(`User password reset initiated. OTP sent to ${email}. IP: ${clientIp}`);
            
            return res.status(STATUS_CODES.OK).json({ 
                success: true, 
                isExistingUser: true, 
                message: "OTP sent to your email." 
            });
        });

    } catch (error) {
        logger.error(`User Forgot Password Error (IP: ${req.ip}, Email: ${req.body.email}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const loadResetPassword = async (req, res) => {
    try {
        const clientIp = req.ip;
        const email = req.session.resetEmail || 'Unknown Email';

        if (!req.session.canResetPassword || !req.session.resetEmail) {
            logger.warn(`Unauthorized or out-of-sequence access attempt to user new password page. IP: ${clientIp}`);
            return res.redirect('/user/forgot-password');
        }

        logger.info(`User new password page accessed for email: ${email}. IP: ${clientIp}`);

        return res.render('user/newpassword');

    } catch (error) {
        logger.error(`Error loading user new password page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            title: "Server Error",
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
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
            return res.status(STATUS_CODES.FORBIDDEN).json({ 
                success: false, 
                message: "Session expired. Please start over." || COMMON_MESSAGES.SESSION_EXPIRED 
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            logger.warn(`User password reset blocked: Complexity requirements failed for ${email}. IP: ${clientIp}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Password does not meet security requirements." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        const result = await userAuthService.updateUserPassword(email, password);

        if (!result.isUpdated) {
            logger.warn(`User password reset failed: Account not found (${email}). IP: ${clientIp}`);
            return res.status(STATUS_CODES.NOT_FOUND).json({ 
                success: false, 
                message: "User account not found." || COMMON_MESSAGES.NOT_FOUND 
            });
        }

        req.session.canResetPassword = false;
        req.session.resetEmail = null;

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during user password reset for ${email}: ${err.message}`);
                return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
                    success: false, 
                    message: err.message || COMMON_MESSAGES.SERVER_ERROR 
                });
            }

            logger.info(`User password successfully reset for ${email}. IP: ${clientIp}`);
            
            return res.status(STATUS_CODES.OK).json({ 
                success: true, 
                message: "Password updated successfully!",
                redirectUrl: '/user/login'
            });
        });

    } catch (error) {
        logger.error(`User Reset Password Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};