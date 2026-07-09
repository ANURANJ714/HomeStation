import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, align, json } = winston.format;

const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD hh:mm:ss.SSS A' }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    
    format: combine(
        timestamp(),
        json()
    ),
    
    transports: [
        new winston.transports.File({ 
            filename: path.join(process.cwd(), 'logs', 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(process.cwd(), 'logs', 'combined.log') 
        })
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

export default logger;