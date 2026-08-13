import User from '../models/User.js';

// export const verifyAdmin = (req, res, next) => {
//     if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
//         return next(); 
//     }
    
//     res.redirect('/admin/login');
// };

export const verifyAdmin = (req, res, next) => {
    console.log(`[DEBUG verifyAdmin] Intercepted path: ${req.originalUrl}`);
    
    if (req.isAuthenticated() && req.user && req.user.role === 'Admin') {
        return next(); 
    }
    
    console.log(`[DEBUG verifyAdmin] Redirecting unauthenticated user from: ${req.originalUrl}`);
    res.redirect('/admin/login');
};
