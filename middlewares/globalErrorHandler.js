import logger from '../utils/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
    logger.error(`Global Exception Intercepted: ${err.message}`, { 
        stack: err.stack,
        url: req.originalUrl,
        ip: req.ip 
    });

    const isAdminRoute = req.originalUrl.startsWith('/admin');
    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isApiRequest) {
        return res.status(err.status || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal Server Error occurred.' 
                : err.message
        });
    }

    const viewTemplate = isAdminRoute ? 'admin/admin500error' : 'user/500error';
    const pageTitle = isAdminRoute ? 'HomeStation - Admin Server Error' : 'HomeStation - Server Error';
    const csrfToken = req.csrfToken ? req.csrfToken() : '';
    
    const user = (req.isAuthenticated && req.isAuthenticated()) ? req.user : (req.user || null);

    res.status(err.status || 500).render(viewTemplate, {
        pageTitle,
        csrfToken,
        user, 
        message: 'Something went wrong on our end.'
    }, (renderErr, html) => {
        if (renderErr) {
            logger.error(`Render Error (${viewTemplate}): ${renderErr.message}`);
            return res.status(500).json({
                success: false,
                message: 'An internal server error occurred.'
            });
        }
        res.send(html);
    });
};