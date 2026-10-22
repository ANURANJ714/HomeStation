import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { generateNextUserId } from '../../utils/generateUserId.js';
import { generateUniqueReferralCode } from '../../utils/generateReferralCode.js';
import * as walletService from '../../services/user/walletService.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';

export const validateRegistrationData = async (fullName, email, phone, password) => {
    try {
        const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
        if (!nameRegex.test(fullName)) {
            const error = new Error('Please provide a valid name (letters and single spaces only, no numbers, special characters, or leading/trailing spaces).');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            const error = new Error('Password must be at least 12 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (!, @, #, $).');
            error.statusCode = STATUS_CODES.CONFLICT; 
            throw error;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const error = new Error('Please provide a valid email address.');
            error.statusCode = STATUS_CODES.CONFLICT;
            throw error;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            const error = new Error('Please provide a valid 10-digit phone number.');
            error.statusCode = STATUS_CODES.BAD_REQUEST;
            throw error;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = new Error('Email is already registered.');
            error.statusCode = STATUS_CODES.CONFLICT; 
            throw error;
        }

        const existingPhoneNumber = await User.findOne({ phone });
        if (existingPhoneNumber) {
            const error = new Error("Phone number already exists!");
            error.statusCode = STATUS_CODES.CONFLICT;
            throw error;
        }

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw new Error(`Database error during registration validation: ${error.message}`);
    }
};


export const createLocalUser = async (userData) => {
    try {
        const { fullName, email, phone, password, referredBy } = userData;

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userId = await generateNextUserId();
        const referralCode = await generateUniqueReferralCode();

        let referrerUser = null;
        if (referredBy && referredBy.trim() !== '') {
            referrerUser = await User.findOne({ 
                referralCode: referredBy.trim(),
                status: 'Active'
            });
        }

        const newUser = new User({
            userId,
            fullName,
            email,
            phone,
            passwordHash,
            referralCode,
            referredBy: referrerUser ? referrerUser._id : null,
            authProvider: 'local'
        });

        await newUser.save();

        if (referrerUser) {
            await walletService.handleReferralBonus(newUser._id, referrerUser._id);
        }

        return newUser;
    } catch (error) {
        throw new Error(`Failed to create local user account: ${error.message}`);
    }
};

export const handleGoogleAuthUser = async (profile) => {
    try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
            throw new Error('Google profile does not contain an email address.');
        }

        let existingUser = await User.findOne({ googleId: profile.id });
        if (existingUser) {
            return { user: existingUser, isNewUser: false };
        }

        existingUser = await User.findOne({ email });
        if (existingUser) {
            existingUser.googleId = profile.id;
            
            if (!existingUser.referralCode) {
                existingUser.referralCode = await generateUniqueReferralCode();
            }

            await existingUser.save();
            return { user: existingUser, isNewUser: false };
        }

        const newUserId = await generateNextUserId();
        const referralCode = await generateUniqueReferralCode();

        const newUser = new User({
            userId: newUserId,
            fullName: profile.displayName,
            email,
            googleId: profile.id,
            referralCode,
            authProvider: 'google'
        });

        await newUser.save();
        return { user: newUser, isNewUser: true };
    } catch (error) {
        throw new Error(`Google Auth service failure: ${error.message}`);
    }
};

export const checkUserForPasswordReset = async (email) => {
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return { isValid: false, reason: 'NOT_FOUND' };
        }

        if (user.authProvider === 'google') {
            return { isValid: false, reason: 'GOOGLE_AUTH' };
        }

        return { isValid: true, user };
    } catch (error) {
        throw new Error(`Database error while verifying user for password reset: ${error.message}`);
    }
};

export const updateUserPassword = async (email, rawPassword) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        const updatedUser = await User.findOneAndUpdate(
            { email: email }, 
            { passwordHash: hashedPassword },
            { returnDocument: 'after' } 
        );

        if (!updatedUser) {
            return { isUpdated: false };
        }

        return { isUpdated: true, user: updatedUser };

    } catch (error) {
        throw new Error(`Database error while updating user password: ${error.message}`);
    }
};

export const getUserById = async (userId) => {
    try {
        if (!userId) return null;
        return await User.findById(userId).lean();
    } catch (error) {
        throw new Error(`Database error while fetching user profile: ${error.message}`);
    }
};