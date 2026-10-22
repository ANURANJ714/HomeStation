import logger from '../../utils/logger.js';
import * as reviewService from '../../services/user/reviewService.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const submitReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { productId, rating, comment } = req.body;

        if (!comment || comment.trim().length < 10) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Review comment must be at least 10 characters long.'
            });
        }

        const review = await reviewService.saveOrUpdateReview(userId, productId, rating, comment);

        logger.info(`User (${userEmail}) submitted review for Product [${productId}] with ${rating} stars | IP: ${clientIp}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: 'Your review has been saved successfully!',
            review
        });

    } catch (error) {
        logger.error(`Error saving review for User (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);

        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};