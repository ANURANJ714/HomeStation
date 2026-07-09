import User from '../../models/User.js';

export const getPaginatedUsers = async (params) => {
    try {
        const { page, limit, search, role, status, sort } = params;

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

        let sortOption = { createdAt: -1 };
        switch (sort) {
            case 'oldest': sortOption = { createdAt: 1 }; break;
            case 'az': sortOption = { fullName: 1 }; break;
            case 'za': sortOption = { fullName: -1 }; break;
            case 'newest': 
            default: sortOption = { createdAt: -1 }; break;
        }

        const [totalUsers, activeUsers, blockedUsers, totalFiltered] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ status: 'Active' }),
            User.countDocuments({ status: 'Blocked' }),
            User.countDocuments(query)
        ]);

        const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
        const safePage = Math.min(page, Math.max(1, totalPages));
        const skip = (safePage - 1) * limit;

        const users = await User.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean(); // 

        return {
            users,
            stats: { totalUsers, activeUsers, blockedUsers },
            pagination: { page: safePage, totalPages, totalFiltered, limit }
        };

    } catch (error) {
        throw new Error(`Database error while fetching user management data: ${error.message}`);
    }
};

export const toggleUserBlockStatus = async (userId) => {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            return { isNotFound: true };
        }

        if (user.role === 'Admin') {
            return { isAdmin: true };
        }

        user.status = user.status === 'Active' ? 'Blocked' : 'Active';
        await user.save();

        return { 
            isUpdated: true, 
            newStatus: user.status, 
            userEmail: user.email 
        };

    } catch (error) {
        throw new Error(`Database error while toggling user status: ${error.message}`);
    }
};