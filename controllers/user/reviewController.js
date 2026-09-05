import logger from '../../utils/logger.js';
import * as reviewService from '../../services/user/reviewService.js';

export const submitReview = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { productId, rating, comment } = req.body;

        if (!comment || comment.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Review comment must be at least 10 characters long.'
            });
        }

        const review = await reviewService.saveOrUpdateReview(userId, productId, rating, comment);

        logger.info(`User (${userEmail}) submitted review for Product [${productId}] with ${rating} stars | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: 'Your review has been saved successfully!',
            review
        });

    } catch (error) {
        logger.error(`Error saving review for User (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'An error occurred while submitting your review.'
        });
    }
};