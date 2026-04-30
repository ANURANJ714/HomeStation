import User from '../../models/User.js';
import bcrypt from 'bcryptjs';

export const getProfile = (req,res) =>{
    try{
        res.render('user/profile', {user: req.user});
    }catch(error){
        res.send(500).send('Server Error');
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { fullName, phone, email } = req.body;
        const userId = req.user._id;

        let updateData = { fullName, phone, email }; 

        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            updateData, 
            { returnDocument: 'after' } 
        );

        res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully", 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match." });
        }

        if (user.authProvider === 'local' || user.authProvider === 'both') {
            if (!oldPassword) {
                return res.status(400).json({ success: false, message: "Old password is required." });
            }
            const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Incorrect old password." });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        user.passwordHash = newPasswordHash;

        if (user.authProvider === 'google') {
            user.authProvider = 'both';
        }

        await user.save();
        res.status(200).json({ success: true, message: "Password updated successfully!" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update password." });
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