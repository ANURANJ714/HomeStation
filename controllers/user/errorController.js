import logger from '../../utils/logger.js';
import * as errorService from '../../services/user/errorService.js';
import * as bannerService from '../../services/user/bannerService.js';

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
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: "Requested resource or route was not found on the server."
            });
        }

        if (isAdmin) {
            return res.status(404).render('admin/admin404error', {
                pageTitle: 'Admin - Page Not Found',
                path: req.originalUrl,
                csrfToken: req.csrfToken ? req.csrfToken() : ''
            });
        }

        const promoBannerText = await bannerService.getActivePromoBanner();

        return res.status(404).render('user/404error', {
            pageTitle: 'HomeStation - Page Not Found',
            promoBanner: promoBannerText, 
            user: (req.isAuthenticated && req.isAuthenticated()) ? req.user : (req.user || null),
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error inside handleNotFound controller: ${error.message}`, { stack: error.stack });

        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: "An internal server error occurred while loading the page."
            });
        }

        return res.status(500).render('user/500error', { message: 'Internal Server Error' });
    }
};