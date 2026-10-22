import logger from '../../utils/logger.js';
import * as errorService from '../../services/user/errorService.js';
import * as bannerService from '../../services/user/bannerService.js';
import { getUserHeaderCounts } from '../../services/user/badgeService.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const handleNotFound = async (req, res) => {
    try {
        const path = req.originalUrl;
        const isAdmin = path.startsWith('/admin');
        const isApiRequest = req.xhr || req.headers.accept?.includes('application/json');

        logger.warn(`404 Page Not Found Access: [${req.method}] ${path} | IP: ${req.ip}`);

        await errorService.processNotFoundAnalytics({
            path,
            ip: req.ip,
            userId: req.user?._id || null
        });

        if (isApiRequest) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                statusCode: STATUS_CODES.NOT_FOUND,
                message: COMMON_MESSAGES.NOT_FOUND
            });
        }

        if (isAdmin) {
            return res.status(STATUS_CODES.NOT_FOUND).render('admin/admin404error', {
                pageTitle: 'Admin - Page Not Found',
                path: req.originalUrl,
                csrfToken: req.csrfToken ? req.csrfToken() : ''
            });
        }

        const user = (req.isAuthenticated && req.isAuthenticated()) ? req.user : (req.user || null);
        const userId = user ? user._id : null;

        const [promoBannerText, headerCounts] = await Promise.all([
            bannerService.getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        return res.status(STATUS_CODES.NOT_FOUND).render('user/404error', {
            pageTitle: 'HomeStation - Page Not Found',
            bannerText: promoBannerText, 
            user,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error inside handleNotFound controller: ${error.message}`, { stack: error.stack });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || COMMON_MESSAGES.SERVER_ERROR
            });
        }

        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).render('user/500error', { 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};