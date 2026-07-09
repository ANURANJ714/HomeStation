import Product from '../../models/Products.js'; 
import ProductVariant from '../../models/ProductVariant.js';
import Category from '../../models/Category.js';

export const getHomePageData = async () => {
    try {
        const categories = await Category.find({ isDeleted: false });

        const bestSellers = await Product.aggregate([
            { $match: { isDeleted: false } },
            { $sample: { size: 4 } }, 
            {
                $lookup: {
                    from: 'productvariants', 
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variants'
                }
            },
            { $addFields: { firstVariant: { $arrayElemAt: ['$variants', 0] } } },
            { $match: { firstVariant: { $exists: true } } } 
        ]);

        const topDeals = await ProductVariant.aggregate([
            { $sort: { discount: -1 } }, 
            {
                $group: {
                    _id: '$productId', 
                    variant: { $first: '$$ROOT' } 
                }
            },
            { $sort: { 'variant.discount': -1 } }, 
            { $limit: 4 }, 
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' }, 
            { $match: { 'product.isDeleted': false } }
        ]);

        return { categories, bestSellers, topDeals };

    } catch (error) {
        throw new Error(`Database error while fetching home page data: ${error.message}`);
    }
};