import logger from '../utils/logger.js';
import * as checkoutService from '../services/user/checkoutService.js';

export const ensureCheckoutOrigin = async (req, res, next) => {
    try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            req.session.returnTo = '/user/cart';
            return res.redirect('/user/login');
        }

        const userId = req.user._id;

        if (!req.session.checkoutActive) {
            logger.warn(`Direct checkout access blocked for (${req.user.email}): Proceed to checkout was not initiated.`);
            req.session.cartAlertMessage = 'Please verify your cart items and click Proceed to Checkout.';
            return res.redirect('/user/cart');
        }

        const cartStatus = await checkoutService.validateCartForCheckout(userId);

        if (!cartStatus.isValid) {
            logger.warn(`Checkout address blocked for (${req.user.email}): ${cartStatus.message} [${cartStatus.reason}]`);
            
            delete req.session.checkoutActive;

            req.session.cartAlertMessage = cartStatus.message;
            return res.redirect('/user/cart');
        }

        next();
    } catch (error) {
        logger.error(`Error in ensureCheckoutOrigin middleware: ${error.message}`);
        req.session.cartAlertMessage = 'An error occurred while validating your checkout. Please check your cart.';
        return res.redirect('/user/cart');
    }
};