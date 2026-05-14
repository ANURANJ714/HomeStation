import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { generateNextUserId } from '../../utils/generateUserId.js';

export const validateRegistrationData = async (email, phone, password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$]).{12,}$/;
    if (!passwordRegex.test(password)) {
        const error = new Error('Password must be at least 12 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (!, @, #, $).');
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
};


export const createLocalUser = async (userData) => {
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
};