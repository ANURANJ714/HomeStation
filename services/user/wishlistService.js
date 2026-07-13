import Wishlist from '../../models/Wishlist.js';
import ProductVariant from '../../models/ProductVariant.js';


const validateVariantStatus = async (productVariantId) => {
    const variant = await ProductVariant.findById(productVariantId).populate({
        path: 'productId',
        populate: { path: 'categoryId' }
    });

    if (!variant || !variant.productId || variant.productId.isDeleted === true) {
        const err = new Error("Product has been removed.");
        err.reason = 'PRODUCT_REMOVED';
        throw err;
    }

    if (variant.stock <= 0) {
        const err = new Error("Product is out of stock.");
        err.reason = 'OUT_OF_STOCK';
        throw err;
    }

    if (variant.productId.categoryId && variant.productId.categoryId.isDeleted === true) {
        const err = new Error("Product has been removed.");
        err.reason = 'PRODUCT_REMOVED';
        throw err;
    }
    
    return variant;
};

export const toggleVariantInWishlist = async (userId, productVariantId) => {
    try {
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            await validateVariantStatus(productVariantId);
            
            wishlist = new Wishlist({
                userId,
                variants: [productVariantId]
            });
            await wishlist.save();
            return { action: 'added' };
        }

        const variantIndex = wishlist.variants.indexOf(productVariantId);

        if (variantIndex > -1) {
            wishlist.variants.splice(variantIndex, 1);
            await wishlist.save();
            return { action: 'removed' };
        } else {
            await validateVariantStatus(productVariantId);
            
            wishlist.variants.push(productVariantId);
            await wishlist.save();
            return { action: 'added' };
        }
    } catch (error) {
        if (error.reason) throw error; 
        throw new Error(`Database error while toggling wishlist: ${error.message}`);
    }
};

export const getUserWishlistArray = async (userId) => {
    if (!userId) return [];
    try {
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist || !wishlist.variants || wishlist.variants.length === 0) return [];

        const activeVariants = await ProductVariant.find({ _id: { $in: wishlist.variants } }).populate('productId');
        const validVariantIds = [];

        for (const variant of activeVariants) {
            if (variant && variant.stock > 0 && variant.productId && variant.productId.isDeleted !== true) {
                validVariantIds.push(variant._id.toString());
            }
        }
        return validVariantIds;
    } catch (error) {
        console.error("Error fetching wishlist array:", error);
        return [];
    }
};

export const getWishlistItemsPaginated = async (userId, page = 1, limit = 6) => {
    try {
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist || !wishlist.variants || wishlist.variants.length === 0) {
            return { items: [], totalItems: 0, totalPages: 0, currentPage: page };
        }

        const items = await ProductVariant.find({ _id: { $in: wishlist.variants } })
            .populate({
                path: 'productId',
                populate: { path: 'categoryId' }
            })
            .exec();

        const validItems = [];

        for (const variantId of wishlist.variants) {
            const foundMatch = items.find(item => item._id.toString() === variantId.toString());
            
            if (!foundMatch || 
                !foundMatch.productId || 
                foundMatch.productId.isDeleted === true || 
                (foundMatch.productId.categoryId && foundMatch.productId.categoryId.isDeleted === true)) {
                
                continue; 
            }
            
            validItems.push(foundMatch);
        }

        const totalItems = validItems.length;
        const totalPages = Math.ceil(totalItems / limit);
        const skip = (page - 1) * limit;
        const paginatedItems = validItems.slice(skip, skip + limit);

        return { items: paginatedItems, totalItems, totalPages, currentPage: page };
    } catch (error) {
        throw new Error(`Database error while fetching paginated wishlist: ${error.message}`);
    }
};

export const removeVariantFromWishlist = async (userId, productVariantId) => {
    try {
        const result = await Wishlist.updateOne(
            { userId },
            { $pull: { variants: productVariantId } }
        );
        return result.modifiedCount > 0;
    } catch (error) {
        throw new Error(`Database error while deleting item from wishlist: ${error.message}`);
    }
};