import * as cartService from '../../services/user/cartService.js';
import * as couponService from '../../services/user/userCouponService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import { getUserHeaderCounts } from '../../services/user/badgeService.js';
import * as reviewService from '../../services/user/reviewService.js';
import logger from '../../utils/logger.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const addToCartController = async (req, res) => {
    try {
        const { variantId, quantity } = req.body;

        if (!variantId) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Variant ID is required." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        const targetQuantity = quantity ? parseInt(quantity, 10) : 1;

        if (!req.user || !req.isAuthenticated()) {
            req.session.pendingCartVariantId = variantId;
            req.session.pendingCartQuantity = targetQuantity; 
            req.session.save();

            return res.status(STATUS_CODES.UNAUTHORIZED).json({ 
                success: false, 
                message: "Please login to add to cart." || COMMON_MESSAGES.UNAUTHORIZED,
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
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                reason: result.reason, 
                message: result.message || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        logger.info(`User (${req.user.email}) added variant ${variantId} (Qty: ${targetQuantity}) to cart.`);

        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: "Item added to cart successfully!",
            count: result.totalCartCount,
            countMessage: `Total items in Cart: ${result.totalCartCount}`
        });

    } catch (error) {
        logger.error(`Cart Add Controller Pipeline Error (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const loadCartPage = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;

        const [cartData, allAvailableCoupons, bannerText, headerCounts] = await Promise.all([
            cartService.getCartItems(userId),
            cartService.getAvailableCouponsForUser(userId),
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        const productIds = (cartData.cartItems || [])
            .map(item => item.productVariantId?.productId?._id || item.productVariantId?.productId)
            .filter(Boolean);

        const productRatingsMap = await reviewService.getMultipleProductReviewSummaries(productIds);

        if (cartData.unavailableNotice) {
            logger.warn(`Cart cleanup for (${userEmail}): ${cartData.unavailableNotice.message} | IP: ${clientIp}`);
        }

        const shippingCharges = (cartData.subtotal > 0 && cartData.subtotal <= 500) ? 100 : 0;
        const totalPayable = cartData.subtotal + shippingCharges;

        const validCouponsForCart = (allAvailableCoupons || []).filter(
            coupon => cartData.subtotal >= coupon.minPurchase
        );

        logger.info(`User (${userEmail}) loaded Cart Page | Subtotal: ₹${cartData.subtotal} | Delivery: ₹${shippingCharges} | Total: ₹${totalPayable} | IP: ${clientIp}`);

        return res.render('user/cart', {
            user: req.user,
            cartItems: cartData.cartItems,
            subtotal: cartData.subtotal,
            shippingCharges,
            totalPayable,
            totalQuantity: cartData.totalQuantity,
            stockExceededItem: cartData.stockExceededItem,
            unavailableNotice: cartData.unavailableNotice || null,
            availableCoupons: validCouponsForCart,
            productRatingsMap,
            bannerText,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading Cart Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const applyCouponController = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { couponCode, baseTotal } = req.body;

        const result = await couponService.validateAndCalculateCouponDiscount(
            userId,
            couponCode,
            baseTotal
        );

        logger.info(`User (${userEmail}) applied coupon "${result.couponCode}" | Discount: ₹${result.discountAmount} | IP: ${clientIp}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: `Coupon "${result.couponCode}" applied successfully!`,
            couponCode: result.couponCode,
            discountAmount: result.discountAmount,
            newTotalPayable: result.newTotalPayable
        });
    } catch (error) {
        logger.warn(`Coupon application rejected for (${req.user?.email || 'Unknown'}): ${error.message}`);
        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const changeQuantityController = async (req, res) => {
    try {
        const { cartItemId, action, targetQuantity } = req.body;
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';

        if (!cartItemId || !['increase', 'decrease', 'set'].includes(action)) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: 'No item in the Cart' || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const result = await cartService.updateCartQuantity(userId, cartItemId, action, targetQuantity);

        if (!result.success) {
            return res.status(STATUS_CODES.OK).json({ 
                success: false, 
                reason: result.reason, 
                message: result.message || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        const currentTotals = await cartService.getCartItems(userId);

        logger.info(`User (${userEmail}) modified quantity for item [${cartItemId}]. Action: ${action} | New Qty: ${result.currentQuantity}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            action: result.action,
            currentQuantity: result.currentQuantity,
            subtotal: currentTotals.subtotal,
            totalQuantity: currentTotals.totalQuantity
        });

    } catch (error) {
        logger.error(`Cart quantity shift error: ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const removeCartItemController = async (req, res) => {
    try {
        const { cartItemId } = req.body;
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';

        if (!cartItemId) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: 'Cart item identifier is required.' || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const { isDeleted, totalCartCount } = await cartService.deleteCartItemCompletely(userId, cartItemId);

        if (!isDeleted) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ 
                success: false, 
                message: COMMON_MESSAGES.NOT_FOUND 
            });
        }

        const currentTotals = await cartService.getCartItems(userId);

        logger.info(`User (${userEmail}) removed cart item: ${cartItemId}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: 'Item removed from your cart successfully.',
            count: totalCartCount,
            countMessage: `Total items in Cart: ${totalCartCount}`,
            subtotal: currentTotals.subtotal,
            totalQuantity: currentTotals.totalQuantity
        });

    } catch (error) {
        logger.error(`Cart remove item error: ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const setExactCartQuantity = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';
        const { cartItemId, quantity } = req.body;

        if (!cartItemId || quantity === undefined || quantity === null || parseInt(quantity, 10) <= 0) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'No items in the Cart' || COMMON_MESSAGES.BAD_REQUEST
            });
        }

        if (req.session.checkoutActive) {
            delete req.session.checkoutActive;
        }

        const result = await cartService.updateItemExactQuantity(userId, cartItemId, quantity);

        if (!result.success) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                reason: result.reason,
                message: result.message || COMMON_MESSAGES.BAD_REQUEST
            });
        }

        logger.info(`User (${userEmail}) set exact quantity for item [${cartItemId}] to ${result.currentQuantity}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            currentQuantity: result.currentQuantity,
            message: 'Quantity adjusted to available stock.'
        });
    } catch (error) {
        logger.error(`setExactCartQuantity error: ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};