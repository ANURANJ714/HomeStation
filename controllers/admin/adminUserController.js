import User from '../../models/User.js'; 
import { validateRegistrationData, createLocalUser } from '../../services/user/authService.js';
import * as userService from '../../services/admin/adminUserService.js';
import logger from '../../utils/logger.js';

export const getUserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const search = req.query.search ? String(req.query.search).trim() : '';
        const role = req.query.role ? String(req.query.role).trim() : '';
        const status = req.query.status ? String(req.query.status).trim() : '';
        const sort = req.query.sort ? String(req.query.sort).trim() : 'newest';

        const adminObj = req.admin || req.user || {};
        const adminEmail = adminObj.email || 'Unknown Admin';

        const data = await userService.getPaginatedUsers({
            page, limit, search, role, status, sort
        });

        logger.info(`Admin (${adminEmail}) loaded user management (Page: ${data.pagination.page}, Role: ${role || 'All'}, Status: ${status || 'All'}, Search: "${search}")`);

        res.render('admin/usermanagement', {
            admin: req.admin, 
            users: data.users,
            stats: data.stats,
            filters: { search, role, status, sort },
            pagination: data.pagination
        });

    } catch (error) {
        logger.error(`Error loading User Management page: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading the user management page."
        });
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const adminObj = req.admin || req.user || {};
        const adminEmail = adminObj.email || 'Unknown Admin';

        const result = await userService.toggleUserBlockStatus(user_id);

        if (result.isNotFound) {
            logger.warn(`Toggle user status failed: User ID ${user_id} not found. Attempted by: ${adminEmail}`);
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (result.isAdmin) {
            logger.warn(`Toggle user status blocked: Attempted to modify Administrator account (ID: ${user_id}). Attempted by: ${adminEmail}`);
            return res.status(403).json({ success: false, message: 'Administrator accounts cannot be blocked.' });
        }

        logger.info(`Admin (${adminEmail}) changed status of user "${result.userEmail}" (ID: ${user_id}) to ${result.newStatus}.`);

        return res.status(200).json({ 
            success: true, 
            message: `User has been successfully ${result.newStatus === 'Active' ? 'unblocked' : 'blocked'}.` 
        });

    } catch (error) {
        logger.error(`Error toggling status for User ID ${req.params.user_id}: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error.' 
        });
    }
};

export const addUser = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;
        
        const actorEmail = req.admin?.email || req.user?.email || 'System/Guest';

        if (password !== confirmPassword) {
            logger.warn(`Add user blocked: Passwords do not match for email "${email}". Attempted by: ${actorEmail}`);
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        await validateRegistrationData(email, phone, password);
        await createLocalUser({ fullName, email, phone, password });

        logger.info(`New user "${fullName}" (${email}) was created successfully by ${actorEmail}.`);

        res.status(201).json({ 
            success: true, 
            message: "User account created successfully." 
        });

    } catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "An internal server error occurred.";

        if (statusCode >= 500) {
            logger.error(`Critical error adding user (${req.body.email}): ${error.message}\nStack: ${error.stack}`);
        } else {
            logger.warn(`Add user validation failed for "${req.body.email}": ${message}`);
        }

        res.status(statusCode).json({ success: false, message });
    }
};