import User from '../../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import passport from 'passport';
import { validateRegistrationData, createLocalUser } from '../../services/user/authService.js'
import { sendOtpEmail } from '../../services/user/emailService.js';

export const loadLogin = async (req, res) => {
    try {
        res.render('user/userlogin');
    } catch (error) {
        console.log("Error rendering login page:", error);
        res.status(500).send("Server Error");
    }
};

export const processLogin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Server error" });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: info.message });
        }
        
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Session error" });
            }
            return res.status(200).json({
                success: true,
                message: "Login successful.",
                user: { id: user._id, email: user.email, role: user.role }
            });
        });
    })(req, res, next);
};


export const loadRegister = async (req, res) => {
    try {
        res.render('user/createaccount');
    } catch (error) {
        res.status(500).send("Server Error");
    }
};

export const processRegister = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        await validateRegistrationData(email, phone, password);

        const otp = crypto.randomInt(100000, 999999).toString();

        await sendOtpEmail(email, otp);

        req.session.tempUserData = { fullName, email, phone, password };
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 60 * 1000; 
        req.session.otpContext = 'registration';

        return res.status(200).json({ success: true, message: "OTP sent successfully." });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.statusCode? error.message: "An internal server error occured!";

        res.status(statusCode).json({success:false, message: message});
    }
};

export const loadOtpPage = (req, res) => {
    if (!req.session.tempUserData && !req.session.resetEmail) {
        return res.redirect('/user/register');
    }

    const emailToVerify = req.session.tempUserData ? req.session.tempUserData.email : req.session.resetEmail;
    
    res.render('user/verify-otp', { email: emailToVerify });
};

export const resendOtp = async (req, res) => {
    try {
        if (!req.session.tempUserData && !req.session.resetEmail) {
            return res.status(400).json({ success: false, message: "Session expired." });
        }

        const now = Date.now();
        if (req.session.lastOtpRequest && now - req.session.lastOtpRequest < 60000) {
            return res.status(429).json({ success: false, message: "Please wait 60 seconds before requesting a new OTP." });
        }
        
        req.session.lastOtpRequest = now;

        const newOtp = crypto.randomInt(100000, 999999).toString();
        req.session.otp = newOtp;
        req.session.otpExpires = now + 60 * 1000;

        const emailToVerify = req.session.tempUserData ? req.session.tempUserData.email : req.session.resetEmail;
        await sendOtpEmail(emailToVerify, newOtp);

        console.log(`\n=== RESENT OTP FOR ${emailToVerify}: ${newOtp} ===\n`);

        return res.status(200).json({ success: true, message: "OTP resent successfully." });
        
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error resending OTP" });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        const hasValidSession = req.session.tempUserData || req.session.resetEmail;

        if (!hasValidSession || !req.session.otp) {
            return res.status(400).json({ success: false, message: "Session expired. Please start over." });
        }

        if (Date.now() > req.session.otpExpires) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (otp !== req.session.otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }

        if(req.session.otpContext !== 'forgot_password'){
            const newUser = await createLocalUser(req.session.tempUserData);

            req.session.tempUserData = null;
            req.session.otp = null;
            req.session.otpExpires = null;
            req.session.otpContext = null;

            req.logIn(newUser, (err) => {
                if(err){
                    return res.status(500).json({success: false, message: 'Account created but failed to log in automatically'});
                }
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error("Session save error:", saveErr);
                        return res.status(500).json({ success: false, message: "Session error during login." });
                    }
                    
                    return res.status(200).json({
                        success: true, 
                        message: 'Account created successfully', 
                        redirectUrl: '/user/profile'
                    });
                });
            });
            return;
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "An error occurred during verification." });
    }
};

export const loadForgotPassword = async (req,res)=>{
    try{
        res.render('user/forgotpassword');
    }catch(error){
        console.log("Error rendering Forgot Password Page: ",error);
        res.status(500).send("Server Error");
    }
}

export const processForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                isExistingUser: false, 
                message: "No account found with this email. Please create an account." 
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        await sendOtpEmail(email, otp);

        req.session.resetEmail = email; 
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 60 * 1000; 
        req.session.otpContext = 'forgot_password'; 

        return res.status(200).json({ 
            success: true, 
            isExistingUser: true,
            message: "OTP sent to your email." 
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

export const loadResetPassword = (req, res) => {
    if (!req.session.canResetPassword || !req.session.resetEmail) {
        return res.redirect('/user/forgot-password');
    }
    res.render('user/newpassword');
};

export const processResetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.session.resetEmail;

        if (!email || !req.session.canResetPassword) {
            return res.status(403).json({ success: false, message: "Session expired. Please start over." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ success: false, message: "Password does not meet security requirements." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.findOneAndUpdate({ email }, { passwordHash: hashedPassword });

        req.session.canResetPassword = false;
        req.session.resetEmail = null;

        res.status(200).json({ 
            success: true, 
            message: "Password updated successfully!",
            redirectUrl: '/user/login'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
};