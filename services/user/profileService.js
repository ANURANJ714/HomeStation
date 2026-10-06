import User from '../../models/User.js';
import * as walletService from '../../services/user/walletService.js';

export const validateData = async (fullName, email, phone) =>{
    try{
        const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
        if (!nameRegex.test(fullName)) {
            const error = new Error('Please provide a valid name (letters and single spaces only, no numbers, special characters, or leading/trailing spaces).');
            error.statusCode = 400;
            throw error;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            const error = new Error('Please provide a valid 10-digit phone number.');
            error.statusCode = 400;
            throw error;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const error = new Error('Please provide a valid email address.');
            error.statusCode = 400;
            throw error;
        }
    }catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw new Error(`Something went wrong: ${error.message}`);
    }
}

export const updateUserProfileData = async (userId, updateData) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateData, 
            { returnDocument: 'after', runValidators: true } 
        );

        if (!updatedUser) {
            return { isUpdated: false };
        }

        return { isUpdated: true, user: updatedUser };

    } catch (error) {
        throw new Error(`Database error while updating user profile: ${error.message}`);
    }
};

export const changeUserPassword = async (userId, oldPassword, newPassword) => {
    try {
        if (oldPassword === newPassword) {
            return { success: false, reason: 'SAME_AS_OLD_PASSWORD' };
        }

        const user = await User.findById(userId);

        if (!user) {
            return { success: false, reason: 'NOT_FOUND' };
        }

        if (user.authProvider === 'google') {
            return { success: false, reason: 'GOOGLE_AUTH' };
        }

        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
            return { success: false, reason: 'INCORRECT_OLD_PASSWORD' };
        }

        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        await user.save();

        return { success: true };

    } catch (error) {
        throw new Error(`Database error while changing user password: ${error.message}`);
    }
};

export const updateUserEmail = async (userId, newEmail) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { email: newEmail },
            { returnDocument: 'after', runValidators: true } 
        );

        if (!updatedUser) {
            return { isUpdated: false };
        }

        return { isUpdated: true, user: updatedUser };

    } catch (error) {
        throw new Error(`Database error while updating user email: ${error.message}`);
    }
};

export const applyReferralCodeService = async (userId, referralCodeInput) => {
    try {
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            const error = new Error("User account not found.");
            error.statusCode = 404;
            throw error;
        }

        if (currentUser.referredBy) {
            const error = new Error("You have already applied a referral code.");
            error.statusCode = 400;
            throw error;
        }

        if (currentUser.createdAt) {
            const createdDate = new Date(currentUser.createdAt);
            const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 30) {
                const error = new Error("The referral code offer is only valid within 30 days of registration.");
                error.statusCode = 400;
                throw error;
            }
        }

        const cleanCode = referralCodeInput ? String(referralCodeInput).trim() : '';
        if (!cleanCode) {
            const error = new Error("Please enter a referral code.");
            error.statusCode = 400;
            throw error;
        }

        if (currentUser.referralCode && currentUser.referralCode.toLowerCase() === cleanCode.toLowerCase()) {
            const error = new Error("You cannot use your own referral code.");
            error.statusCode = 400;
            throw error;
        }

        const referrerUser = await User.findOne({ 
            referralCode: cleanCode, 
            status: 'Active' 
        });

        if (!referrerUser) {
            const error = new Error("Invalid referral code. No active account found with this code.");
            error.statusCode = 404;
            throw error;
        }

        currentUser.referredBy = referrerUser._id;
        await currentUser.save();

        await walletService.handleReferralBonus(currentUser._id, referrerUser._id);

        return {
            success: true,
            message: "Referral code applied successfully! ₹200 has been added to your wallet."
        };
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        throw error;
    }
};