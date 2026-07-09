import session from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const userSession = session({
    name: 'user_session',
    secret: process.env.USER_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax'
    }
});

const adminSession = session({
    name: 'admin_session', 
    secret: process.env.ADMIN_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        collectionName: 'admin_sessions',
        path: '/' 
    }
});

export const sessionMiddleware = (req, res, next) => {
    if (req.originalUrl.startsWith('/admin')) {
        return adminSession(req, res, next);
    }
    return userSession(req, res, next);
};