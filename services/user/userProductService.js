import Product from '../../models/Products.js';
import ProductVariant from '../../models/ProductVariant.js';
import Category from '../../models/Category.js';

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

export const getCatalogPageMetadata = async (categoryId) => {
    try {
        const activeCategories = await Category.find({ isDeleted: false }).lean();
        
        let pageHeading = "All Mattresses";
        if (categoryId && categoryId !== 'all') {
            const activeCategoryDoc = await Category.findOne({ _id: categoryId, isDeleted: false });
            if (activeCategoryDoc) {
                pageHeading = activeCategoryDoc.name;
            }
        }

        return {
            categories: activeCategories,
            pageHeading
        };
    } catch (error) {
        throw new Error(`Service Layer failure handling catalog page metadata: ${error.message}`);
    }
};

export const getUniqueActiveBrands = async () => {
    try {
        return await Product.distinct('brand', { isDeleted: false });
    } catch (error) {
        throw new Error(`Failed to pull distinct brands: ${error.message}`);
    }
};


export const getFilteredProductsCatalog = async (filters) => {
    try {
        const { category, brands, sort, searchQuery, page, limit } = filters;

        let matchedCategoryIds = [];
        if (category && category !== 'all') {
            matchedCategoryIds = [category];
        } else {
            const activeCategories = await Category.find({ isDeleted: false }).select('_id');
            matchedCategoryIds = activeCategories.map(c => typeof c._id !== 'undefined' ? c._id : c);
        }

        let productMatchQuery = {
            isDeleted: false,
            categoryId: { $in: matchedCategoryIds }
        };

        if (brands && brands.length > 0) {
            productMatchQuery.brand = { $in: brands };
        }

        if (searchQuery) {
            productMatchQuery.name = { $regex: searchQuery, $options: 'i' };
        }

        const baseProductsList = await Product.find(productMatchQuery).lean();
        const finalCatalog = [];

        for (const product of baseProductsList) {
            const variants = await ProductVariant.find({ productId: product._id }).sort({ originalPrice: 1 }).lean();

            let totalStockAccumulator = 0;
            let firstInStockVariant = null;

            variants.forEach(variant => {
                totalStockAccumulator += variant.stock;
                
                if (variant.stock > 0 && !firstInStockVariant) {
                    const finalCalculatedPrice = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));
                    firstInStockVariant = {
                        ...variant,
                        calculatedPrice: finalCalculatedPrice
                    };
                }
            });

            if (totalStockAccumulator > 0 && firstInStockVariant) {
                finalCatalog.push({
                    ...product,
                    displayVariant: firstInStockVariant
                });
            }
        }

        if (sort === 'lowToHigh') {
            finalCatalog.sort((a, b) => a.displayVariant.calculatedPrice - b.displayVariant.calculatedPrice);
        } else if (sort === 'highToLow') {
            finalCatalog.sort((a, b) => b.displayVariant.calculatedPrice - a.displayVariant.calculatedPrice);
        }

        const totalItemsCount = finalCatalog.length;
        const totalPagesCount = Math.ceil(totalItemsCount / limit);
        const startIndexOffset = (page - 1) * limit;
        const paginatedResultItems = finalCatalog.slice(startIndexOffset, startIndexOffset + limit);

        return {
            products: paginatedResultItems,
            totalItems: totalItemsCount,
            totalPages: totalPagesCount
        };

    } catch (error) {
        throw new Error(`Catalog engine processing failed: ${error.message}`);
    }
};

export const getValidatedProductDetails = async (productId) => {
    try {
        const product = await Product.findOne({ _id: productId, isDeleted: false }).lean();
        if (!product) {
            const error = new Error("Requested product is no longer active.");
            error.reason = 'UNAVAILABLE';
            throw error;
        }

        const category = await Category.findOne({ _id: product.categoryId, isDeleted: false }).lean();
        if (!category) {
            const error = new Error("Parent category context dropped.");
            error.reason = 'UNAVAILABLE';
            throw error;
        }

        const rawVariants = await ProductVariant.find({ productId: product._id }).lean();
        const activeInStockVariants = [];
        let runningTotalStockValue = 0;

        rawVariants.forEach(v => {
            runningTotalStockValue += v.stock;
            if (v.stock > 0) {
                const calculatedPrice = Math.round(v.originalPrice * (1 - (v.discount || 0) / 100));
                activeInStockVariants.push({
                    ...v,
                    calculatedPrice
                });
            }
        });

        if (runningTotalStockValue <= 0 || activeInStockVariants.length === 0) {
            const error = new Error("Product variant inventory is out of stock.");
            error.reason = 'OUT_OF_STOCK';
            throw error;
        }

        const analyticalMatches = await Product.aggregate([
            { $match: { _id: { $ne: product._id }, categoryId: category._id, isDeleted: false } },
            { $sample: { size: 4 } },
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
            { $match: { $expr: { $gt: [{ $size: '$inStockVariants' }, 0] } } }
        ]);

        const processedSuggestionsDeck = analyticalMatches.map(p => {
            const primaryOption = p.inStockVariants[0];
            const calculatedPrice = Math.round(primaryOption.originalPrice * (1 - (primaryOption.discount || 0) / 100));
            return {
                ...p,
                displayVariant: {
                    ...primaryOption,
                    calculatedPrice
                }
            };
        });

        return {
            product,
            variants: activeInStockVariants,
            relatedProducts: processedSuggestionsDeck
        };

    } catch (error) {
        if (error.reason) throw error;
        throw new Error(`Data mapping transaction failed on service resolution: ${error.message}`);
    }
};