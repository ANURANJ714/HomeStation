import logger from '../utils/logger.js';
import { STATUS_CODES } from '../src/constants/httpStatusCodes.js';

export const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const ms = Date.now() - start;
        const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`;

        if (res.statusCode >= STATUS_CODES.INTERNAL_SERVER_ERROR) {
            logger.error(message);
        } else if (res.statusCode >= STATUS_CODES.BAD_REQUEST) {
            logger.warn(message);
        } else {
            logger.info(message);
        }
    });

    next();
};