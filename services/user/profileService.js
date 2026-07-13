import User from '../../models/User.js';

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