import Wishlist from '../../models/Wishlist.js';

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