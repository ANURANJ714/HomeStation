import Review from '../../models/Review.js';
import Product from '../../models/Products.js';

export const saveOrUpdateReview = async (userId, productId, rating, comment) => {
    try {
        if (!productId || !rating || !comment) {
            const err = new Error('Product, rating, and review comment are required.');
            err.statusCode = 400;
            throw err;
        }

        const numRating = parseInt(rating, 10);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            const err = new Error('Rating must be an integer between 1 and 5.');
            err.statusCode = 400;
            throw err;
        }

        const trimmedComment = comment.trim();
        if (trimmedComment.length < 10) {
            const err = new Error('Review comment must be at least 10 characters long.');
            err.statusCode = 400;
            throw err;
        }

        const productExists = await Product.findById(productId).lean();
        if (!productExists || productExists.isDeleted) {
            const err = new Error('Product not found or is no longer available.');
            err.statusCode = 404;
            throw err;
        }

        const savedReview = await Review.findOneAndUpdate(
            { userId, productId },
            { 
                $set: { 
                    rating: numRating, 
                    comment: trimmedComment 
                } 
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return savedReview;
    } catch (error) {
        throw error;
    }
};

export const getUserReviewsForProducts = async (userId, productIds) => {
    try {
        if (!userId || !productIds || productIds.length === 0) return {};

        const reviews = await Review.find({
            userId,
            productId: { $in: productIds }
        }).lean();

        const reviewMap = {};
        reviews.forEach(r => {
            reviewMap[r.productId.toString()] = r;
        });

        return reviewMap;
    } catch (error) {
        throw new Error(`Failed to fetch user reviews: ${error.message}`);
    }
};