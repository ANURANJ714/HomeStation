import Product from '../../models/Products.js';
import ProductVariant from '../../models/ProductVariant.js';
import Category from "../../models/Category.js";
import mongoose from 'mongoose';

export const calculateProductStats = (variants) => {
    try {
        if (!Array.isArray(variants)) {
            throw new TypeError("Expected 'variants' to be an array.");
        }

        let totalStock = 0;
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        variants.forEach(variant => {
            if (!variant) return;

            totalStock += variant.stock || 0;
            
            let origPrice = Number(variant.originalPrice) || 0;
            let currentPrice = origPrice;

            if (variant.discount && Number(variant.discount) > 0) {
                currentPrice = origPrice - (origPrice * (Number(variant.discount) / 100));
            }

            variant.originalPrice = origPrice;
            variant.currentPrice = currentPrice;

            if (origPrice < minPrice) minPrice = origPrice;
            if (origPrice > maxPrice) maxPrice = origPrice;
        });

        let priceDisplay = "N/A";
        if (minPrice !== Infinity) {
            if (minPrice === maxPrice) {
                priceDisplay = `₹${Math.round(minPrice).toLocaleString('en-IN')}`;
            } else {
                priceDisplay = `₹${Math.round(minPrice).toLocaleString('en-IN')} - ₹${Math.round(maxPrice).toLocaleString('en-IN')}`;
            }
        }

        let stockStatus = 'In Stock';
        let badgeClass = 'badge-success';

        if (totalStock === 0) {
            stockStatus = 'Out of Stock';
            badgeClass = 'badge-danger';
        } else if (totalStock <= 10) { 
            stockStatus = 'Low Stock';
            badgeClass = 'badge-warning'; 
        }

        return { 
            totalStock, 
            priceDisplay, 
            stockStatus, 
            badgeClass, 
            variantsWithPrices: variants 
        };
    } catch (error) {
        throw new Error(`Failed to calculate product stats: ${error.message}`);
    }
};

export const getAdminProductsPageData = async (page, limit, searchQuery, statusFilter) => {
    try {
        let dbQuery = { isDeleted: false };

        const categories = await Category.find({ isDeleted: false });
        const activeCategoryIds = categories.map((cat) => cat._id);
        dbQuery.categoryId = { $in: activeCategoryIds };

        if (searchQuery) {
            dbQuery.name = { $regex: searchQuery, $options: "i" };
        }

        if (statusFilter !== "all") {
            const matchedProducts = await Product.find(dbQuery).lean();
            const matchedIds = matchedProducts.map((p) => p._id);
            
            const stockData = await ProductVariant.aggregate([
                { $match: { productId: { $in: matchedIds } } },
                { $group: { _id: "$productId", totalStock: { $sum: "$stock" } } }
            ]);

            const stockMap = {};
            stockData.forEach((item) => {
                stockMap[item._id.toString()] = item.totalStock;
            });

            const filteredIds = matchedProducts.filter((product) => {
                const stock = stockMap[product._id.toString()] || 0;
                if (statusFilter === "outstock") return stock === 0;
                if (statusFilter === "lowstock") return stock > 0 && stock <= 10;
                if (statusFilter === "instock") return stock > 10;
                return true;
            }).map((product) => product._id);

            dbQuery._id = { $in: filteredIds };
        }

        const totalProducts = await Product.countDocuments(dbQuery);
        const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
        const safePage = Math.min(page, Math.max(1, totalPages));
        const safeSkip = (safePage - 1) * limit;

        const products = await Product.find(dbQuery)
            .populate("categoryId", "name")
            .sort({ createdAt: -1 })
            .skip(safeSkip)
            .limit(limit);

        const productsWithVariants = await Promise.all(products.map(async (product) => {
            const variants = await ProductVariant.find({ productId: product._id }).lean();
            const stats = calculateProductStats(variants);

            const productData = product.toObject();
            productData.variants = stats.variantsWithPrices;
            productData.calculatedStock = stats.totalStock;
            productData.priceDisplay = stats.priceDisplay;
            productData.stockStatus = stats.stockStatus;
            productData.badgeClass = stats.badgeClass;

            return productData;
        }));

        return {
            products: productsWithVariants,
            categories,
            totalProducts,
            totalPages,
            safePage
        };

    } catch (error) {
        throw new Error(`Database error while fetching admin products: ${error.message}`);
    }
};

