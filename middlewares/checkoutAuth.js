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

export const ensureAddressSelected = async (req, res, next) => {
    try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            req.session.returnTo = '/user/cart';
            return res.redirect('/user/login');
        }

        const userId = req.user._id;

        if (!req.session.checkoutActive) {
            req.session.cartAlertMessage = 'Please verify your cart items and click Proceed to Checkout.';
            return res.redirect('/user/cart');
        }

        const cartStatus = await checkoutService.validateCartForCheckout(userId);
        if (!cartStatus.isValid) {
            delete req.session.checkoutActive;
            delete req.session.checkoutOrder;
            req.session.cartAlertMessage = cartStatus.message;
            return res.redirect('/user/cart');
        }

        if (!req.session.checkoutOrder || !req.session.checkoutOrder.shippingAddressId) {
            logger.warn(`Payment mode access blocked for (${req.user.email}): Shipping address not selected.`);
            req.session.cartAlertMessage = 'Please select a delivery address before choosing a payment mode.';
            return res.redirect('/user/checkout/address');
        }

        next();
    } catch (error) {
        logger.error(`Error in ensureAddressSelected middleware: ${error.message}`);
        req.session.cartAlertMessage = 'An unexpected error occurred. Please verify your cart.';
        return res.redirect('/user/cart');
    }
};

export const ensurePaymentModeSelected = (req, res, next) => {
    try {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            req.session.returnTo = '/user/cart';
            return res.redirect('/user/login');
        }

        const checkout = req.session.checkoutOrder;

        if (!req.session.checkoutActive || !checkout || !checkout.cartItems || checkout.cartItems.length === 0) {
            req.session.cartAlertMessage = 'Please verify your cart items and proceed to checkout.';
            return res.redirect('/user/cart');
        }

        if (!checkout.shippingAddressId) {
            req.session.cartAlertMessage = 'Please select a delivery address.';
            return res.redirect('/user/checkout/address');
        }

        if (!checkout.paymentMode) {
            req.session.cartAlertMessage = 'Please select a payment mode.';
            return res.redirect('/user/checkout/payment');
        }

        next();
    } catch (error) {
        logger.error(`Error in ensurePaymentModeSelected: ${error.message}`);
        req.session.cartAlertMessage = 'An unexpected error occurred. Please verify your cart.';
        return res.redirect('/user/cart');
    }
};