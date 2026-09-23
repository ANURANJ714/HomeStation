import * as cartService from '../../services/user/cartService.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import { getUserHeaderCounts } from '../../services/user/badgeService.js';
import { getMultipleProductReviewSummaries } from '../../services/user/reviewService.js';
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

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const result = await cartService.handleAddToCartIntent(userId, variantId, targetQuantity);

        if (!result.success) {
            logger.warn(`User (${req.user.email}) add to cart denied: ${result.message} [Reason: ${result.reason}]`);
            return res.status(400).json({ 
                success: false, 
                reason: result.reason, 
                message: result.message 
            });
        }

        logger.info(`User (${req.user.email}) added variant ${variantId} (Qty: ${targetQuantity}) to cart.`);

        return res.status(200).json({ 
            success: true, 
            message: "Item added to cart successfully!",
            count: result.totalCartCount,
            countMessage: `Total items in Cart: ${result.totalCartCount}`
        });

    } catch (error) {
        logger.error(`Cart Add Controller Pipeline Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Failed to add to cart." });
    }
};

export const loadCartPage = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;

        const [cartData, bannerText, headerCounts] = await Promise.all([
            cartService.getCartItems(userId),
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        const productIds = (cartData.cartItems || [])
            .map(item => item.productVariantId?.productId?._id || item.productVariantId?.productId)
            .filter(Boolean);

        const productRatingsMap = await getMultipleProductReviewSummaries(productIds);

        let noticeToShow = null;
        if (cartData.unavailableNotice) {
            const noticeSignature = cartData.unavailableNotice.message;
            if (req.session.lastSeenUnavailableNotice !== noticeSignature) {
                noticeToShow = cartData.unavailableNotice;
                req.session.lastSeenUnavailableNotice = noticeSignature;
            }
        } else {
            delete req.session.lastSeenUnavailableNotice;
        }

        logger.info(`User (${userEmail}) loaded Cart Page | Subtotal: ₹${cartData.subtotal} | Items: ${cartData.totalQuantity} | IP: ${clientIp}`);

        return res.render('user/cart', {
            user: req.user,
            cartItems: cartData.cartItems,
            subtotal: cartData.subtotal,
            totalQuantity: cartData.totalQuantity,
            stockExceededItem: cartData.stockExceededItem,
            unavailableNotice: noticeToShow,
            productRatingsMap,
            bannerText,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading Cart Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error occurred while loading the cart page.' 
        });
    }
};

export const changeQuantityController = async (req, res) => {
    try {
        const { cartItemId, action, targetQuantity } = req.body;
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';

        if (!cartItemId || !['increase', 'decrease', 'set'].includes(action)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payload parameters.' 
            });
        }

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const result = await cartService.updateCartQuantity(userId, cartItemId, action, targetQuantity);

        if (!result.success) {
            return res.status(200).json({ 
                success: false, 
                reason: result.reason, 
                message: result.message 
            });
        }

        const currentTotals = await cartService.getCartItems(userId);

        logger.info(`User (${userEmail}) modified quantity for item [${cartItemId}]. Action: ${action} | New Qty: ${result.currentQuantity}`);

        return res.status(200).json({
            success: true,
            action: result.action,
            currentQuantity: result.currentQuantity,
            subtotal: currentTotals.subtotal,
            totalQuantity: currentTotals.totalQuantity
        });

    } catch (error) {
        logger.error(`Cart quantity shift error: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error updating cart values.' 
        });
    }
};

export const removeCartItemController = async (req, res) => {
    try {
        const { cartItemId } = req.body;
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';

        if (!cartItemId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cart item identifier is required.' 
            });
        }

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const { isDeleted, totalCartCount } = await cartService.deleteCartItemCompletely(userId, cartItemId);

        if (!isDeleted) {
            return res.status(404).json({ 
                success: false, 
                message: 'Target cart element was not found.' 
            });
        }

        const currentTotals = await cartService.getCartItems(userId);

        logger.info(`User (${userEmail}) removed cart item: ${cartItemId}`);

        return res.status(200).json({
            success: true,
            message: 'Item removed from your cart successfully.',
            count: totalCartCount,
            countMessage: `Total items in Cart: ${totalCartCount}`,
            subtotal: currentTotals.subtotal,
            totalQuantity: currentTotals.totalQuantity
        });

    } catch (error) {
        logger.error(`Cart remove item error: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error occurred during removal.' 
        });
    }
};

export const setExactCartQuantity = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';
        const { cartItemId, quantity } = req.body;

        if (!cartItemId || quantity === undefined || quantity === null || parseInt(quantity, 10) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid item or quantity parameters.'
            });
        }

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const result = await cartService.updateItemExactQuantity(userId, cartItemId, quantity);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                reason: result.reason,
                message: result.message
            });
        }

        logger.info(`User (${userEmail}) set exact quantity for item [${cartItemId}] to ${result.currentQuantity}`);

        return res.status(200).json({
            success: true,
            currentQuantity: result.currentQuantity,
            message: 'Quantity adjusted to available stock.'
        });
    } catch (error) {
        logger.error(`setExactCartQuantity error: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'Failed to adjust quantity.'
        });
    }
};