const generateProductId = async () => {
    const lastProduct = await Product.findOne().sort({ createdAt: -1 });

    if (!lastProduct || !lastProduct.productId) {
        return 'PRD-0001';
    }

    const lastIdString = lastProduct.productId;
    const lastIdNumber = parseInt(lastIdString.split('-')[1]);

    if (isNaN(lastIdNumber)) {
        return `PRD-${Date.now()}`; 
    }

    const nextIdNumber = lastIdNumber + 1;
    return `PRD-${nextIdNumber.toString().padStart(4, '0')}`;
};

export const createProductWithVariants = async (productData, variantDataStr, imageUrls) => {
    try {
        const newProductId = await generateProductId();

        let parsedVariants = [];
        if (variantDataStr) {
            try {
                parsedVariants = typeof variantDataStr === 'string' ? JSON.parse(variantDataStr) : variantDataStr;
            } catch (error) {
                const err = new Error('Failed to parse variant data.');
                err.statusCode = 400;
                throw err;
            }
        }

        if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
            const incomingNamesSet = new Set();

            for (const variant of parsedVariants) {
                if (!variant.variantName || variant.variantName.trim() === '') {
                    const err = new Error('Variant name cannot be empty.');
                    err.statusCode = 400;
                    throw err;
                }

                const normalizedName = variant.variantName.trim().toLowerCase();

                if (incomingNamesSet.has(normalizedName)) {
                    const err = new Error(`Duplicate variant name detected in your submission: "${variant.variantName.trim()}". Each variant name must be unique.`);
                    err.statusCode = 400;
                    throw err;
                }
                incomingNamesSet.add(normalizedName);
            }
        }

        const newProduct = new Product({
            productId: newProductId,
            name: productData.name,
            categoryId: productData.categoryId,
            description: productData.description,
            brand: productData.brand.trim(),
            material: productData.material,
            warranty: productData.warranty,  
            specifications: productData.specifications,
            images: imageUrls
        });

        const savedProduct = await newProduct.save();

        if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
            const variantDocuments = parsedVariants.map(variant => ({
                productId: savedProduct._id,
                variantName: variant.variantName.trim(), 
                originalPrice: variant.originalPrice,
                discount: variant.discount || 0,
                stock: variant.stock,
                length: variant.length || null,
                width: variant.width || null,
                height: variant.height || null
            }));

            await ProductVariant.insertMany(variantDocuments);
        }

        return savedProduct;
        
    } catch (error) {
        throw error;
    }
};

export const getProductDetailsForView = async (product_id) => {
    try {
        const product = await Product.findOne({ productId: product_id }).populate('categoryId');

        if (!product || product.isDeleted) {
            return null;
        }

        const variants = await ProductVariant.find({ productId: product._id }).lean();
        
        const stats = calculateProductStats(variants);

        const productData = product.toObject();
        productData.variants = stats.variantsWithPrices;

        return {
            productData,
            totalStock: stats.totalStock,
            priceDisplay: stats.priceDisplay
        };
    } catch (error) {
        throw new Error(`Database error while fetching product details for view: ${error.message}`);
    }
};

