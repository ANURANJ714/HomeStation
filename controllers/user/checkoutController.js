import logger from '../../utils/logger.js';
import * as addressService from '../../services/user/addressService.js';
import * as badgeService from '../../services/user/badgeService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import * as checkoutService from '../../services/user/checkoutService.js';
import * as orderService from '../../services/user/orderService.js';
import * as userService from '../../services/user/authService.js';
import * as couponService from '../../services/user/userCouponService.js';
import * as razorpayService from '../../services/user/razorpayService.js';

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
        let verifiedCouponType = null;
        let verifiedCouponDiscountValue = null;
        let verifiedCouponDiscount = 0;

        if (appliedCouponCode && typeof appliedCouponCode === 'string' && appliedCouponCode.trim() !== '') {
            try {
                const couponRes = await couponService.validateAndCalculateCouponDiscount(
                    userId,
                    appliedCouponCode.trim(),
                    basePayable
                );

                verifiedCouponCode = couponRes.couponCode;
                verifiedCouponType = couponRes.discountType;
                verifiedCouponDiscountValue = couponRes.discountValue;
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
            couponType: verifiedCouponType,
            couponDiscountValue: verifiedCouponDiscountValue,
            couponDiscount: verifiedCouponDiscount,
            shippingCharges,
            totalPayable
        };

        logger.info(`Checkout session prepared for (${userEmail}). Subtotal: ₹${subtotal}, Coupon: ${verifiedCouponCode || 'None'} [Type: ${verifiedCouponType || 'N/A'}, Value: ${verifiedCouponDiscountValue || 'N/A'}] (-₹${verifiedCouponDiscount}), Total Payable: ₹${totalPayable} | IP: ${clientIp}`);

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
        let verifiedCouponType = null;
        let verifiedCouponDiscountValue = null;
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
                verifiedCouponType = couponRes.discountType;
                verifiedCouponDiscountValue = couponRes.discountValue;
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
            couponType: verifiedCouponType,
            couponDiscountValue: verifiedCouponDiscountValue,
            couponDiscount: verifiedCouponDiscount,
            totalPayable
        };

        logger.info(`User (${userEmail}) confirmed delivery address [${selectedAddressId}]. Subtotal: ₹${validation.subtotal}, Coupon: ${verifiedCouponCode || 'None'} [Type: ${verifiedCouponType || 'N/A'}, Value: ${verifiedCouponDiscountValue || 'N/A'}] (-₹${verifiedCouponDiscount}), Total Payable: ₹${totalPayable} | IP: ${clientIp}`);

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
        let verifiedCouponType = null;
        let verifiedCouponDiscountValue = null;
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
                verifiedCouponType = couponRes.discountType;
                verifiedCouponDiscountValue = couponRes.discountValue;
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

        if (paymentMode === 'wallet') {
            const walletBalance = await checkoutService.getUserWalletBalance(userId);

            if (walletBalance < totalPayable) {
                logger.warn(`Payment selection rejected for (${userEmail}): Insufficient wallet balance. Required: ₹${totalPayable}, Available: ₹${walletBalance} | IP: ${clientIp}`);

                return res.status(400).json({
                    success: false,
                    reason: 'INSUFFICIENT_WALLET_BALANCE',
                    message: `Insufficient wallet balance. Total payable is ₹${totalPayable.toLocaleString('en-IN')}, but your wallet balance is ₹${walletBalance.toLocaleString('en-IN')}.`
                });
            }
        }

        req.session.checkoutOrder = {
            ...req.session.checkoutOrder,
            cartItems: validation.validItems,
            totalQuantity: validation.validItems.reduce((acc, item) => acc + item.quantity, 0),
            paymentMode,
            subtotal: validation.subtotal,
            shippingCharges,
            couponUsed: verifiedCouponCode,
            couponType: verifiedCouponType,
            couponDiscountValue: verifiedCouponDiscountValue,
            couponDiscount: verifiedCouponDiscount,
            totalPayable
        };

        logger.info(`User (${userEmail}) selected payment mode: [${paymentMode}]. Final Total: ₹${totalPayable}, Coupon: ${verifiedCouponCode || 'None'} [Type: ${verifiedCouponType || 'N/A'}, Value: ${verifiedCouponDiscountValue || 'N/A'}] | IP: ${clientIp}`);

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

        const checkout = req.session.checkoutOrder;

        if (!checkout || !checkout.cartItems || checkout.cartItems.length === 0) {
            req.session.cartAlertMessage = 'Please verify your cart items and proceed to checkout.';
            return res.redirect('/user/cart');
        }

        const validation = await checkoutService.validateCheckoutSessionOrder(checkout);
        if (!validation.isValid) {
            req.session.cartAlertMessage = validation.message;
            return res.redirect('/user/cart');
        }

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

        if (!shippingAddress) {
            req.session.cartAlertMessage = 'Please select a delivery address.';
            return res.redirect('/user/checkout/address');
        }

        const billingAddress = defaultBillingAddress || shippingAddress;

        const subtotal = validation.subtotal;
        const shippingCharges = (subtotal > 0 && subtotal <= 500) ? 100 : 0;
        const basePayable = subtotal + shippingCharges;

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
                logger.warn(`Coupon [${checkout.couponUsed}] became invalid on review page for (${userEmail}): ${couponError.message}`);
                verifiedCouponCode = null;
                verifiedCouponDiscount = 0;
            }
        }

        const totalPayable = Math.max(0, basePayable - verifiedCouponDiscount);

        checkout.subtotal = subtotal;
        checkout.shippingCharges = shippingCharges;
        checkout.couponUsed = verifiedCouponCode;
        checkout.couponDiscount = verifiedCouponDiscount;
        checkout.totalPayable = totalPayable;
        req.session.checkoutOrder = checkout;

        logger.info(`User (${userEmail}) accessed Order Review. Total: ₹${totalPayable}, Coupon: ${verifiedCouponCode || 'None'} (-₹${verifiedCouponDiscount}) | IP: ${clientIp}`);

        return res.render('user/orderreview', {
            pageTitle: 'HomeStation - Order Review & Checkout',
            user: req.user,
            cartItems: validation.validItems,
            totalQuantity: validation.validItems.reduce((acc, item) => acc + item.quantity, 0),
            shippingAddress,
            billingAddress,
            paymentMode: checkout.paymentMode || 'cod',
            subtotal,
            offerDiscount: checkout.offerDiscount || 0,
            couponDiscount: verifiedCouponDiscount,
            couponUsed: verifiedCouponCode,
            deliveryCharges: shippingCharges,
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
                reason: 'INCOMPLETE_SESSION',
                message: 'Incomplete checkout session details.',
                redirectUrl: '/user/checkout/failure'
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
                redirectUrl: validation.reason === 'NO_ITEMS' ? '/user/checkout/failure' : null
            });
        }

        const shippingCharges = (validation.subtotal > 0 && validation.subtotal <= 500) ? 100 : 0;
        const basePayable = validation.subtotal + shippingCharges;

        let verifiedCouponCode = null;
        let verifiedCouponType = null;
        let verifiedCouponDiscountValue = null;
        let verifiedCouponDiscount = 0;

        if (checkout.couponUsed && typeof checkout.couponUsed === 'string' && checkout.couponUsed.trim() !== '') {
            try {
                const couponRes = await couponService.validateAndCalculateCouponDiscount(
                    userId,
                    checkout.couponUsed.trim(),
                    basePayable
                );

                verifiedCouponCode = couponRes.couponCode;
                verifiedCouponType = couponRes.discountType;
                verifiedCouponDiscountValue = couponRes.discountValue;
                verifiedCouponDiscount = couponRes.discountAmount;
            } catch (couponError) {
                logger.warn(`Order placement blocked: Coupon [${checkout.couponUsed}] failed validation for (${userEmail}): ${couponError.message}`);
                
                return res.status(couponError.statusCode || 400).json({
                    success: false,
                    reason: 'INVALID_COUPON',
                    message: `Coupon Error: ${couponError.message || 'The applied coupon is no longer valid for this order.'}`,
                    redirectUrl: null
                });
            }
        }

        const totalPayable = Math.max(0, basePayable - verifiedCouponDiscount);

        if (checkout.paymentMode === 'wallet') {
            const walletBalance = await checkoutService.getUserWalletBalance(userId);

            if (walletBalance < totalPayable) {
                logger.warn(`Place order rejected for (${userEmail}): Insufficient wallet balance. Total: ₹${totalPayable}, Balance: ₹${walletBalance} | IP: ${clientIp}`);

                req.session.orderFailed = true;
                req.session.orderFailureTimestamp = Date.now();

                return res.status(400).json({
                    success: false,
                    reason: 'INSUFFICIENT_WALLET_BALANCE',
                    message: `Insufficient wallet balance. Total payable is ₹${totalPayable.toLocaleString('en-IN')}, but your wallet balance is ₹${walletBalance.toLocaleString('en-IN')}.`,
                    redirectUrl: '/user/checkout/failure'
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
                reason: 'INVALID_ADDRESS',
                message: 'Shipping address is invalid or not found.',
                redirectUrl: null
            });
        }

        const billingAddress = defaultBillingAddress || shippingAddress;

        if (checkout.paymentMode === 'razorpay') {
            const receiptId = `rcpt_${Date.now().toString().slice(-10)}`;
            const razorpayOrder = await razorpayService.createRazorpayOrder(totalPayable, receiptId);

            req.session.pendingRazorpayOrder = {
                validatedCheckoutData: { ...validation, deliveryCharges: shippingCharges, totalPayable },
                shippingAddress,
                billingAddress,
                couponData: { 
                    couponUsed: verifiedCouponCode, 
                    couponType: verifiedCouponType,
                    couponDiscountValue: verifiedCouponDiscountValue,
                    couponDiscount: verifiedCouponDiscount 
                },
                razorpayOrderId: razorpayOrder.id
            };

            await new Promise((resolve) => req.session.save(resolve));

            logger.info(`Razorpay order generated [${razorpayOrder.id}] for User (${userEmail}) | Amount: ₹${totalPayable}`);

            return res.status(200).json({
                success: true,
                isRazorpay: true,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                customerName: shippingAddress.name || shippingAddress.fullName,
                customerEmail: userEmail,
                customerPhone: shippingAddress.phone
            });
        }

        const createdData = await orderService.createNewOrder(
            userId,
            { ...validation, deliveryCharges: shippingCharges, totalPayable },
            shippingAddress,
            billingAddress,
            checkout.paymentMode,
            { 
                couponUsed: verifiedCouponCode, 
                couponType: verifiedCouponType,
                couponDiscountValue: verifiedCouponDiscountValue,
                couponDiscount: verifiedCouponDiscount 
            }
        );

        const order = createdData.order;

        logger.info(`Order placed successfully! ID: ${order.orderId}, Coupon: ${verifiedCouponCode || 'None'}, Type: ${verifiedCouponType || 'N/A'}, Value: ${verifiedCouponDiscountValue || 'N/A'}, Discount: ₹${verifiedCouponDiscount}, Total: ₹${totalPayable} by (${userEmail}) | IP: ${clientIp}`);

        req.session.lastPlacedOrderId = order.orderId;
        req.session.orderSuccessTimestamp = Date.now();
        delete req.session.checkoutActive;
        delete req.session.checkoutOrder;

        await new Promise((resolve) => req.session.save(resolve));

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

        await new Promise((resolve) => req.session.save(resolve));

        return res.status(400).json({
            success: false,
            message: error.message || 'Order processing failed.',
            redirectUrl: '/user/checkout/failure'
        });
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            logger.warn(`Razorpay payment verification rejected: Missing parameters for (${userEmail})`);
            req.session.orderFailed = true;
            return res.status(400).json({
                success: false,
                message: 'Invalid payment confirmation data received.',
                redirectUrl: '/user/checkout/failure'
            });
        }

        const pendingOrder = req.session.pendingRazorpayOrder;
        if (!pendingOrder || pendingOrder.razorpayOrderId !== razorpay_order_id) {
            logger.warn(`Razorpay payment confirmation session mismatch for (${userEmail})`);
            req.session.orderFailed = true;
            return res.status(400).json({
                success: false,
                message: 'Payment verification session expired. Please verify your order.',
                redirectUrl: '/user/checkout/failure'
            });
        }

        const isSignatureValid = razorpayService.verifyRazorpayPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isSignatureValid) {
            logger.error(`Razorpay signature mismatch for User (${userEmail}) | Order: ${razorpay_order_id}`);
            req.session.orderFailed = true;
            return res.status(400).json({
                success: false,
                message: 'Payment authentication failed. Tampering detected.',
                redirectUrl: '/user/checkout/failure'
            });
        }

        const createdData = await orderService.createNewOrder(
            userId,
            pendingOrder.validatedCheckoutData,
            pendingOrder.shippingAddress,
            pendingOrder.billingAddress,
            'razorpay',
            pendingOrder.couponData
        );

        const order = createdData.order;

        logger.info(`Razorpay payment verified & Order generated! ID: ${order.orderId}, Coupon: ${pendingOrder.couponData?.couponUsed || 'None'}, Type: ${pendingOrder.couponData?.couponType || 'N/A'}, Value: ${pendingOrder.couponData?.couponDiscountValue || 'N/A'}, User: (${userEmail}) | IP: ${clientIp}`);

        req.session.lastPlacedOrderId = order.orderId;
        req.session.orderSuccessTimestamp = Date.now();
        delete req.session.checkoutActive;
        delete req.session.checkoutOrder;
        delete req.session.pendingRazorpayOrder;

        await new Promise((resolve) => req.session.save(resolve));

        return res.status(200).json({
            success: true,
            orderId: order.orderId,
            redirectUrl: `/user/checkout/success?orderId=${encodeURIComponent(order.orderId)}`
        });
    } catch (error) {
        logger.error(`Razorpay verification exception for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        req.session.orderFailed = true;
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to complete order verification.',
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

        delete req.session.orderFailed;
        delete req.session.orderFailureTimestamp;

        setNoCacheHeaders(res);
        logger.warn(`User (${userEmail}) viewed Order Failure page | IP: ${clientIp}`);

        return res.render('user/orderpaymentfail', { 
            pageTitle: 'HomeStation - Payment Failed',
            csrfToken: req.csrfToken ? req.csrfToken() : '' 
        });

    } catch (error) {
        logger.error(`Error rendering order failure page: ${error.message}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An unexpected error occurred while loading the payment failure page."
        });
    }
};