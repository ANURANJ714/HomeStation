import Review from '../../models/Review.js';
import Product from '../../models/Products.js';
import mongoose from 'mongoose';

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

export const getProductReviewsPreview = async (productId) => {
    try {
        const reviews = await Review.find({ productId })
            .populate('userId', 'fullName profileImage')
            .sort({ createdAt: -1 })
            .limit(2)
            .lean();

        const totalReviewsCount = await Review.countDocuments({ productId });

        return {
            reviews,
            totalReviewsCount
        };
    } catch (error) {
        throw new Error(`Database error while fetching reviews preview: ${error.message}`);
    }
};

export const getProductReviewsPaginated = async (productId, page = 1, limit = 5, sortMode = 'relevant') => {
    try {
        const query = { productId: new mongoose.Types.ObjectId(productId) };

        let sortOption = {};
        if (sortMode === 'lowest') {
            sortOption = { rating: 1, createdAt: -1 };
        } else if (sortMode === 'highest') {
            sortOption = { rating: -1, createdAt: -1 };
        } else if (sortMode === 'newest') {
            sortOption = { createdAt: -1 };
        } else {
            sortOption = {};
        }

        const totalReviews = await Review.countDocuments(query);
        const totalPages = Math.ceil(totalReviews / limit) || 1;
        const safePage = Math.max(1, Math.min(page, totalPages));
        const skip = (safePage - 1) * limit;

        let reviewsQuery = Review.find(query)
            .populate('userId', 'fullName profileImage')
            .skip(skip)
            .limit(limit);

        if (Object.keys(sortOption).length > 0) {
            reviewsQuery = reviewsQuery.sort(sortOption);
        }

        const reviews = await reviewsQuery.lean();

        const stats = await Review.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        const averageRating = stats.length > 0 ? stats[0].avgRating.toFixed(1) : '0.0';

        return {
            reviews,
            totalReviews,
            totalPages,
            currentPage: safePage,
            averageRating
        };
    } catch (error) {
        throw new Error(`Database error while fetching paginated reviews: ${error.message}`);
    }
};