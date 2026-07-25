import { csrfSync } from 'csrf-sync';

export const { csrfSynchronisedProtection, generateToken } = csrfSync({
    getTokenFromRequest: (req) => {
        return (
            req.headers['x-csrf-token'] ||
            req.headers['csrf-token'] ||
            (req.body && req.body._csrf) ||
            ''
        );
    }
});

export const injectCsrfToken = (req, res, next) => {
    const token = generateToken(req);
    res.locals.csrfToken = token;

    req.csrfToken = () => token;

    next();
};

export const csrfProtection = csrfSynchronisedProtection;