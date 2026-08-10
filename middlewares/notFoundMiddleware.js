import { handleNotFound } from '../controllers/user/errorController.js';
import { handleAdminNotFound } from '../controllers/admin/adminErrorController.js';

export const notFoundMiddleware = (req, res, next) => {
    if (req.originalUrl.startsWith('/admin')) {
        return handleAdminNotFound(req, res);
    }
    
    return handleNotFound(req, res);
};