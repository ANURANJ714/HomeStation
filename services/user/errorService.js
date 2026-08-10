import logger from '../../utils/logger.js';

export const processNotFoundAnalytics = async (requestContext) => {
    try {
        const { path, ip, userId } = requestContext;

        return {
            logged: true,
            path
        };
    } catch (error) {
        logger.error(`Error in Service Layer handling 404 context: ${error.message}`, { stack: error.stack });
        throw new Error(`Failed processing error service metrics: ${error.message}`);
    }
};