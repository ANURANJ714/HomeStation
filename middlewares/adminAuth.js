import User from '../models/User.js';

export const verifyAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
        return next(); 
    }
    
    res.redirect('/admin/login');
};

export const forwardAdminAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
        return res.redirect('/admin/dashboard'); 
    }
    next();
};