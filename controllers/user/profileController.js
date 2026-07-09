import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {sendOtpEmail} from '../../services/user/emailService.js'
import logger from '../../utils/logger.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import * as profileService from '../../services/user/profileService.js';

export const getProfile = async (req, res) => { 
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';

        const bannerText = await getActivePromoBanner();

        logger.info(`User profile page accessed by ${userEmail}. IP: ${clientIp}`);

        res.render('user/profile', { 
            user: req.user,
            bannerText: bannerText 
        });

    } catch (error) {
        logger.error(`Error loading profile page for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the profile page."
        });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { fullName, phone, email } = req.body; 
        const clientIp = req.ip;
        
        const userId = req.user._id;
        const userEmail = req.user.email;

        let updateData = { fullName, phone }; 
        let requiresEmailVerification = false;

        if (email && email !== userEmail) {
            
            if (req.user.authProvider !== 'local') {
                logger.warn(`Profile update blocked: Attempted email change on Google account (${userEmail}). IP: ${clientIp}`);
                return res.status(403).json({ 
                    success: false, 
                    message: "Google accounts cannot change email." 
                });
            }

            const otp = crypto.randomInt(100000, 999999).toString();
            
            req.session.newEmailPending = email; 
            req.session.emailOtp = otp;
            req.session.emailOtpExpires = Date.now() + 60 * 1000; 
            
            await sendOtpEmail(email, otp); 
            requiresEmailVerification = true;
        }

        if (req.file) { 
            updateData.profileImage = req.file.path; 
        }

        const result = await profileService.updateUserProfileData(userId, updateData);

        if (!result.isUpdated) {
            logger.warn(`Profile update failed: User document not found for ID ${userId}. IP: ${clientIp}`);
            return res.status(404).json({ success: false, message: "User account not found." });
        }

        if (requiresEmailVerification) {
            req.session.save((err) => {
                if (err) {
                    logger.error(`Session Save Error during profile update (email change) for ${userEmail}: ${err.message}`);
                    return res.status(500).json({ success: false, message: "Session error occurred." });
                }
                
                logger.info(`Profile updated (partial) and email change initiated for ${userEmail}. OTP sent to ${email}. IP: ${clientIp}`);
                
                return res.status(200).json({ 
                    success: true, 
                    message: "Profile saved. Please verify your new email.", 
                    requiresVerification: true 
                });
            });
            
            return; 
        }

        logger.info(`Profile updated successfully for ${userEmail}. IP: ${clientIp}`);
        
        return res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully", 
            user: result.user 
        });

    } catch (error) {
        logger.error(`Update Profile Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Server error." 
        });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';
        const clientIp = req.ip;

        if (!oldPassword) {
            logger.warn(`Password update blocked: Missing old password for ${userEmail}. IP: ${clientIp}`);
            return res.status(400).json({ success: false, message: "Old password is required." });
        }

        if (newPassword !== confirmPassword) {
            logger.warn(`Password update blocked: New passwords do not match for ${userEmail}. IP: ${clientIp}`);
            return res.status(400).json({ success: false, message: "New passwords do not match." });
        }

        const result = await profileService.changeUserPassword(userId, oldPassword, newPassword);

        if (!result.success) {
            
            if (result.reason === 'SAME_AS_OLD_PASSWORD') {
                logger.warn(`Password update blocked: New password is the same as the old password for ${userEmail}. IP: ${clientIp}`);
                return res.status(400).json({ success: false, message: "Enter a new password. It cannot be the same as your old password." });
            }

            if (result.reason === 'NOT_FOUND') {
                logger.warn(`Password update failed: Account not found for ID ${userId}. IP: ${clientIp}`);
                return res.status(404).json({ success: false, message: "User account not found." });
            }
            
            if (result.reason === 'GOOGLE_AUTH') {
                logger.warn(`Password update blocked: Attempted on Google Auth account (${userEmail}). IP: ${clientIp}`);
                return res.status(403).json({ success: false, message: "Google accounts do not use local passwords." });
            }

            if (result.reason === 'INCORRECT_OLD_PASSWORD') {
                logger.warn(`Password update failed: Incorrect old password provided for ${userEmail}. IP: ${clientIp}`);
                return res.status(401).json({ success: false, message: "Incorrect old password." });
            }
        }

        logger.info(`User password successfully updated for ${userEmail}. IP: ${clientIp}`);
        
        return res.status(200).json({ 
            success: true, 
            message: "Password updated successfully!" 
        });

    } catch (error) {
        logger.error(`Update Password Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Failed to update password." 
        });
    }
};

export const loadVerifyEmailPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const pendingEmail = req.session.newEmailPending;

        if (!pendingEmail) {
            logger.warn(`Unauthorized or expired access attempt to email verification page by ${userEmail}. IP: ${clientIp}`);
            return res.redirect('/user/profile'); 
        }

        const bannerText = await getActivePromoBanner();

        logger.info(`User (${userEmail}) accessed verify-email page to confirm new email: ${pendingEmail}. IP: ${clientIp}`);

        res.render('user/verify-email', { 
            user: req.user, 
            newEmail: pendingEmail,
            bannerText: bannerText
        });

    } catch (error) {
        logger.error(`Error loading verify-email page for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the verification page."
        });
    }
};


