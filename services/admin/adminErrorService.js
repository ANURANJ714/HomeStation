import User from '../../models/User.js';

export const recordAdminErrorLog = async (adminId, requestPath, clientIp) => {
    try {
        return { success: true, path: requestPath };
    } catch (error) {
        throw new Error(`Service Layer DB error while logging admin 404 access: ${error.message}`);
    }
};