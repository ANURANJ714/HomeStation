import logger from '../../utils/logger.js';
import * as adminErrorService from '../../services/admin/adminErrorService.js';

export const handleAdminNotFound = async (req, res) => {
    try {
        const clientIp = req.ip;
        const requestedPath = req.originalUrl;
        const adminEmail = req.user?.email || 'Unauthenticated Admin';
        const adminId = req.user?._id || null;

        logger.warn(`Admin 404 Intercepted: [${req.method}] ${requestedPath} by (${adminEmail}) | IP: ${clientIp}`);

        await adminErrorService.recordAdminErrorLog(adminId, requestedPath, clientIp);

        const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

        if (isApiRequest) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: "The requested admin route or resource was not found."
            });
        }

        const csrfToken = req.csrfToken ? req.csrfToken() : '';

        return res.status(404).render('admin/admin404error', {
            pageTitle: 'HomeStation - Admin 404 Not Found',
            user: (req.isAuthenticated && req.isAuthenticated()) ? req.user : (req.user || null),
            csrfToken
        });

    } catch (error) {
        logger.error(`Admin 404 Controller Failure (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);

        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(500).json({
                success: false,
                message: "Server error occurred while rendering admin 404 page."
            });
        }

        return res.status(500).render('admin/admin500error', {
            pageTitle: 'HomeStation - Internal Error',
            message: 'An unexpected error occurred.'
        });
    }
};