import logger from '../../utils/logger.js';
import mongoose from 'mongoose';
import * as orderService from '../../services/user/orderService.js';
import * as reviewService from '../../services/user/reviewService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import { getUserHeaderCounts } from '../../services/user/badgeService.js';
import { notFoundMiddleware } from '../../middlewares/notFoundMiddleware.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { ORDER_STATUS } from '../../src/constants/orderStatus.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const loadUserOrdersPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 4;
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        
        let statusFilters = req.query.status;
        if (typeof statusFilters === 'string') {
            statusFilters = [statusFilters];
        } else if (!Array.isArray(statusFilters)) {
            statusFilters = [];
        }

        const timeFilter = req.query.time || '';

        const [data, bannerText, headerCounts] = await Promise.all([
            orderService.getUserOrdersPageData(userId, page, limit, searchQuery, statusFilters, timeFilter),
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        logger.info(`User (${userEmail}) viewed Orders list page | IP: ${clientIp}`);

        return res.render('user/orderlist', {
            user: req.user,
            orders: data.orders,
            currentPage: data.safePage,
            totalPages: data.totalPages,
            totalFilteredOrders: data.totalFilteredOrders,
            limit,
            searchQuery,
            statusFilters,
            timeFilter,
            bannerText,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading user orders for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const loadUserOrderDetailPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;
        const { orderId } = req.params;
        const rawItemId = req.query.itemId || req.query._id || null;

        if (!orderId || !orderId.trim()) {
            logger.warn(`User order detail 404: Missing orderId parameter | User: ${userEmail} | IP: ${clientIp}`);
            return notFoundMiddleware(req, res);
        }

        let cleanItemId = null;
        if (rawItemId) {
            const trimmedItemId = rawItemId.trim();
            if (!mongoose.Types.ObjectId.isValid(trimmedItemId)) {
                logger.warn(`User order detail 404: Malformed item ObjectId [${rawItemId}] for Order [${orderId}] | IP: ${clientIp}`);
                return notFoundMiddleware(req, res);
            }
            cleanItemId = trimmedItemId;
        }

        const cleanOrderId = orderId.trim();

        const [order, bannerText, headerCounts] = await Promise.all([
            orderService.getUserOrderFullDetails(userId, cleanOrderId, cleanItemId),
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        if (!order || !order.orderItems || order.orderItems.length === 0) {
            logger.warn(`User order detail 404: Order [${cleanOrderId}] with Item [${cleanItemId || 'all'}] not found for (${userEmail}) | IP: ${clientIp}`);
            return notFoundMiddleware(req, res);
        }

        const isOrderFailed = order.status === ORDER_STATUS.FAILED;

        const itemStatuses = order.orderItems.map(i => i.itemStatus);
        const returnStatuses = order.orderItems.map(i => i.returnStatus).filter(s => s !== 'none');

        const overallStatus = isOrderFailed
            ? 'failed'
            : (itemStatuses.every(s => s === 'cancelled')
                ? 'cancelled'
                : (itemStatuses.every(s => s === 'delivered') ? 'delivered' : itemStatuses.find(s => s !== 'cancelled') || 'processing'));

        const overallReturnStatus = (!isOrderFailed && returnStatuses.length > 0)
            ? (returnStatuses.every(s => s === 'item reached') ? 'item reached' : returnStatuses[0])
            : 'none';

        let paymentModeLabel = 'COD';
        if (order.paymentMode === 'razorpay') {
            paymentModeLabel = 'Razorpay Online';
        } else if (order.paymentMode === 'wallet') {
            paymentModeLabel = 'Wallet';
        } else if (order.paymentMode === 'cod') {
            paymentModeLabel = 'Cash on Delivery';
        }

        const calculatePaymentStatus = (mode, itemStatus, returnStatus) => {
            if (isOrderFailed) return 'Failed';
            if (returnStatus === 'item reached') return 'Refunded';

            if (mode === 'razorpay' || mode === 'wallet') {
                if (itemStatus === 'cancelled') return 'Refunded';
                if (itemStatus !== 'cancelled' && returnStatus !== 'item reached') return 'Paid';
            }

            if (mode === 'cod') {
                if (itemStatus !== 'delivered' && returnStatus === 'none') return 'Unpaid';
                if (itemStatus === 'delivered' && returnStatus !== 'item reached') return 'Paid';
            }

            return 'Unpaid';
        };

        order.orderItems = order.orderItems.map(item => ({
            ...item,
            paymentStatusText: calculatePaymentStatus(order.paymentMode, item.itemStatus, item.returnStatus)
        }));

        const createdDateObj = new Date(order.createdAt);
        const formattedOrderDate = createdDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const updatedDateObj = new Date(order.updatedAt || order.createdAt);
        const formattedUpdatedDate = updatedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const expectedDateObj = new Date(createdDateObj);
        expectedDateObj.setDate(expectedDateObj.getDate() + 4);
        const formattedExpectedDate = expectedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        let isReturnEligible = false;
        let formattedReturnDeadline = '';
        if (order.status === ORDER_STATUS.SUCCESS && overallStatus === 'delivered') {
            const deliveredDate = new Date(order.updatedAt || order.createdAt);
            const returnDeadlineObj = new Date(deliveredDate);
            returnDeadlineObj.setDate(returnDeadlineObj.getDate() + 15);
            formattedReturnDeadline = returnDeadlineObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            const differenceInDays = (new Date() - deliveredDate) / (1000 * 60 * 60 * 24);
            isReturnEligible = differenceInDays <= 15;
        }

        const statusSteps = ['processing', 'packed', 'shipped', 'on the way', 'out for delivery', 'delivered'];
        const currentStepIndex = statusSteps.indexOf(overallStatus.toLowerCase());

        const returnSteps = ['return initiated', 'pickup assigned', 'item picked up', 'in transit', 'item reached'];
        const currentReturnStepIndex = returnSteps.indexOf(overallReturnStatus.toLowerCase());

        const hasCancellableItems = !isOrderFailed && order.orderItems.some(i => i.itemStatus !== 'delivered' && i.itemStatus !== 'cancelled');
        const hasReturnableItems = !isOrderFailed && order.orderItems.some(i => i.itemStatus === 'delivered' && (!i.returnStatus || i.returnStatus === 'none'));

        const productIds = order.orderItems
            .map(item => item.productVariantId?.productId?._id)
            .filter(Boolean);

        const userReviews = await reviewService.getUserReviewsForProducts(userId, productIds);

        logger.info(`User (${userEmail}) loaded details for Order [${order.orderId}] (Status: ${order.status}) | IP: ${clientIp}`);

        return res.render('user/orderdetail', {
            user: req.user,
            order,
            isOrderFailed,
            userReviews,
            overallStatus,
            overallReturnStatus,
            paymentModeLabel,
            formattedOrderDate,
            formattedUpdatedDate,
            formattedExpectedDate,
            isReturnEligible,
            formattedReturnDeadline,
            hasCancellableItems,
            hasReturnableItems,
            statusSteps,
            currentStepIndex,
            returnSteps,
            currentReturnStepIndex,
            bannerText,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        if (
            error.name === 'CastError' || 
            error.name === 'BSONError' || 
            error.message.includes('24 character hex string')
        ) {
            logger.warn(`User order detail 404: Cast/BSON parse error for Order (${req.params?.orderId}) | Error: ${error.message}`);
            return notFoundMiddleware(req, res);
        }

        logger.error(`Error loading order details for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const initiateRetryOrderPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Failed to iniate the payment' || COMMON_MESSAGES.BAD_REQUEST
            });
        }

        const retryData = await orderService.initiateRetryPayment(userId, orderId);

        logger.info(`User (${userEmail}) initiated retry payment for Order [${orderId}] | IP: ${clientIp}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            isRazorpay: true,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            razorpayOrderId: retryData.razorpayOrder.id,
            amount: retryData.razorpayOrder.amount,
            currency: retryData.razorpayOrder.currency,
            customerName: retryData.order.shippingAddress.name,
            customerEmail: userEmail,
            customerPhone: retryData.order.shippingAddress.phone,
            message: 'Retry payment initialized successfully.'
        });
    } catch (error) {
        logger.error(`Retry payment initiation error for (${req.user?.email || 'Unknown'}): ${error.message}`);
        return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const verifyRetryOrderPayment = async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user?.email || 'Unknown User';
        const clientIp = req.ip;
        const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Order payment Failed' || COMMON_MESSAGES.BAD_REQUEST
            });
        }

        const updatedOrder = await orderService.confirmRetryPayment(userId, orderId, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });

        logger.info(`Retry payment completed successfully! Order [${updatedOrder.orderId}] marked as SUCCESS for (${userEmail}) | IP: ${clientIp}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            orderId: updatedOrder.orderId,
            message: 'Payment completed and order verified successfully.',
            redirectUrl: `/user/checkout/success?orderId=${encodeURIComponent(updatedOrder.orderId)}`
        });
    } catch (error) {
        logger.error(`Retry payment verification error for (${req.user?.email || 'Unknown'}): ${error.message}`);
        return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const postCancelOrder = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;
        const { orderId, orderItemId, reason } = req.body;

        if (!orderId || !reason || reason.trim() === '') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Please provide valid return reason' || COMMON_MESSAGES.BAD_REQUEST
            });
        }

        const result = await orderService.cancelOrderOrItem(userId, orderId, orderItemId || null, reason);

        let msg = result.isEntireOrder 
            ? 'Your entire order has been cancelled successfully.' 
            : 'Selected item has been cancelled successfully.';

        if (result.refundedAmount && result.refundedAmount > 0) {
            msg += ` ₹${result.refundedAmount.toLocaleString('en-IN')} has been refunded to your wallet.`;
        }

        logger.info(`User (${userEmail}) cancelled ${result.isEntireOrder ? 'Order' : 'Item ' + orderItemId} [${orderId}] | Refunded: ₹${result.refundedAmount || 0} | IP: ${clientIp}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: msg
        });

    } catch (error) {
        logger.error(`Error cancelling in Order (${req.body?.orderId}): ${error.message}`);
        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const loadInvoicePage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;
        const { orderId } = req.params;

        const order = await orderService.getUserDeliveredOrderInvoice(userId, orderId);

        if (!order) {
            logger.warn(`User (${userEmail}) tried to access missing invoice: ${orderId} | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

        const activeInvoiceItems = order.orderItems.filter(item => 
            item.itemStatus !== 'cancelled' && (!item.returnStatus || item.returnStatus === 'none')
        );

        if (activeInvoiceItems.length === 0) {
            logger.warn(`User (${userEmail}) tried to view invoice with zero active items for order: ${orderId} | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

        let originalSubtotal = 0;
        let subtotal = 0;

        activeInvoiceItems.forEach(item => {
            const qty = Number(item.quantity) || 1;
            const originalPrice = Number(item.originalPrice) || Number(item.currentPrice);
            const currentPrice = Number(item.currentPrice);

            originalSubtotal += originalPrice * qty;
            subtotal += currentPrice * qty;
        });

        const productDiscount = Math.max(0, originalSubtotal - subtotal);

        const excludedItems = order.orderItems.filter(item =>
            item.itemStatus === 'cancelled' || (item.returnStatus && item.returnStatus !== 'none')
        );

        let totalCouponDiscountExcluded = 0;

        if (order.couponUsed && excludedItems.length > 0) {
            if (order.couponType === 'percentage') {
                const percent = Number(order.couponDiscountValue) || 0;

                excludedItems.forEach(item => {
                    const itemTotal = Number(item.currentPrice) * Number(item.quantity);
                    const discountForThisItem = Math.round((itemTotal * percent) / 100);
                    totalCouponDiscountExcluded += discountForThisItem;
                });
            } else if (order.couponType === 'flat') {
                const totalOrderAmount = order.orderItems.reduce((acc, curr) => {
                    return acc + (Number(curr.currentPrice) * Number(curr.quantity));
                }, 0);

                if (totalOrderAmount > 0) {
                    const flatDiscountValue = Number(order.couponDiscountValue) || Number(order.couponDiscount) || 0;

                    excludedItems.forEach(item => {
                        const itemTotal = Number(item.currentPrice) * Number(item.quantity);
                        const itemShareOfDiscount = Math.round((itemTotal / totalOrderAmount) * flatDiscountValue);
                        totalCouponDiscountExcluded += itemShareOfDiscount;
                    });
                }
            }
        }

        const originalCouponDiscount = Number(order.couponDiscount) || 0;
        const couponDiscountAmount = Math.max(0, originalCouponDiscount - totalCouponDiscountExcluded);

        const shippingCharges = 0;
        const totalAmount = Math.max(0, subtotal - couponDiscountAmount + shippingCharges);

        let paymentMethodName = 'Cash on Delivery';
        if (order.paymentMode === 'razorpay') paymentMethodName = 'Razorpay Online';
        if (order.paymentMode === 'wallet') paymentMethodName = 'HomeStation Wallet';

        const formattedOrderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        order.orderItems = activeInvoiceItems;

        logger.info(`User (${userEmail}) viewed invoice for order: ${order.orderId} | Net Coupon Discount: ₹${couponDiscountAmount} | Total: ₹${totalAmount} | IP: ${clientIp}`);

        return res.render('user/invoice', {
            pageTitle: `HomeStation - Invoice ${order.orderId}`,
            order,
            originalSubtotal,
            subtotal,
            productDiscount,
            couponDiscountAmount,
            shippingCharges,
            totalAmount,
            paymentMethodName,
            formattedOrderDate,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading invoice page for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const postReturnOrder = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;
        const { orderId, orderItemId, reason } = req.body;

        if (!orderId || !reason || reason.trim() === '') {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Please provide valid return reason' || COMMON_MESSAGES.BAD_REQUEST
            });
        }

        const result = await orderService.returnOrderOrItem(userId, orderId, orderItemId || null, reason);

        const msg = result.isEntireOrder 
            ? 'Return request for the entire order has been submitted successfully.' 
            : 'Return request for the selected item has been submitted successfully.';

        logger.info(`User (${userEmail}) returned ${result.isEntireOrder ? 'Order' : 'Item ' + orderItemId} [${orderId}] | IP: ${clientIp}`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: msg
        });

    } catch (error) {
        logger.error(`Error returning in Order (${req.body?.orderId}): ${error.message}`);
        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};