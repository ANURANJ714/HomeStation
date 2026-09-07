import logger from '../../utils/logger.js';
import * as addressService from '../../services/user/addressService.js';
import * as badgeService from '../../services/user/badgeService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import * as checkoutService from '../../services/user/checkoutService.js';
import * as orderService from '../../services/user/orderService.js';
import * as userService from '../../services/user/authService.js';

export const postCartItems = async (req, res) => {
    try {
        const userId = req.user?._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;

        const userProfile = await userService.getUserById(userId);
        if (userProfile && userProfile.authProvider === 'google') {
            const hasFullName = userProfile.fullName && userProfile.fullName.trim() !== '';
            const hasPhone = userProfile.phone && userProfile.phone.trim() !== '';

            if (!hasFullName || !hasPhone) {
                logger.warn(`Checkout blocked: Incomplete profile for Google User (${userEmail}) | IP: ${clientIp}`);
                return res.status(400).json({
                    success: false,
                    reason: 'INCOMPLETE_PROFILE',
                    message: 'Complete your profile before making your first purchase',
                    redirectUrl: '/user/profile'
                });
            }
        }

        const result = await checkoutService.validateCartForCheckout(userId);

        if (!result.isValid) {
            logger.warn(`Checkout validation notice for (${userEmail}): ${result.message} [Reason: ${result.reason}]`);
            return res.status(400).json({
                success: false,
                reason: result.reason,
                message: result.message,
                cartItemId: result.cartItemId || null,
                availableStock: result.availableStock || 0,
                productName: result.productName || null
            });
        }

        req.session.checkoutActive = true;
        req.session.checkoutOrder = {
            cartItems: result.cartItems,
            totalQuantity: result.cartItems.reduce((acc, item) => acc + item.quantity, 0),
            subtotal: result.cartItems.reduce((acc, item) => {
                const variant = item.productVariantId;
                const price = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));
                return acc + (price * item.quantity);
            }, 0),
            offerDiscount: 0,
            couponDiscount: 0,
            shippingCharges: 0
        };

        logger.info(`Cart validated successfully for (${userEmail}). Proceeding to address.`);

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
            addressService.getUserAddressesPaginated(userId, page, limit),
            getActivePromoBanner(),
            badgeService.getUserHeaderCounts(userId)
        ]);

        logger.info(`User (${userEmail}) loaded checkout address page (Page: ${page}). IP: ${clientIp}`);

        return res.render('user/selectaddress', {
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

        if (!selectedAddressId) {
            return res.status(400).json({
                success: false,
                message: 'Please select a delivery address to proceed.'
            });
        }

        req.session.checkoutOrder = {
            ...req.session.checkoutOrder,
            shippingAddressId: selectedAddressId
        };

        return res.status(200).json({
            success: true,
            redirectUrl: '/user/checkout/payment'
        });
    } catch (error) {
        logger.error(`Error saving checkout address: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Unable to select address. Please try again.'
        });
    }
};

export const loadSelectPaymentMode = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;

        const [walletBalance, bannerText, headerCounts] = await Promise.all([
            checkoutService.getUserWalletBalance(userId),
            getActivePromoBanner(),
            badgeService.getUserHeaderCounts(userId)
        ]);

        logger.info(`User (${userEmail}) loaded payment selection page. IP: ${clientIp}`);

        return res.render('user/selectpaymentmode', {
            user: req.user,
            walletBalance,
            cartCount: headerCounts.cartCount,
            wishlistCount: headerCounts.wishlistCount,
            bannerText: bannerText,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading payment selection page for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);

        return res.status(500).json({
            success: false,
            title: 'Server Error',
            message: 'An internal server error occurred while loading payment modes.'
        });
    }
};

export const postCheckoutPaymentMode = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const { paymentMode } = req.body;

        const allowedModes = ['razorpay', 'wallet', 'cod'];
        if (!paymentMode || !allowedModes.includes(paymentMode)) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid payment method.'
            });
        }

        req.session.checkoutOrder = {
            ...req.session.checkoutOrder,
            paymentMode: paymentMode
        };


        logger.info(`User (${userEmail}) selected payment mode: [${paymentMode}]. IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: 'Payment mode selected successfully.',
            redirectUrl: '/user/checkout/review'
        });

    } catch (error) {
        logger.error(`Error saving payment mode for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);

        return res.status(500).json({
            success: false,
            message: 'Failed to process payment selection. Please try again.'
        });
    }
};

export const loadOrderReview = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;

        const checkout = req.session.checkoutOrder || {};

        let [shippingAddress, defaultBillingAddress, bannerText, headerCounts] = await Promise.all([
            checkout.shippingAddressId ? addressService.getAddressById(userId, checkout.shippingAddressId) : null,
            addressService.getDefaultAddress(userId),
            getActivePromoBanner(),
            badgeService.getUserHeaderCounts(userId)
        ]);

        if (!shippingAddress && defaultBillingAddress) {
            shippingAddress = defaultBillingAddress;
            checkout.shippingAddressId = defaultBillingAddress._id.toString();
        }

        const billingAddress = defaultBillingAddress || shippingAddress;

        const subtotal = checkout.subtotal || 0;
        const offerDiscount = checkout.offerDiscount || 0;
        const couponDiscount = checkout.couponDiscount || 0;
        const deliveryCharges = checkout.shippingCharges || 0;
        const totalPayable = Math.max(0, subtotal - offerDiscount - couponDiscount + deliveryCharges);

        logger.info(`User (${userEmail}) accessed Order Review page. IP: ${clientIp}`);

        return res.render('user/orderreview', {
            pageTitle: 'HomeStation - Order Review & Checkout',
            user: req.user,
            cartItems: checkout.cartItems || [],
            totalQuantity: checkout.totalQuantity || 0,
            shippingAddress,
            billingAddress,
            paymentMode: checkout.paymentMode || 'cod',
            subtotal,
            offerDiscount,
            couponDiscount,
            deliveryCharges,
            totalPayable,
            cartCount: headerCounts.cartCount,
            wishlistCount: headerCounts.wishlistCount,
            bannerText,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading order review page for ${req.user?.email || 'Unknown'} (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);

        return res.status(500).json({
            success: false,
            title: 'Server Error',
            message: 'An internal server error occurred while preparing order review.'
        });
    }
};

export const placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;

        const checkout = req.session.checkoutOrder;

        if (!checkout || !checkout.cartItems || !checkout.shippingAddressId || !checkout.paymentMode) {
            logger.warn(`Place order rejected: Incomplete session for (${userEmail}) | IP: ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: 'Incomplete checkout session details.'
            });
        }

        const [shippingAddress, defaultBillingAddress] = await Promise.all([
            addressService.getAddressById(userId, checkout.shippingAddressId),
            addressService.getDefaultAddress(userId)
        ]);

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: 'Shipping address is invalid or not found.'
            });
        }

        const billingAddress = defaultBillingAddress || shippingAddress;

        const order = await orderService.createNewOrder(userId, checkout, shippingAddress, billingAddress);

        logger.info(`Order placed successfully! ID: ${order.orderId} for User (${userEmail}) | IP: ${clientIp}`);

        req.session.lastPlacedOrderId = order.orderId;
        req.session.orderSuccessTimestamp = Date.now();
        delete req.session.checkoutActive;
        delete req.session.checkoutOrder;

        return res.status(200).json({
            success: true,
            orderId: order.orderId,
            redirectUrl: `/user/checkout/success?orderId=${encodeURIComponent(order.orderId)}`
        });

    } catch (error) {
        logger.error(`Order Placement Error for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);

        req.session.orderFailed = true;
        req.session.orderFailureTimestamp = Date.now();
        
        return res.status(400).json({
            success: false,
            message: error.message || 'Payment or order processing failed.',
            redirectUrl: '/user/checkout/failure'
        });
    }
};

const setNoCacheHeaders = (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
};

export const loadSuccessPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;

        const sessionOrderId = req.session.lastPlacedOrderId;
        const sessionTime = req.session.orderSuccessTimestamp;
        const queryOrderId = req.query.orderId;

        if (!sessionOrderId || !sessionTime) {
            logger.warn(`Unauthorized/expired access attempt to success page by (${userEmail}) | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

        const fiveMinutes = 5 * 60 * 1000;
        if (Date.now() - sessionTime > fiveMinutes) {
            delete req.session.lastPlacedOrderId;
            delete req.session.orderSuccessTimestamp;
            logger.warn(`Expired success page access by (${userEmail}) | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

        const activeOrderId = queryOrderId || sessionOrderId;

        const order = await orderService.getUserOrderFullDetails(userId, activeOrderId);
        if (!order) {
            return res.redirect('/user/orders');
        }

        delete req.session.lastPlacedOrderId;
        delete req.session.orderSuccessTimestamp;

        setNoCacheHeaders(res);
        logger.info(`User (${userEmail}) loaded Order Success page for ID: ${activeOrderId} | IP: ${clientIp}`);

        return res.render('user/orderpaymentsuccess', { 
            orderId: activeOrderId, 
            csrfToken: req.csrfToken ? req.csrfToken() : '' 
        });

    } catch (error) {
        logger.error(`Error rendering order success page for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An unexpected error occurred while loading the order confirmation page."
        });
    }
};

export const loadFailurePage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';

        const failureFlag = req.session.orderFailed;
        const failureTime = req.session.orderFailureTimestamp;

        const fiveMinutes = 5 * 60 * 1000;
        if (!failureFlag || !failureTime || (Date.now() - failureTime > fiveMinutes)) {
            delete req.session.orderFailed;
            delete req.session.orderFailureTimestamp;
            logger.warn(`Direct/expired failure page access blocked for (${userEmail}) | IP: ${clientIp}`);
            return res.redirect('/user/cart');
        }

        delete req.session.orderFailed;
        delete req.session.orderFailureTimestamp;

        setNoCacheHeaders(res);
        logger.warn(`User (${userEmail}) viewed Order Failure page | IP: ${clientIp}`);

        return res.render('user/orderpaymentfail', { 
            csrfToken: req.csrfToken ? req.csrfToken() : '' 
        });

    } catch (error) {
        logger.error(`Error rendering order failure page for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An unexpected error occurred while loading the payment failure page."
        });
    }
};