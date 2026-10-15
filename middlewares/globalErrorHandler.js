import logger from '../utils/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
    logger.error(`Global Exception Intercepted: ${err.message}`, { 
        stack: err.stack,
        url: req.originalUrl,
        ip: req.ip 
    });

    const isAdminRoute = req.originalUrl.startsWith('/admin');
    
    const isApiRequest = 
        req.xhr || 
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));

    const isCsrfError = err.code === 'EBADCSRFTOKEN' || err.message?.includes('invalid csrf token');
        
    if (isCsrfError) {
        if (isApiRequest) {
            return res.status(403).json({
                success: false,
                isCsrfError: true,
                message: 'Your session has expired or the security token is invalid. Please refresh the page.'
            });
        }

        const viewTemplate = isAdminRoute ? 'admin/admin500error' : 'user/500error';
        return res.status(403).render(viewTemplate, {
            pageTitle: 'HomeStation - Session Expired',
            message: 'Your session has expired or the security token is invalid. Please refresh the page.',
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            user: (req.isAuthenticated && req.isAuthenticated()) ? req.user : (req.user || null)
        }, (renderErr, html) => {
            if (renderErr) {
                logger.error(`Render Error (${viewTemplate}): ${renderErr.message}`);
                return res.status(403).send('403 Forbidden: Invalid or expired security token. Please refresh the page.');
            }
            res.send(html);
        });
    }

    if (isApiRequest) {
        return res.status(err.status || err.statusCode || 500).json({
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

    res.status(err.status || err.statusCode || 500).render(viewTemplate, {
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