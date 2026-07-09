import * as cartService from '../../services/user/cartService.js';
import { removeVariantFromWishlist } from '../../services/user/wishlistService.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import logger from '../../utils/logger.js';

export const addToCartController = async (req, res) => {
    try {
        const { variantId } = req.body;

        if (!variantId) {
            return res.status(400).json({ success: false, message: "Variant ID is required." });
        }

        if (!req.user || !req.isAuthenticated()) {
            req.session.pendingCartVariantId = variantId;
            req.session.save();

            return res.status(401).json({ 
                success: false, 
                message: "Please login to add to cart.",
                redirectUrl: '/user/login' 
            });
        }

        const userId = req.user._id;

        await cartService.addVariantToCart(userId, variantId);

        await removeVariantFromWishlist(userId, variantId);

        logger.info(`User (${req.user.email}) added variant ${variantId} to cart and removed it from wishlist.`);

        return res.status(200).json({ 
            success: true, 
            message: "Item added to cart successfully!" 
        });

    } catch (error) {
        logger.error(`Cart Add Error (IP: ${req.ip}): ${error.message}`);
        return res.status(500).json({ success: false, message: "Failed to add to cart." });
    }
};

export const loadCartPage = async (req, res) => {
    try {
        const userId = req.user._id;

        const [cartData, bannerText] = await Promise.all([
            cartService.getCartItems(userId),
            getActivePromoBanner()
        ]);

        return res.render('user/cart', {
            user: req.user,
            cartItems: cartData.cartItems,
            subtotal: cartData.subtotal,
            totalQuantity: cartData.totalQuantity,
            bannerText
        });

    } catch (error) {
        logger.error(`Error loading Cart Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Server error occurred while loading the cart page." });
    }
};