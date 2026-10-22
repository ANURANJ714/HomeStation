import logger from '../utils/logger.js';
import { STATUS_CODES } from '../src/constants/httpStatusCodes.js';

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

        
    if (err.code === 'EBADCSRFTOKEN') {
        if (isApiRequest) {
            return res.status(STATUS_CODES.FORBIDDEN).json({
                success: false,
                isCsrfError: true,
                message: 'Your session has expired or the security token is invalid. Please refresh the page.'
            });
        }
        return res.status(STATUS_CODES.FORBIDDEN).render('user/403error', {
            pageTitle: 'HomeStation - Forbidden',
            message: 'Invalid or expired session security token. Please refresh and try again.',
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            user: req.user || null
        });
    }

    if (isApiRequest) {
        return res.status(err.status || err.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
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

    res.status(err.status || err.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).render(viewTemplate, {
        pageTitle,
        csrfToken,
        user, 
        message: 'Something went wrong on our end.'
    }, (renderErr, html) => {
        if (renderErr) {
            logger.error(`Render Error (${viewTemplate}): ${renderErr.message}`);
            return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'An internal server error occurred.'
            });
        }
        res.send(html);
    });
};