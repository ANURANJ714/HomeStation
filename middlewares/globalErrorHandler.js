import logger from '../utils/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
    logger.error(`Global Exception Intercepted: ${err.message}`, { 
        stack: err.stack,
        url: req.originalUrl,
        ip: req.ip 
    });

    const isApiRequest = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isApiRequest) {
        return res.status(err.status || 500).json({
            success: false,
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal Server Error occurred.' 
                : err.message
        });
    }

    res.status(err.status || 500).render('user/500error', {
        message: 'Something went wrong on our end.'
    }, (renderErr, html) => {
        if (renderErr) {
            return res.status(500).json({
                success: false,
                message: 'An internal server error occurred.'
            });
        }
        res.send(html);
    });
};