import * as cartService from '../../services/user/cartService.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import logger from '../../utils/logger.js';

export const addToCartController = async (req, res) => {
    try {
        const { variantId, quantity } = req.body;

        if (!variantId) {
            return res.status(400).json({ success: false, message: "Variant ID is required." });
        }

        const targetQuantity = quantity ? parseInt(quantity, 10) : 1;

        if (!req.user || !req.isAuthenticated()) {
            req.session.pendingCartVariantId = variantId;
            req.session.pendingCartQuantity = targetQuantity; 
            req.session.save();

            return res.status(401).json({ 
                success: false, 
                message: "Please login to add to cart.",
                redirectUrl: '/user/login' 
            });
        }

        const userId = req.user._id;

        const result = await cartService.handleAddToCartIntent(userId, variantId, targetQuantity);

        if (!result.success) {
            return res.status(200).json({ 
                success: false, 
                reason: result.reason, 
                message: result.message 
            });
        }

        logger.info(`User (${req.user.email}) added variant ${variantId} (Qty: ${targetQuantity}) to cart via unified pipeline.`);

        return res.status(200).json({ 
            success: true, 
            message: "Item added to cart successfully!" 
        });

    } catch (error) {
        logger.error(`Cart Add Controller Pipeline Error (IP: ${req.ip}): ${error.message}`);
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

        let alertMessage = null;
        if (cartData.flags.productRemoved || cartData.flags.categoryRemoved) {
            alertMessage = "Some products in your cart are no longer available and have been removed.";
        } else if (cartData.flags.outOfStockRemoved) {
            alertMessage = "Items that went out of stock have been cleared from your cart.";
        }

        return res.render('user/cart', {
            user: req.user,
            cartItems: cartData.cartItems,
            subtotal: cartData.subtotal,
            totalQuantity: cartData.totalQuantity,
            bannerText,
            cartAlertMessage: alertMessage 
        });

    } catch (error) {
        logger.error(`Error loading Cart Page (IP: ${req.ip}): ${error.message}`);
        return res.status(500).json({ success: false, message: "Server error occurred while loading the cart page." });
    }
};

export const changeQuantityController = async (req, res) => {
    try {
        const { cartItemId, action } = req.body;
        const userId = req.user._id;

        if (!cartItemId || !['increase', 'decrease'].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid payload parameters." });
        }

        const result = await cartService.updateCartQuantity(userId, cartItemId, action);

        if (!result.success) {
            return res.status(200).json({ 
                success: false, 
                reason: result.reason, 
                message: result.message 
            });
        }

        const currentTotals = await cartService.getCartItems(userId);

        return res.status(200).json({
            success: true,
            action: result.action,
            currentQuantity: result.currentQuantity,
            subtotal: currentTotals.subtotal,
            totalQuantity: currentTotals.totalQuantity
        });

    } catch (error) {
        logger.error(`Cart quantity shift crash endpoint: ${error.message}`);
        return res.status(500).json({ success: false, message: "Server error updating cart values." });
    }
};

export const removeCartItemController = async (req, res) => {
    try {
        const { cartItemId } = req.body;
        const userId = req.user._id;

        if (!cartItemId) {
            return res.status(400).json({ success: false, message: "Cart item identifier is required." });
        }

        const isDeleted = await cartService.deleteCartItemCompletely(userId, cartItemId);

        if (!isDeleted) {
            return res.status(404).json({ success: false, message: "Target cart element was not found." });
        }

        const currentTotals = await cartService.getCartItems(userId);

        logger.info(`User (${req.user.email}) completely dropped cart entry item: ${cartItemId}`);

        return res.status(200).json({
            success: true,
            message: "Item removed from your cart successfully.",
            subtotal: currentTotals.subtotal,
            totalQuantity: currentTotals.totalQuantity
        });

    } catch (error) {
        logger.error(`Critical crash intercept inside removeCartItemController: ${error.message}`);
        return res.status(500).json({ success: false, message: "Server error occurred during drop action." });
    }
};