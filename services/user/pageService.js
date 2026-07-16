import Product from '../../models/Products.js'; 
import ProductVariant from '../../models/ProductVariant.js';
import Category from '../../models/Category.js';
import EnquirySubject from '../../models/EnquirySubject.js';


export const getHomePageData = async () => {
    try {
        const categories = await Category.find({ isDeleted: false });

        const bestSellers = await Product.aggregate([
            { $match: { isDeleted: false } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            { $match: { 'category.isDeleted': false } },
            {
                $lookup: {
                    from: 'productvariants',
                    localField: '_id',
                    foreignField: 'productId',
                    as: 'variants'
                }
            },
            {
                $addFields: {
                    inStockVariants: {
                        $filter: {
                            input: '$variants',
                            as: 'v',
                            cond: { $gt: ['$$v.stock', 0] }
                        }
                    }
                }
            },
            { $match: { $expr: { $gt: [{ $size: '$inStockVariants' }, 0] } } },
            { $sample: { size: 4 } },
            {
                $addFields: {
                    firstVariant: { $arrayElemAt: ['$inStockVariants', 0] }
                }
            }
        ]);

        const topDeals = await ProductVariant.aggregate([
            { $match: { stock: { $gt: 0 } } },
            { $sort: { discount: -1 } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $match: { 'product.isDeleted': false } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            { $match: { 'category.isDeleted': false } },
            {
                $group: {
                    _id: '$productId',
                    variant: { $first: '$$ROOT' },
                    product: { $first: '$product' }
                }
            },
            { $sort: { 'variant.discount': -1 } },
            { $limit: 4 },
            {
                $project: {
                    _id: 0,
                    product: 1,
                    variant: '$variant'
                }
            }
        ]);

        return { categories, bestSellers, topDeals };

    } catch (error) {
        throw new Error(`Database error while fetching home page data: ${error.message}`);
    }
};

export const getFilteredContactSubjects = async (isAuthenticated) => {
    try {
        const queryFilter = { isDeleted: false };
        
        if (!isAuthenticated) {
            queryFilter.needAuth = false;
        }

        return await EnquirySubject.find(queryFilter).sort({ name: 1 }).lean();
    } catch (error) {
        throw new Error(`Service Layer breakdown pulling contact subjects context: ${error.message}`);
    }
};