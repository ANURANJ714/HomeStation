import User from '../../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {sendOtpEmail} from '../../services/user/emailService.js'

export const getProfile = (req,res) =>{
    try{
        res.render('user/profile', {user: req.user});
    }catch(error){
        res.status(500).send('Server Error');
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { fullName, phone, email } = req.body; 
        
        let updateData = { fullName, phone }; 
        let requiresEmailVerification = false;

        if (req.user.authProvider === 'local' && email && email !== req.user.email) {
            const otp = crypto.randomInt(100000, 999999).toString();
            
            req.session.newEmailPending = email; 
            req.session.emailOtp = otp;
            req.session.emailOtpExpires = Date.now() + 60 * 1000; 
            
            await sendOtpEmail(email, otp); 
            requiresEmailVerification = true;
        } else if (email && email !== req.user.email) {
            return res.status(403).json({ success: false, message: "Google accounts cannot change email." });
        }

        if (req.file) { updateData.profileImage = req.file.path; }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id, 
            updateData, 
            { returnDocument: 'after' } 
        );

        if (requiresEmailVerification) {
            return res.status(200).json({ 
                success: true, 
                message: "Profile saved. Please verify your new email.", 
                requiresVerification: true 
            });
        }

        res.status(200).json({ success: true, message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user.authProvider === 'google') {
            return res.status(403).json({ success: false, message: "Google accounts do not use local passwords." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match." });
        }

        if (!oldPassword) {
            return res.status(400).json({ success: false, message: "Old password is required." });
        }
        
        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect old password." });
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        user.passwordHash = newPasswordHash;
        await user.save();
        
        res.status(200).json({ success: true, message: "Password updated successfully!" });

    } catch (error) {
        console.error("Update Password Error:", error);
        res.status(500).json({ success: false, message: "Failed to update password." });
    }
};


export const loadVerifyEmailPage = (req, res) => {
    if (!req.session.newEmailPending) {
        return res.redirect('/user/profile'); 
    }
    res.render('user/verify-email', { user: req.user, newEmail: req.session.newEmailPending });
};


export const verifyEmailChange = async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!req.session.emailOtp || req.session.emailOtpExpires < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (req.session.emailOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }

        await User.findByIdAndUpdate(req.user._id, { email: req.session.newEmailPending });
        
        req.session.newEmailPending = null;
        req.session.emailOtp = null;
        req.session.emailOtpExpires = null;

        res.status(200).json({ success: true, message: "Email successfully updated." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
};

export const resendEmailOtp = async (req, res) => {
    try {
        if (!req.session.newEmailPending) return res.status(400).json({ success: false, message: "No email change pending." });

        if (req.session.emailOtp && req.session.emailOtpExpires > Date.now()) {
            return res.status(400).json({ success: false, message: "An OTP is already active and valid. Please check your inbox." });
        }

        const newOtp = crypto.randomInt(100000, 999999).toString();
        req.session.emailOtp = newOtp;
        req.session.emailOtpExpires = Date.now() + 60 * 1000;

        await sendOtpEmail(req.session.newEmailPending, newOtp);

        res.status(200).json({ success: true, message: "A new OTP has been sent." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to resend OTP." });
    }
};

export const logoutUser = (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error logging out" });
        }
        req.session.destroy((err) => {
            if (err) console.log("Session destruction error:", err);
            res.clearCookie('connect.sid'); 
            return res.redirect('/user/login');
        });
    });
};