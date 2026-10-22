import logger from '../../utils/logger.js';
import * as adminErrorService from '../../services/admin/adminErrorService.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

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
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                statusCode: STATUS_CODES.NOT_FOUND,
                message: "The requested admin route or resource was not found."
            });
        }

        const csrfToken = req.csrfToken ? req.csrfToken() : '';

        return res.status(STATUS_CODES.NOT_FOUND).render('admin/admin404error', {
            pageTitle: 'HomeStation - Admin 404 Not Found',
            user: (req.isAuthenticated && req.isAuthenticated()) ? req.user : (req.user || null),
            csrfToken
        });

    } catch (error) {
        logger.error(`Admin 404 Controller Failure (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);

        if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || COMMON_MESSAGES.SERVER_ERROR
            });
        }

        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('admin/admin500error', {
            pageTitle: 'HomeStation - Internal Error',
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};