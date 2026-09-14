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

export const softDeleteProductById = async (idFromFrontend) => {
    try {
        const query = {
            $or: [{ productId: idFromFrontend }]
        };

        if (mongoose.isValidObjectId(idFromFrontend)) {
            query.$or.push({ _id: idFromFrontend });
        }

        const product = await Product.findOne(query);

        if (!product) {
            return {
                isFound: false,
                message: 'Product not found in the database.'
            };
        }

        product.isDeleted = true;
        await product.save();

        return {
            isFound: true,
            productName: product.name,
            message: 'Product successfully moved to Recycle Bin.'
        };
    } catch (error) {
        throw new Error(`Database error while soft deleting product: ${error.message}`);
    }
};

export const validateProductInput = async (productData, variantData, imageUrls) => {
    try {
        const errorMessages = [];

        const pName = productData.name ? productData.name.trim() : '';
        const pCat = productData.categoryId ? productData.categoryId.trim() : '';
        const pDesc = productData.description ? productData.description.trim() : '';
        const pBrand = productData.brand ? productData.brand.trim() : '';
        const pMat = productData.material ? productData.material.trim() : '';
        const pWarr = productData.warranty ? productData.warranty.trim() : '';
        const pSpecs = productData.specifications ? productData.specifications.trim() : '';

        if (!pName) errorMessages.push('Product name is required.');
        if (!pCat) errorMessages.push('Please select a category.');
        if (!pDesc) errorMessages.push('Product description is required.');
        if (!pBrand) errorMessages.push('Brand name is required.');
        if (!pMat) errorMessages.push('Material type is required.');
        if (!pWarr) errorMessages.push('Warranty detail is required.');
        if (!pSpecs) errorMessages.push('Product specifications are required.');

        if (pCat) {
            const category = await Category.findById(pCat).lean();
            if (!category || category.isDeleted) {
                errorMessages.push('Selected category is invalid or unavailable.');
            }
        }

        if (!imageUrls || imageUrls.length < 3) {
            errorMessages.push('All 3 product images (Main Image, Side Image 1, and Side Image 2) are required.');
        }

        let parsedVariants = [];
        if (typeof variantData === 'string') {
            try {
                parsedVariants = JSON.parse(variantData);
            } catch (err) {
                errorMessages.push('Invalid format for variant details.');
            }
        } else if (Array.isArray(variantData)) {
            parsedVariants = variantData;
        }

        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            errorMessages.push('At least one variant must be added.');
        } else {
            const variantNamesSet = new Set();
            const dimensionCombinationsSet = new Set();

            parsedVariants.forEach((v, index) => {
                const variantNumber = index + 1;
                const vName = v.variantName ? v.variantName.trim() : '';
                const vPrice = parseFloat(v.originalPrice);
                const vDiscount = v.discount !== '' && v.discount !== undefined && v.discount !== null ? parseFloat(v.discount) : 0;
                const vStock = parseInt(v.stock, 10);

                if (!vName || isNaN(vPrice) || isNaN(vStock)) {
                    errorMessages.push(`Variant #${variantNumber} is missing required fields (Name, Price, or Stock).`);
                }

                if (!isNaN(vPrice) && vPrice < 0) {
                    errorMessages.push(`Variant #${variantNumber} price cannot be negative.`);
                }

                if (!isNaN(vStock) && vStock < 0) {
                    errorMessages.push(`Variant #${variantNumber} stock cannot be negative.`);
                }

                if (!isNaN(vDiscount) && (vDiscount < 0 || vDiscount > 100)) {
                    errorMessages.push(`Variant #${variantNumber} discount must be between 0% and 100%.`);
                }

                let vLen = null;
                let vWid = null;
                let vHei = null;

                if (v.length !== null && v.length !== undefined && v.length !== '') {
                    vLen = parseFloat(v.length);
                    if (isNaN(vLen) || vLen < 0) {
                        errorMessages.push(`Variant #${variantNumber} length cannot be negative.`);
                    }
                }

                if (v.width !== null && v.width !== undefined && v.width !== '') {
                    vWid = parseFloat(v.width);
                    if (isNaN(vWid) || vWid < 0) {
                        errorMessages.push(`Variant #${variantNumber} width cannot be negative.`);
                    }
                }

                if (v.height !== null && v.height !== undefined && v.height !== '') {
                    vHei = parseFloat(v.height);
                    if (isNaN(vHei) || vHei < 0) {
                        errorMessages.push(`Variant #${variantNumber} height cannot be negative.`);
                    }
                }

                if (vName) {
                    const normalized = vName.toLowerCase();
                    if (variantNamesSet.has(normalized)) {
                        errorMessages.push(`Duplicate variant name detected: "${vName}". Each variant name must be unique.`);
                    } else {
                        variantNamesSet.add(normalized);
                    }
                }

                if (vLen !== null && vWid !== null && vHei !== null) {
                    const dimensionKey = `${vLen}x${vWid}x${vHei}`;
                    if (dimensionCombinationsSet.has(dimensionKey)) {
                        errorMessages.push(`Duplicate dimensions detected on Variant #${variantNumber} (${vLen}" × ${vWid}" × ${vHei}"). Two variants cannot have the exact same length, width, and height.`);
                    } else {
                        dimensionCombinationsSet.add(dimensionKey);
                    }
                }
            });
        }

        if (errorMessages.length > 0) {
            const err = new Error(errorMessages.join(' '));
            err.statusCode = 400;
            err.errorList = errorMessages;
            throw err;
        }

        return parsedVariants;
    } catch (error) {
        throw error;
    }
};

