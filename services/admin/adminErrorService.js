import User from '../../models/User.js';

export const recordAdminErrorLog = async (adminId, requestPath, clientIp) => {
    try {
        if (adminId) {
            await User.findOneAndUpdate(
                { _id: adminId, role: 'Admin' },
                { $set: { updatedAt: new Date() } }
            );
        }
        return { success: true };
    } catch (error) {
        throw new Error(`Service Layer DB error while logging admin 404 access: ${error.message}`);
    }
};