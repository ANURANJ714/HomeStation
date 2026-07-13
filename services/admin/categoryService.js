import Category from '../../models/Category.js';
import Product from '../../models/Products.js';
import ProductVariant from '../../models/ProductVariant.js';
import { calculateProductStats } from '../../services/admin/productService.js';

export const getPaginatedCategories = async (sortQuery, page, limit, searchQuery = '') => {
    try {
        let sortCriteria = { createdAt: -1 };
        switch (sortQuery) {
            case 'oldest': sortCriteria = { createdAt: 1 }; break;
            case 'az': sortCriteria = { name: 1 }; break;
            case 'za': sortCriteria = { name: -1 }; break;
            case 'newest':
            default: sortCriteria = { createdAt: -1 }; break;
        }

        let filterConditions = {};
        if (searchQuery && searchQuery.trim() !== '') {
            filterConditions.name = { $regex: searchQuery.trim(), $options: 'i' };
        }

        const skip = (page - 1) * limit;
        
        const [totalCategories, rawCategories] = await Promise.all([
            Category.countDocuments(filterConditions),
            Category.find(filterConditions)
                .sort(sortCriteria)
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const categoriesWithProductCounts = await Promise.all(
            rawCategories.map(async (category) => {
                const productCount = await Product.countDocuments({ 
                    categoryId: category._id,
                    isDeleted: false 
                });
                
                return {
                    ...category,
                    productCount
                };
            })
        );

        const totalPages = Math.max(1, Math.ceil(totalCategories / limit));
        
        return { categories: categoriesWithProductCounts, totalPages };
        
    } catch (error) {
        throw new Error(`Database error while fetching categories: ${error.message}`);
    }
};

export const createCategory = async (name, imagePath) => {
    try {
        const trimmedName = name.trim();

        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
        });

        if (existingCategory) {
            return { 
                isCreated: false, 
                message: `The category "${trimmedName}" already exists.` 
            };
        }
        
        const newCategory = new Category({
            name: trimmedName,
            image: imagePath 
        });

        await newCategory.save();

        return { isCreated: true, category: newCategory };
    } catch (error) {
        throw new Error(`Database error while creating category: ${error.message}`);
    }
};

export const softDeleteCategory = async (categoryId) => {
    try {
        return await Category.findByIdAndUpdate(
            categoryId, 
            { isDeleted: true }, 
            { returnDocument: 'after' }
        );
    } catch (error) {
        throw new Error(`Database error while deleting category: ${error.message}`);
    }
};

export const restoreSoftDeletedCategory = async (categoryId) => {
    try {
        return await Category.findByIdAndUpdate(
            categoryId, 
            { isDeleted: false }, 
            { returnDocument: 'after' }
        );
    } catch (error) {
        throw new Error(`Database error while restoring category: ${error.message}`);
    }
};

export const updateCategoryDetails = async (categoryId, name, imagePath) => {
    try {
        const trimmedName = name.trim();

        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
            _id: { $ne: categoryId } 
        });

        if (existingCategory) {
            return { 
                isUpdated: false, 
                message: `Another category is already named "${trimmedName}".` 
            };
        }

        const updateData = { name: trimmedName };
        if (imagePath) {
            updateData.image = imagePath;
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            updateData,
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedCategory) {
            return { isUpdated: false, isNotFound: true, message: "Category not found." };
        }

        return { isUpdated: true, category: updatedCategory };
    } catch (error) {
        throw new Error(`Database error while updating category: ${error.message}`);
    }
};

export const getCategoryWithProducts = async (categoryId, options) => {
    try {
        const { page, limit, sortQuery, searchQuery } = options;

        const category = await Category.findById(categoryId).lean();
        if (!category) {
            return { isNotFound: true };
        }

        let sortOption = { createdAt: -1 };
        if (sortQuery === 'oldest') sortOption = { createdAt: 1 };
        if (sortQuery === 'az') sortOption = { name: 1 };
        if (sortQuery === 'za') sortOption = { name: -1 };

        let dbQuery = { categoryId: category._id, isDeleted: false };
        if (searchQuery) {
            dbQuery.name = { $regex: searchQuery, $options: 'i' };
        }

        const totalProducts = await Product.countDocuments(dbQuery);
        const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
        const safePage = Math.min(page, Math.max(1, totalPages));
        const safeSkip = (safePage - 1) * limit;

        const products = await Product.find(dbQuery)
            .sort(sortOption)
            .skip(safeSkip)
            .limit(limit);

        const productsWithStats = await Promise.all(products.map(async (product) => {
            const variants = await ProductVariant.find({ productId: product._id }).lean();
            const stats = calculateProductStats(variants);
            
            const productData = product.toObject();
            productData.variants = stats.variantsWithPrices;
            productData.calculatedStock = stats.totalStock;
            productData.priceDisplay = stats.priceDisplay;
            productData.stockStatus = stats.stockStatus;
            productData.badgeClass = stats.badgeClass;

            if (stats.stockStatus === 'In Stock') productData.dotClass = 'status-in-stock';
            else if (stats.stockStatus === 'Low Stock') productData.dotClass = 'status-low-stock';
            else productData.dotClass = 'status-out-of-stock';

            return productData;
        }));

        return {
            isNotFound: false,
            category,
            products: productsWithStats,
            pagination: { safePage, totalPages, totalProducts }
        };

    } catch (error) {
        throw new Error(`Database error while fetching category products: ${error.message}`);
    }
};