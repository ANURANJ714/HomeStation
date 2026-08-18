import Cart from '../../models/Cart.js';
import Wishlist from '../../models/Wishlist.js';


export const getUserHeaderCounts = async (userId) => {
    try {
        let cartCount = 0;
        let wishlistCount = 0;

        if (!userId) {
            return { cartCount, wishlistCount };
        }

        const [cart, wishlist] = await Promise.all([
            Cart.findOne({ userId }),
            Wishlist.findOne({ userId })
        ]);

        if (cart && Array.isArray(cart.items)) {
            cartCount = cart.items.reduce((total, item) => total + (item.quantity || 1), 0);
        }

        if (wishlist && Array.isArray(wishlist.products)) {
            wishlistCount = wishlist.products.length;
        }

        return { cartCount, wishlistCount };
    } catch (error) {
        console.error('Error fetching badge counts in badgeService:', error);
        return { cartCount: 0, wishlistCount: 0 };
    }
};