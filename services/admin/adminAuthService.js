import passport from "passport";
import User from '../../models/User.js';
import bcrypt from 'bcrypt';

export const validateLoginInput = (email, password) => {
    try {
        if (!email || !password) {
            return { isValid: false, message: "Please enter both email and password." };
        }

        if (typeof email !== "string" || typeof password !== "string") {
            return { isValid: false, message: "Invalid input format." };
        }

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            return { isValid: false, message: "Email cannot be empty." };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            return { isValid: false, message: "Please enter a valid email address." };
        }

        return { isValid: true };
    } catch (error) {
        throw new Error(`Input validation failed: ${error.message}`);
    }
};

export const verifyAdminCredentials = async (email, password) => {
    try {
        const user = await User.findOne({ 
            email: email.trim(), 
            status: 'Active' 
        });

        if (!user || user.role !== "Admin") {
            return { isAuthenticated: false, message: "Invalid email or password." };
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordMatch) {
            return { isAuthenticated: false, message: "Invalid email or password." };
        }

        return { isAuthenticated: true, user };
    } catch (error) {
        throw new Error(`Admin credential verification failed: ${error.message}`);
    }
};

export const checkAdminExists = async (email) => {
    try {
        const user = await User.findOne({ email });
        
        if (!user || user.role !== 'Admin') {
            return { isValid: false };
        }

        return { isValid: true, user };
    } catch (error) {
        throw new Error(`Database error while verifying admin email: ${error.message}`);
    }
};

export const updateAdminPassword = async (email, rawPassword) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        const user = await User.findOneAndUpdate(
            { email: email, role: 'Admin' }, 
            { passwordHash: hashedPassword },
            { returnDocument: 'after' } 
        );

        if (!user) {
            return { isUpdated: false };
        }

        return { isUpdated: true, user };

    } catch (error) {
        throw new Error(`Database error while updating admin password: ${error.message}`);
    }
};