import logger from '../../utils/logger.js';
import * as addressService from '../../services/user/addressService.js';
import * as badgeService from '../../services/user/badgeService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import * as checkoutService from '../../services/user/checkoutService.js';
import * as orderService from '../../services/user/orderService.js';
import * as userService from '../../services/user/authService.js';
import * as couponService from '../../services/user/userCouponService.js';

export const postCartItems = async (req, res) => {
    try {
        const userId = req.user?._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { appliedCouponCode } = req.body;

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
            logger.warn(`Checkout validation rejected for (${userEmail}): ${result.message} [Reason: ${result.reason}]`);
            return res.status(400).json({
                success: false,
                reason: result.reason,
                message: result.message,
                cartItemId: result.cartItemId || null,
                availableStock: result.availableStock || 0,
                productName: result.productName || null
            });
        }

        const subtotal = result.cartItems.reduce((acc, item) => {
            const variant = item.productVariantId;
            const price = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));
            return acc + (price * item.quantity);
        }, 0);

        const shippingCharges = (subtotal > 0 && subtotal <= 500) ? 100 : 0;
        const basePayable = subtotal + shippingCharges;

        let verifiedCouponCode = null;
        let verifiedCouponDiscount = 0;

        if (appliedCouponCode && typeof appliedCouponCode === 'string' && appliedCouponCode.trim() !== '') {
            try {
                const couponRes = await couponService.validateAndCalculateCouponDiscount(
                    userId,
                    appliedCouponCode.trim(),
                    basePayable
                );

                verifiedCouponCode = couponRes.couponCode;
                verifiedCouponDiscount = couponRes.discountAmount;
            } catch (couponError) {
                logger.warn(`Checkout coupon rejection for (${userEmail}) with code [${appliedCouponCode}]: ${couponError.message}`);
                return res.status(couponError.statusCode || 400).json({
                    success: false,
                    reason: 'INVALID_COUPON',
                    message: couponError.message || 'The selected coupon is invalid or no longer applicable.'
                });
            }
        }

        const totalPayable = Math.max(0, basePayable - verifiedCouponDiscount);

        req.session.checkoutActive = true;
        req.session.checkoutOrder = {
            cartItems: result.cartItems,
            totalQuantity: result.cartItems.reduce((acc, item) => acc + item.quantity, 0),
            subtotal,
            offerDiscount: 0,
            couponUsed: verifiedCouponCode,
            couponDiscount: verifiedCouponDiscount,
            shippingCharges,
            totalPayable
        };

        logger.info(`Checkout session prepared for (${userEmail}). Subtotal: ₹${subtotal}, Shipping: ₹${shippingCharges}, Coupon: ${verifiedCouponCode || 'None'} (-₹${verifiedCouponDiscount}), Total Payable: ₹${totalPayable} | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: 'Cart verified successfully.',
            warningNotice: result.warningNotice || null,
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
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { selectedAddressId, stockResolution } = req.body;

        if (!selectedAddressId) {
            return res.status(400).json({
                success: false,
                message: 'Please select a delivery address to proceed.'
            });
        }

        if (!req.session.checkoutOrder) {
            return res.status(400).json({
                success: false,
                reason: 'NO_ITEMS',
                message: 'Your checkout session has expired. Please verify your cart.',
                redirectUrl: '/user/cart'
            });
        }

        if (stockResolution) {
            await checkoutService.applyStockResolutionToSession(userId, req.session.checkoutOrder, stockResolution);
        }

        const validation = await checkoutService.validateCheckoutSessionOrder(req.session.checkoutOrder);
        if (!validation.isValid) {
            if (validation.reason === 'NO_ITEMS') {
                delete req.session.checkoutActive;
                delete req.session.checkoutOrder;
            }
            return res.status(400).json({
                success: false,
                reason: validation.reason,
                message: validation.message,
                variantId: validation.variantId || null,
                availableStock: validation.availableStock ?? null,
                productName: validation.productName || null,
                redirectUrl: validation.reason === 'NO_ITEMS' ? '/user/cart' : null
            });
        }

        const address = await addressService.getAddressById(userId, selectedAddressId);
        if (!address) {
            return res.status(404).json({
                success: false,
                message: 'Selected delivery address was not found.'
            });
        }

        const shippingCharges = (validation.subtotal > 0 && validation.subtotal <= 500) ? 100 : 0;
        const basePayable = validation.subtotal + shippingCharges;

        let verifiedCouponCode = null;
        let verifiedCouponDiscount = 0;

        const activeCouponCode = req.session.checkoutOrder.couponUsed;
        if (activeCouponCode && typeof activeCouponCode === 'string' && activeCouponCode.trim() !== '') {
            try {
                const couponRes = await couponService.validateAndCalculateCouponDiscount(
                    userId,
                    activeCouponCode.trim(),
                    basePayable
                );

                verifiedCouponCode = couponRes.couponCode;
                verifiedCouponDiscount = couponRes.discountAmount;
            } catch (couponError) {
                logger.warn(`Address checkout coupon rejection for (${userEmail}) on code [${activeCouponCode}]: ${couponError.message}`);
                
                return res.status(couponError.statusCode || 400).json({
                    success: false,
                    reason: 'INVALID_COUPON',
                    message: `Coupon Error: ${couponError.message || 'Applied coupon is no longer valid for this order amount.'}`
                });
            }
        }

        const totalPayable = Math.max(0, basePayable - verifiedCouponDiscount);

        req.session.checkoutOrder = {
            ...req.session.checkoutOrder,
            cartItems: validation.validItems,
            totalQuantity: validation.validItems.reduce((acc, item) => acc + item.quantity, 0),
            shippingAddressId: selectedAddressId,
            subtotal: validation.subtotal,
            shippingCharges,
            couponUsed: verifiedCouponCode,
            couponDiscount: verifiedCouponDiscount,
            totalPayable
        };

        logger.info(`User (${userEmail}) confirmed delivery address [${selectedAddressId}]. Subtotal: ₹${validation.subtotal}, Delivery: ₹${shippingCharges}, Coupon: ${verifiedCouponCode || 'None'} (-₹${verifiedCouponDiscount}), Total Payable: ₹${totalPayable} | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: 'Delivery address confirmed.',
            warningNotice: validation.warningNotice || null,
            redirectUrl: '/user/checkout/payment'
        });

    } catch (error) {
        logger.error(`Error saving checkout address for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: error.message || 'Unable to select address. Please try again.'
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
        const userId = req.user._id;
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const { paymentMode, stockResolution } = req.body;

        const allowedModes = ['razorpay', 'wallet', 'cod'];
        if (!paymentMode || !allowedModes.includes(paymentMode)) {
            return res.status(400).json({
                success: false,
                message: 'Please select a valid payment method.'
            });
        }

        if (stockResolution && req.session.checkoutOrder) {
            await checkoutService.applyStockResolutionToSession(userId, req.session.checkoutOrder, stockResolution);
        }

        const validation = await checkoutService.validateCheckoutSessionOrder(req.session.checkoutOrder);
        
        if (!validation.isValid) {
            if (validation.reason === 'NO_ITEMS') {
                delete req.session.checkoutActive;
                delete req.session.checkoutOrder;
            }
            return res.status(400).json({
                success: false,
                reason: validation.reason,
                message: validation.message,
                variantId: validation.variantId || null,
                availableStock: validation.availableStock ?? null,
                productName: validation.productName || null,
                redirectUrl: validation.reason === 'NO_ITEMS' ? '/user/cart' : null
            });
        }

        const shippingCharges = (validation.subtotal > 0 && validation.subtotal <= 500) ? 100 : 0;
        const basePayable = validation.subtotal + shippingCharges;

        let verifiedCouponCode = null;
        let verifiedCouponDiscount = 0;

        const activeCouponCode = req.session.checkoutOrder.couponUsed;
        
        if (activeCouponCode && typeof activeCouponCode === 'string' && activeCouponCode.trim() !== '') {
            try {
                const couponRes = await couponService.validateAndCalculateCouponDiscount(
                    userId,
                    activeCouponCode.trim(),
                    basePayable
                );

                verifiedCouponCode = couponRes.couponCode;
                verifiedCouponDiscount = couponRes.discountAmount;
            } catch (couponError) {
                logger.warn(`Payment mode checkout coupon rejection for (${userEmail}) on code [${activeCouponCode}]: ${couponError.message}`);
                
                return res.status(couponError.statusCode || 400).json({
                    success: false,
                    reason: 'INVALID_COUPON',
                    message: `Coupon Error: ${couponError.message || 'Applied coupon is no longer valid for this order amount.'}`
                });
            }
        }

        const totalPayable = Math.max(0, basePayable - verifiedCouponDiscount);

        req.session.checkoutOrder = {
            ...req.session.checkoutOrder,
            cartItems: validation.validItems,
            totalQuantity: validation.validItems.reduce((acc, item) => acc + item.quantity, 0),
            paymentMode,
            subtotal: validation.subtotal,
            shippingCharges,
            couponUsed: verifiedCouponCode,
            couponDiscount: verifiedCouponDiscount,
            totalPayable
        };

        logger.info(`User (${userEmail}) selected payment mode: [${paymentMode}]. Final Total: ₹${totalPayable} | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: 'Payment mode selected successfully.',
            warningNotice: validation.warningNotice || null,
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
        const { stockResolution } = req.body;

        const checkout = req.session.checkoutOrder;

        if (!checkout || !checkout.cartItems || !checkout.shippingAddressId || !checkout.paymentMode) {
            logger.warn(`Place order rejected: Incomplete session for (${userEmail}) | IP: ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: 'Incomplete checkout session details.'
            });
        }

        if (stockResolution) {
            await checkoutService.applyStockResolutionToSession(userId, checkout, stockResolution);
        }

        const validation = await checkoutService.validateCheckoutSessionOrder(checkout);
        if (!validation.isValid) {
            if (validation.reason === 'NO_ITEMS') {
                delete req.session.checkoutActive;
                delete req.session.checkoutOrder;
            }
            return res.status(400).json({
                success: false,
                reason: validation.reason,
                message: validation.message,
                variantId: validation.variantId || null,
                availableStock: validation.availableStock ?? null,
                productName: validation.productName || null,
                redirectUrl: validation.reason === 'NO_ITEMS' ? '/user/cart' : null
            });
        }

        const shippingCharges = (validation.subtotal > 0 && validation.subtotal <= 500) ? 100 : 0;
        const basePayable = validation.subtotal + shippingCharges;

        let verifiedCouponCode = null;
        let verifiedCouponDiscount = 0;

        if (checkout.couponUsed && typeof checkout.couponUsed === 'string' && checkout.couponUsed.trim() !== '') {
            try {
                const couponRes = await couponService.validateAndCalculateCouponDiscount(
                    userId,
                    checkout.couponUsed.trim(),
                    basePayable
                );

                verifiedCouponCode = couponRes.couponCode;
                verifiedCouponDiscount = couponRes.discountAmount;
            } catch (couponError) {
                logger.warn(`Order placement blocked: Coupon [${checkout.couponUsed}] failed validation for (${userEmail}): ${couponError.message}`);
                
                return res.status(couponError.statusCode || 400).json({
                    success: false,
                    reason: 'INVALID_COUPON',
                    message: `Coupon Error: ${couponError.message || 'The applied coupon is no longer valid for this order.'}`
                });
            }
        }

        const totalPayable = Math.max(0, basePayable - verifiedCouponDiscount);

        if (checkout.paymentMode === 'wallet') {
            const wallet = await walletService.getOrCreateUserWalletPaginated(userId, 1, 1);
            if (wallet.balance < totalPayable) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient wallet balance. Total payable is ₹${totalPayable.toLocaleString('en-IN')}, but your balance is ₹${wallet.balance.toLocaleString('en-IN')}.`
                });
            }
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

        const createdData = await orderService.createNewOrder(
            userId,
            { ...validation, deliveryCharges: shippingCharges, totalPayable },
            shippingAddress,
            billingAddress,
            checkout.paymentMode,
            { couponUsed: verifiedCouponCode, couponDiscount: verifiedCouponDiscount }
        );

        const order = createdData.order;

        if (checkout.paymentMode === 'wallet') {
            await walletService.deductWalletBalance(userId, totalPayable, order.orderId);
        }

        logger.info(`Order placed successfully! Order ID: ${order.orderId}, Coupon: ${verifiedCouponCode || 'None'}, Discount: ₹${verifiedCouponDiscount}, Total Paid: ₹${totalPayable} by User: (${userEmail}) | IP: ${clientIp}`);

        req.session.lastPlacedOrderId = order.orderId;
        req.session.orderSuccessTimestamp = Date.now();
        delete req.session.checkoutActive;
        delete req.session.checkoutOrder;

        return res.status(200).json({
            success: true,
            orderId: order.orderId,
            warningNotice: validation.warningNotice || null,
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