export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        
        if (req.user.role === 'Admin') {
            return res.redirect('/admin/dashboard');
        }

        if (req.user.status && req.user.status.toLowerCase() === 'blocked') {
            req.logout((err) => {
                return res.redirect('/user/login?error=Account is blocked'); 
            });
            return;
        }

        return next(); 
    }
    
    return res.redirect('/user/login');
};

export const forwardAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        if (req.user.role === 'Admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/home'); 
    }
    next();
};

export const checkOptionalAuth = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
        return next();
    }
    
    if (req.user.role === 'Admin') {
        return res.redirect('/admin/dashboard');
    }

    if (req.user.status && req.user.status.toLowerCase() === 'blocked') {
        return req.logout((err) => {
            req.session.destroy(() => {
                res.clearCookie('user_session');
                res.redirect('/user/login?error=Account is blocked'); 
            });
        });
    }

    return next(); 
};