export const verifyEmailChange = async (req, res) => {
    try {
        const { otp } = req.body;
        const clientIp = req.ip;
        
        const userId = req.user._id;
        const oldEmail = req.user.email || 'Unknown User';
        const newEmail = req.session.newEmailPending;

        if (!newEmail || !req.session.emailOtp || req.session.emailOtpExpires < Date.now()) {
            logger.warn(`Email change verification blocked: OTP expired or session missing for ${oldEmail}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "OTP has expired. Please request a new one." 
            });
        }

        if (req.session.emailOtp !== otp) {
            logger.warn(`Email change verification failed: Invalid OTP entered for ${oldEmail}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "Invalid OTP." 
            });
        }

        const result = await profileService.updateUserEmail(userId, newEmail);

        if (!result.isUpdated) {
            logger.error(`Email change failed: User document not found for ID ${userId}. IP: ${clientIp}`);
            return res.status(404).json({ success: false, message: "User account not found." });
        }
        
        req.session.newEmailPending = null;
        req.session.emailOtp = null;
        req.session.emailOtpExpires = null;

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during email update for ${oldEmail}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`User email successfully updated from ${oldEmail} to ${newEmail}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "Email successfully updated." 
            });
        });

    } catch (error) {
        logger.error(`Verify Email Change Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Server error." 
        });
    }
};

export const resendEmailOtp = async (req, res) => {
    try {
        const clientIp = req.ip;
        const pendingEmail = req.session.newEmailPending;
        const userEmail = req.user?.email || 'Unknown User';

        if (!pendingEmail) {
            logger.warn(`Email OTP resend blocked: No pending email change found for ${userEmail}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "No email change pending." 
            });
        }

        if (req.session.emailOtp && req.session.emailOtpExpires > Date.now()) {
            logger.warn(`Email OTP resend blocked: OTP still active for pending email ${pendingEmail}. IP: ${clientIp}`);
            return res.status(400).json({ 
                success: false, 
                message: "An OTP is already active and valid. Please check your inbox." 
            });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        req.session.emailOtp = newOtp;
        req.session.emailOtpExpires = Date.now() + 60 * 1000;

        await sendOtpEmail(pendingEmail, newOtp);

        req.session.save((err) => {
            if (err) {
                logger.error(`Session Save Error during email OTP resend for ${userEmail}: ${err.message}`);
                return res.status(500).json({ success: false, message: "Session error occurred." });
            }

            logger.info(`A new email change OTP was successfully sent to ${pendingEmail}. IP: ${clientIp}`);
            
            return res.status(200).json({ 
                success: true, 
                message: "A new OTP has been sent." 
            });
        });

    } catch (error) {
        logger.error(`Resend Email OTP Error for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "Failed to resend OTP." 
        });
    }
};

export const logoutUser = (req, res) => {
    try {
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;

        req.logout((err) => {
            if (err) {
                logger.error(`User logout error for ${userEmail} (IP: ${clientIp}): ${err.message}`);
                return res.status(500).json({ 
                    success: false, 
                    message: "An error occurred during the logout process." 
                });
            }
            
            req.session.destroy((destroyErr) => {
                if (destroyErr) {
                    logger.error(`Session destruction error during user logout for ${userEmail}: ${destroyErr.message}`);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Failed to completely destroy session." 
                    });
                }
                
                res.clearCookie('user_session'); 
                
                logger.info(`User (${userEmail}) successfully logged out. IP: ${clientIp}`);
                
                return res.status(200).json({
                    success: true,
                    message: "Logged out successfully.",
                    redirectUrl: '/'
                });
            });
        });

    } catch (error) {
        logger.error(`Unexpected error during user logout (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: "An internal server error occurred." 
        });
    }
};