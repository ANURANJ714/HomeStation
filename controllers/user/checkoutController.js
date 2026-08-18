import logger from '../../utils/logger.js';
import * as addressService from '../../services/user/addressService.js';
import * as badgeService from '../../services/user/badgeService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import * as checkoutService from '../../services/user/checkoutService.js';

export const postCartItems = async (req, res) => {
    try {
        const userId = req.user?._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;

        logger.info(`Checkout validation initiated for User (${userEmail}) | IP: ${clientIp}`);

        const result = await checkoutService.validateCartForCheckout(userId);

        if (!result.isValid) {
            logger.warn(`Checkout validation failed for (${userEmail}): ${result.message} [Reason: ${result.reason}]`);
            return res.status(400).json({
                success: false,
                reason: result.reason,
                message: result.message
            });
        }

        req.session.checkoutActive = true;

        logger.info(`Cart validated successfully for (${userEmail}). Proceeding to address selection.`);

        return res.status(200).json({
            success: true,
            message: 'Cart verified successfully.',
            redirectUrl: '/user/checkout/address'
        });

    } catch (error) {
        logger.error(`postCartItems Error for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred while processing checkout.'
        });
    }
};

export const loadCheckoutAddress = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 6;

        const [addressData, bannerText, headerCounts] = await Promise.all([
            addressService.getAdressForCheckout(userId, page, limit),
            getActivePromoBanner(),
            badgeService.getUserHeaderCounts(userId)
        ]);

        logger.info(`User (${userEmail}) loaded checkout select address page (Page: ${page}). IP: ${clientIp}`);

        return res.render('user/selectaddress', {
            pageTitle: 'HomeStation - Select Delivery Address',
            user: req.user,
            addresses: addressData.addresses,
            currentPage: addressData.currentPage,
            totalPages: addressData.totalPages,
            cartCount: headerCounts.cartCount,
            wishlistCount: headerCounts.wishlistCount,
            bannerText: bannerText,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading checkout address page for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An internal server error occurred while loading delivery addresses."
        });
    }
};

export const postCheckoutAddress = async (req, res) => {
    try {
        const { selectedAddressId } = req.body;
        const userId = req.user._id;

        if (!selectedAddressId) {
            return res.status(400).json({
                success: false,
                message: 'Please select a delivery address to proceed.'
            });
        }

        const defaultBillingAddress = await addressService.getDefaultAddress(userId);

        req.session.checkoutOrder = {
            shippingAddressId: selectedAddressId,
            billingAddressId: defaultBillingAddress ? defaultBillingAddress._id : selectedAddressId
        };

        logger.info(`Checkout session updated for (${req.user.email}). Shipping: ${selectedAddressId}`);

        return res.status(200).json({
            success: true,
            redirectUrl: '/user/checkout/payment'
        });
    } catch (error) {
        logger.error(`Error initiating payment checkout phase: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Unable to select address. Please try again.'
        });
    }
};