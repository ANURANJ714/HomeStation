import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { generateNextUserId } from '../../utils/generateUserId.js';

export const validateRegistrationData = async (fullName, email, phone, password) => {
    try {
        const nameRegex = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
        if (!nameRegex.test(fullName)) {
            const error = new Error('Please provide a valid name (letters and single spaces only, no numbers, special characters, or leading/trailing spaces).');
            error.statusCode = 400;
            throw error;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
        if (!passwordRegex.test(password)) {
            const error = new Error('Password must be at least 12 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (!, @, #, $).');
            error.statusCode = 400; 
            throw error;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const error = new Error('Please provide a valid email address.');
            error.statusCode = 400;
            throw error;
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone)) {
            const error = new Error('Please provide a valid 10-digit phone number.');
            error.statusCode = 400;
            throw error;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const error = new Error('Email is already registered.');
            error.statusCode = 409; 
            throw error;
        }

        const existingPhoneNumber = await User.findOne({ phone });
        if (existingPhoneNumber) {
            const error = new Error("Phone number already exists!");
            error.statusCode = 409;
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
        const { fullName, email, phone, password } = userData;
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userId = await generateNextUserId(); 

        const newUser = new User({
            userId,
            fullName,
            email,
            phone,
            passwordHash,
            authProvider: 'local'
        });

        await newUser.save();
        
        return newUser;
    } catch (error) {
        throw new Error(`Failed to create local user account: ${error.message}`);
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