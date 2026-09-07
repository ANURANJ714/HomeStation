import Cart from '../../models/Cart.js';
import Wishlist from '../../models/Wishlist.js';

const isValidAndInStock = (variant) => {
    if (!variant || typeof variant.stock !== 'number' || variant.stock <= 0) {
        return false;
    }

    const product = variant.productId;
    if (!product || product.isDeleted === true || product.isDeleted === 'true') {
        return false;
    }

    const category = product.categoryId;
    if (category && (category.isDeleted === true || category.isDeleted === 'true')) {
        return false;
    }

    return true;
};

export const getCartCount = async (userId) => {
    try {
        if (!userId) return 0;

        const cartItems = await Cart.find({ userId })
            .populate({
                path: 'productVariantId',
                populate: {
                    path: 'productId',
                    populate: {
                        path: 'categoryId'
                    }
                }
            })
            .lean();

        if (!cartItems || cartItems.length === 0) {
            return 0;
        }

        let totalCartCount = 0;

        for (const item of cartItems) {
            const variant = item.productVariantId;
            if (isValidAndInStock(variant)) {
                totalCartCount += (item.quantity || 1);
            }
        }

        return totalCartCount;
    } catch (error) {
        console.error('Error fetching cart badge count:', error.message);
        return 0;
    }
};

export const getWishlistCount = async (userId) => {
    try {
        if (!userId) return 0;

        const wishlist = await Wishlist.findOne({ userId })
            .populate({
                path: 'variants',
                populate: {
                    path: 'productId',
                    populate: {
                        path: 'categoryId'
                    }
                }
            })
            .lean();

        if (!wishlist || !Array.isArray(wishlist.variants)) {
            return 0;
        }

        let validWishlistCount = 0;

        for (const variant of wishlist.variants) {
            if (isValidAndInStock(variant)) {
                validWishlistCount += 1;
            }
        }

        return validWishlistCount;
    } catch (error) {
        console.error('Error fetching wishlist badge count:', error.message);
        return 0;
    }
};

export const getUserHeaderCounts = async (userId) => {
    try {
        if (!userId) {
            return { cartCount: 0, wishlistCount: 0 };
        }

        const [cartCount, wishlistCount] = await Promise.all([
            getCartCount(userId),
            getWishlistCount(userId)
        ]);

        return { cartCount, wishlistCount };
    } catch (error) {
        console.error('Error fetching badge counts in badgeService:', error.message);
        return { cartCount: 0, wishlistCount: 0 };
    }
};