import { csrfSync } from 'csrf-sync';

const { csrfSynchronisedProtection, generateToken } = csrfSync({
    getTokenFromRequest: (req) => {
        if (req.headers['csrf-token']) {
            return req.headers['csrf-token'];
        }
        
        if (req.body && req.body._csrf) {
            return req.body._csrf;
        }

        return ''; 
    }
});

export const csrfProtection = csrfSynchronisedProtection;

export const injectCsrfToken = (req, res, next) => {
    res.locals.csrfToken = generateToken(req);
    next();
};