import Wishlist from '../../models/Wishlist.js';
import ProductVariant from '../../models/ProductVariant.js';

export const toggleVariantInWishlist = async (userId, productVariantId) => {
    try {
        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
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
            wishlist.variants.push(productVariantId);
            await wishlist.save();
            return { action: 'added' };
        }

    } catch (error) {
        throw new Error(`Database error while toggling wishlist: ${error.message}`);
    }
};

export const getUserWishlistArray = async (userId) => {
    if (!userId) return [];
    try {
        const wishlist = await Wishlist.findOne({ userId });
        return wishlist ? wishlist.variants.map(id => id.toString()) : [];
    } catch (error) {
        console.error("Error fetching wishlist array:", error);
        return [];
    }
};

export const getWishlistItemsPaginated = async (userId, page = 1, limit = 6) => {
    try {
        const skip = (page - 1) * limit;

        const wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist || !wishlist.variants || wishlist.variants.length === 0) {
            return { items: [], totalItems: 0, totalPages: 0, currentPage: page };
        }

        const totalItems = wishlist.variants.length;
        const totalPages = Math.ceil(totalItems / limit);

        const paginatedVariantIds = wishlist.variants.slice(skip, skip + limit);

        const items = await ProductVariant.find({ _id: { $in: paginatedVariantIds } })
            .populate('productId') 
            .exec();

        const orderedItems = paginatedVariantIds.map(id => 
            items.find(item => item._id.toString() === id.toString())
        ).filter(Boolean);

        return { items: orderedItems, totalItems, totalPages, currentPage: page };

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