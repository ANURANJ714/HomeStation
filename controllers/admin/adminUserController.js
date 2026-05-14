import User from '../../models/User.js'; 
import { validateRegistrationData, createLocalUser } from '../../services/user/authService.js';

export const getUserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const search = req.query.search || '';
        const role = req.query.role || '';
        const status = req.query.status || '';
        const sort = req.query.sort || 'newest';

        let query = {};

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.role = role.charAt(0).toUpperCase() + role.slice(1); 
        }
        if (status) {
            query.status = status.charAt(0).toUpperCase() + status.slice(1);
        }

        let sortOption = {};
        switch (sort) {
            case 'oldest': sortOption = { createdAt: 1 }; break;
            case 'az': sortOption = { fullName: 1 }; break;
            case 'za': sortOption = { fullName: -1 }; break;
            case 'newest': 
            default: sortOption = { createdAt: -1 }; break;
        }

        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ status: 'Active' });
        const blockedUsers = await User.countDocuments({ status: 'Blocked' });

        const skip = (page - 1) * limit;
        const users = await User.find(query).sort(sortOption).skip(skip).limit(limit);
        const totalFiltered = await User.countDocuments(query);
        const totalPages = Math.ceil(totalFiltered / limit);

        res.render('admin/usermanagement', {
            admin: req.admin, 
            users,
            stats: { totalUsers, activeUsers, blockedUsers },
            filters: { search, role, status, sort },
            pagination: { page, totalPages, totalFiltered, limit }
        });

    } catch (error) {
        console.error("User Management Error:", error);
        res.status(500).send("Server Error");
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ success: false, message: 'Administrator accounts cannot be blocked.' });
        }

        user.status = user.status === 'Active' ? 'Blocked' : 'Active';
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: `User has been successfully ${user.status === 'Active' ? 'unblocked' : 'blocked'}.` 
        });

    } catch (error) {
        console.error("Toggle User Status Error:", error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

export const addUser = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        await validateRegistrationData(email, phone, password);
        await createLocalUser({ fullName, email, phone, password });

        res.status(201).json({ 
            success: true, 
            message: "User account created successfully." 
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "An internal server error occurred.";
        res.status(statusCode).json({ success: false, message });
    }
};