export const createProductWithVariants = async (productData, variantDataStr, imageUrls) => {
    try {
        const parsedVariants = await validateProductInput(productData, variantDataStr, imageUrls);

        const newProductId = await generateProductId();

        const newProduct = new Product({
            productId: newProductId,
            name: productData.name.trim(),
            categoryId: productData.categoryId.trim(),
            description: productData.description.trim(),
            brand: productData.brand.trim(),
            material: productData.material.trim(),
            warranty: productData.warranty.trim(),
            specifications: productData.specifications.trim(),
            images: imageUrls
        });

        const savedProduct = await newProduct.save();

        const variantDocuments = parsedVariants.map(variant => ({
            productId: savedProduct._id,
            variantName: variant.variantName.trim(),
            originalPrice: parseFloat(variant.originalPrice),
            discount: variant.discount ? parseFloat(variant.discount) : 0,
            stock: parseInt(variant.stock, 10),
            length: variant.length !== null && variant.length !== undefined && variant.length !== '' ? parseFloat(variant.length) : null,
            width: variant.width !== null && variant.width !== undefined && variant.width !== '' ? parseFloat(variant.width) : null,
            height: variant.height !== null && variant.height !== undefined && variant.height !== '' ? parseFloat(variant.height) : null
        }));

        await ProductVariant.insertMany(variantDocuments);

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

export const validateEditProductInput = async (productData, variantData, finalImages) => {
    try {
        const errorMessages = [];

        const pName = productData.name ? productData.name.trim() : '';
        const pCat = productData.categoryId ? productData.categoryId.trim() : '';
        const pDesc = productData.description ? productData.description.trim() : '';
        const pBrand = productData.brand ? productData.brand.trim() : '';
        const pMat = productData.material ? productData.material.trim() : '';
        const pWarr = productData.warranty ? productData.warranty.trim() : '';
        const pSpecs = productData.specifications ? productData.specifications.trim() : '';

        if (!pName) errorMessages.push('Product name is required.');
        if (!pCat) errorMessages.push('Please select a category.');
        if (!pDesc) errorMessages.push('Product description is required.');
        if (!pBrand) errorMessages.push('Brand name is required.');
        if (!pMat) errorMessages.push('Material type is required.');
        if (!pWarr) errorMessages.push('Warranty detail is required.');
        if (!pSpecs) errorMessages.push('Product specifications are required.');

        if (pCat) {
            const category = await Category.findById(pCat).lean();
            if (!category || category.isDeleted) {
                errorMessages.push('Selected category is invalid or unavailable.');
            }
        }

        const validImages = finalImages.filter(img => typeof img === 'string' && img.trim() !== '');
        if (validImages.length < 3) {
            errorMessages.push('All 3 product image slots must contain a valid image.');
        }

        let parsedVariants = [];
        if (typeof variantData === 'string') {
            try {
                parsedVariants = JSON.parse(variantData);
            } catch (err) {
                errorMessages.push('Invalid format for variant details.');
            }
        } else if (Array.isArray(variantData)) {
            parsedVariants = variantData;
        }

        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            errorMessages.push('At least one variant must be added.');
        } else {
            const variantNamesSet = new Set();
            const dimensionCombinationsSet = new Set();

            parsedVariants.forEach((v, index) => {
                const variantNumber = index + 1;
                const vName = v.variantName ? v.variantName.trim() : '';
                const vPrice = parseFloat(v.originalPrice);
                const vDiscount = v.discount !== '' && v.discount !== undefined && v.discount !== null ? parseFloat(v.discount) : 0;
                const vStock = parseInt(v.stock, 10);

                if (!vName || isNaN(vPrice) || isNaN(vStock)) {
                    errorMessages.push(`Variant #${variantNumber} is missing required fields (Name, Price, or Stock).`);
                }

                if (!isNaN(vPrice) && vPrice < 0) {
                    errorMessages.push(`Variant #${variantNumber} price cannot be negative or invalid.`);
                }

                if (!isNaN(vStock) && vStock < 0) {
                    errorMessages.push(`Variant #${variantNumber} stock cannot be negative or invalid.`);
                }

                if (!isNaN(vDiscount) && (vDiscount < 0 || vDiscount > 100)) {
                    errorMessages.push(`Variant #${variantNumber} discount must be between 0% and 100%.`);
                }

                let vLen = null;
                let vWid = null;
                let vHei = null;

                if (v.length !== null && v.length !== undefined && v.length !== '') {
                    vLen = parseFloat(v.length);
                    if (isNaN(vLen) || vLen < 0) {
                        errorMessages.push(`Variant #${variantNumber} length cannot be negative.`);
                    }
                }

                if (v.width !== null && v.width !== undefined && v.width !== '') {
                    vWid = parseFloat(v.width);
                    if (isNaN(vWid) || vWid < 0) {
                        errorMessages.push(`Variant #${variantNumber} width cannot be negative.`);
                    }
                }

                if (v.height !== null && v.height !== undefined && v.height !== '') {
                    vHei = parseFloat(v.height);
                    if (isNaN(vHei) || vHei < 0) {
                        errorMessages.push(`Variant #${variantNumber} height cannot be negative.`);
                    }
                }

                if (vName) {
                    const normalized = vName.toLowerCase();
                    if (variantNamesSet.has(normalized)) {
                        errorMessages.push(`Duplicate variant name detected: "${vName}". Each variant name must be unique.`);
                    } else {
                        variantNamesSet.add(normalized);
                    }
                }

                if (vLen !== null && vWid !== null && vHei !== null) {
                    const dimensionKey = `${vLen}x${vWid}x${vHei}`;
                    if (dimensionCombinationsSet.has(dimensionKey)) {
                        errorMessages.push(`Duplicate dimensions detected on Variant #${variantNumber} (${vLen}" × ${vWid}" × ${vHei}"). Two variants cannot have the exact same length, width, and height.`);
                    } else {
                        dimensionCombinationsSet.add(dimensionKey);
                    }
                }
            });
        }

        if (errorMessages.length > 0) {
            const err = new Error(errorMessages.join(' '));
            err.statusCode = 400;
            err.errorList = errorMessages;
            throw err;
        }

        return parsedVariants;
    } catch (error) {
        throw error;
    }
};

export const updateExistingProduct = async (productIdStr, productData, newFiles, variantDataStr) => {
    try {
        const product = await Product.findOne({ productId: productIdStr });

        if (!product || product.isDeleted) {
            return { isUpdated: false, isNotFound: true };
        }

        let existingImages = [];
        if (productData.existingImages) {
            try {
                existingImages = typeof productData.existingImages === 'string'
                    ? JSON.parse(productData.existingImages)
                    : productData.existingImages;
            } catch (e) {
                existingImages = product.images || [];
            }
        } else {
            existingImages = product.images || [];
        }

        const finalImages = [...existingImages];

        let updatedSlotIndices = [];
        if (productData.updatedSlotIndices) {
            try {
                updatedSlotIndices = typeof productData.updatedSlotIndices === 'string'
                    ? JSON.parse(productData.updatedSlotIndices)
                    : productData.updatedSlotIndices;
            } catch (e) {
                updatedSlotIndices = [];
            }
        }

        if (newFiles && newFiles.length > 0) {
            newFiles.forEach((file, fileIdx) => {
                const targetSlotIndex = updatedSlotIndices[fileIdx];
                if (targetSlotIndex !== undefined && targetSlotIndex !== null) {
                    finalImages[targetSlotIndex] = file.path;
                } else if (file.path) {
                    finalImages.push(file.path);
                }
            });
        }

        const parsedVariants = await validateEditProductInput(productData, variantDataStr, finalImages);

        product.name = productData.name.trim();
        product.categoryId = productData.categoryId.trim();
        product.description = productData.description.trim();
        product.brand = productData.brand.trim();
        product.material = productData.material.trim();
        product.warranty = productData.warranty.trim();
        product.specifications = productData.specifications.trim();
        product.images = finalImages.filter(img => typeof img === 'string' && img.trim() !== '');

        await product.save();

        const existingVariants = await ProductVariant.find({ productId: product._id });

        for (const vData of parsedVariants) {
            const vNameTrimmed = vData.variantName.trim();
            
            const existing = existingVariants.find(
                ev => ev.variantName.trim().toLowerCase() === vNameTrimmed.toLowerCase()
            );

            const vLength = vData.length !== null && vData.length !== undefined && vData.length !== '' ? parseFloat(vData.length) : null;
            const vWidth = vData.width !== null && vData.width !== undefined && vData.width !== '' ? parseFloat(vData.width) : null;
            const vHeight = vData.height !== null && vData.height !== undefined && vData.height !== '' ? parseFloat(vData.height) : null;

            if (existing) {
                existing.variantName = vNameTrimmed;
                existing.originalPrice = parseFloat(vData.originalPrice);
                existing.discount = vData.discount ? parseFloat(vData.discount) : 0;
                existing.stock = parseInt(vData.stock, 10);
                existing.length = vLength;
                existing.width = vWidth;
                existing.height = vHeight;
                await existing.save();
            } else {
                await ProductVariant.create({
                    productId: product._id,
                    variantName: vNameTrimmed,
                    originalPrice: parseFloat(vData.originalPrice),
                    discount: vData.discount ? parseFloat(vData.discount) : 0,
                    stock: parseInt(vData.stock, 10),
                    length: vLength,
                    width: vWidth,
                    height: vHeight
                });
            }
        }

        return { isUpdated: true, product };

    } catch (error) {
        throw error;
    }
};