export const getDeletedProductsPageData = async (page, limit) => {
    try {
        const dbQuery = { isDeleted: true };
        
        const totalProducts = await Product.countDocuments(dbQuery);
        const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
        const safePage = Math.min(page, Math.max(1, totalPages));
        const safeSkip = (safePage - 1) * limit;

        const products = await Product.find(dbQuery)
            .populate("categoryId", "name")
            .sort({ createdAt: -1 })
            .skip(safeSkip)
            .limit(limit);

        const productsWithVariants = await Promise.all(
            products.map(async (product) => {
                const variants = await ProductVariant.find({ productId: product._id }).lean();
                const stats = calculateProductStats(variants);

                const productData = product.toObject();
                productData.variants = stats.variantsWithPrices;
                productData.calculatedStock = stats.totalStock;
                productData.priceDisplay = stats.priceDisplay;
                productData.stockStatus = stats.stockStatus;  
                productData.badgeClass = stats.badgeClass;  

                return productData;
            })
        );

        return {
            products: productsWithVariants,
            totalProducts,
            totalPages,
            safePage
        };

    } catch (error) {
        throw new Error(`Database error while fetching deleted products: ${error.message}`);
    }
};

export const restoreSoftDeletedProduct = async (productId) => {
    try {
        if (!mongoose.isValidObjectId(productId)) {
            return { isRestored: false, reason: "invalid_id", message: "Invalid product ID format." };
        }

        const product = await Product.findById(productId).populate("categoryId");

        if (!product) {
            return { isRestored: false, reason: "not_found", message: "Product not found in database." };
        }

        if (product.categoryId && product.categoryId.isDeleted) {
            return { 
                isRestored: false, 
                reason: "category_deleted", 
                message: "Please restore the category first." 
            };
        }

        product.isDeleted = false;
        await product.save();

        return { isRestored: true, product };

    } catch (error) {
        throw new Error(`Database error while restoring product: ${error.message}`);
    }
};

export const getActiveCategoriesForDropdown = async () => {
    try {
        return await Category.find({ isDeleted: false })
            .sort({ name: 1 })
            .lean(); 
    } catch (error) {
        throw new Error(`Database error while fetching active categories: ${error.message}`);
    }
};

export const getProductDetailsForEdit = async (productIdStr) => {
    try {
        const product = await Product.findOne({ productId: productIdStr });

        if (!product || product.isDeleted) {
            return { isNotFound: true };
        }

        const [categories, variants] = await Promise.all([
            Category.find({ isDeleted: false }).sort({ name: 1 }).lean(),
            ProductVariant.find({ productId: product._id }).lean()
        ]);

        return {
            isNotFound: false,
            product,
            categories,
            variants
        };
    } catch (error) {
        throw new Error(`Database error while fetching edit product details: ${error.message}`);
    }
};

export const updateExistingProduct = async (productIdStr, productData, newImages, variantDataStr) => {
    try {
        const product = await Product.findOne({ productId: productIdStr });

        if (!product || product.isDeleted) {
            return { isUpdated: false, isNotFound: true };
        }

        product.name = productData.name;
        product.categoryId = productData.categoryId;
        product.description = productData.description;
        product.brand = productData.brand;
        product.material = productData.material;
        product.warranty = productData.warranty;
        product.specifications = productData.specifications;

        if (newImages && newImages.length > 0) {
            product.images = newImages;
        }

        await product.save();

        if (variantDataStr) {
            let parsedVariants;
            try {
                parsedVariants = typeof variantDataStr === 'string' ? JSON.parse(variantDataStr) : variantDataStr;
            } catch (error) {
                throw new Error('Failed to parse variant data.');
            }

            await ProductVariant.deleteMany({ productId: product._id });

            if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
                const variantDocs = parsedVariants.map((variant) => ({
                    productId: product._id,
                    variantName: variant.variantName,
                    originalPrice: variant.originalPrice,
                    discount: variant.discount || 0,
                    stock: variant.stock,
                    length: variant.length || null,
                    width: variant.width || null,
                    height: variant.height || null,
                }));

                await ProductVariant.insertMany(variantDocs);
            }
        }

        return { isUpdated: true, product };
        
    } catch (error) {
        throw error;
    }
};

