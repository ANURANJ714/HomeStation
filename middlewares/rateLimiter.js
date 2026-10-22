import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import { STATUS_CODES } from '../src/constants/httpStatusCodes.js';

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 500,
    standardHeaders: true,
    legacyHeaders: false, 
    handler: (req, res) => {
        logger.warn(`Global rate limit exceeded by IP: ${req.ip} on path: ${req.originalUrl}`);
        
        return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({
            success: false,
            message: 'Too many requests from this IP address. Please try again after 15 minutes.'
        });
    }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Auth brute-force blocked for IP: ${req.ip} on endpoint: ${req.originalUrl}`);
        
        return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({
            success: false,
            message: 'Too many authentication attempts. For security reasons, please try again after 15 minutes.'
        });
    }
});

export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`OTP rate limit hit by IP: ${req.ip} on: ${req.originalUrl}`);
        
        return res.status(STATUS_CODES.TOO_MANY_REQUESTS).json({
            success: false,
            message: 'Too many OTP requests. Please wait 10 minutes before requesting a new code.'
        });
    }
});