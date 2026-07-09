import Product from '../../models/Products.js';
import ProductVariant from '../../models/ProductVariant.js';
import Category from '../../models/Category.js';
import Banner from '../../models/Banner.js';

export const getActiveBanner = async () => {
    return await Banner.findOne({}).lean();
};

export const getActiveCategories = async () => {
    return await Category.find({ isDeleted: false }).sort({ name: 1 }).lean();
};

export const getProductsPageData = async (queryOptions) => {
    const { searchQuery, categoryFilter, maxPriceFilter, safeSkip, limit } = queryOptions;

    let dbQuery = { isDeleted: false };

    if (categoryFilter) {
        dbQuery.categoryId = categoryFilter;
    } else {
        const activeCategories = await Category.find({ isDeleted: false });
        dbQuery.categoryId = { $in: activeCategories.map(c => c._id) };
    }

    if (searchQuery) {
        dbQuery.name = { $regex: searchQuery, $options: 'i' };
    }

    const rawProducts = await Product.find(dbQuery)
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .lean();

    let processedProducts = await Promise.all(rawProducts.map(async (product) => {
        const primaryVariant = await ProductVariant.findOne({ productId: product._id }).lean();
        
        if (!primaryVariant) return null;

        const originalPrice = primaryVariant.originalPrice || 0;
        const discount = primaryVariant.discount || 0;
        const currentPrice = originalPrice - (originalPrice * (discount / 100));

        return {
            ...product,
            originalPrice,
            discount,
            currentPrice,
            stock: primaryVariant.stock || 0
        };
    }));

    processedProducts = processedProducts.filter(p => p !== null);

    if (maxPriceFilter) {
        processedProducts = processedProducts.filter(p => p.currentPrice <= maxPriceFilter);
    }

    const totalCount = processedProducts.length;
    const paginatedResults = processedProducts.slice(safeSkip, safeSkip + limit);

    return {
        products: paginatedResults,
        totalCount
    };
};