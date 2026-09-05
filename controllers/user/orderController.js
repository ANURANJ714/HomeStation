import logger from '../../utils/logger.js';
import * as orderService from '../../services/user/orderService.js';
import * as reviewService from '../../services/user/reviewService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';

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

        const [data, bannerText] = await Promise.all([
            orderService.getUserOrdersPageData(userId, page, limit, searchQuery, statusFilters, timeFilter),
            getActivePromoBanner()
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
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading user orders for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred while retrieving your orders.'
        });
    }
};

export const loadUserOrderDetailPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userEmail = req.user?.email || 'Unknown User';
        const userId = req.user._id;
        const { orderId } = req.params;

        const [order, bannerText] = await Promise.all([
            orderService.getUserOrderFullDetails(userId, orderId),
            getActivePromoBanner()
        ]);

        if (!order || !order.orderItems || order.orderItems.length === 0) {
            logger.warn(`User (${userEmail}) attempted to access invalid order: ${orderId} | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

        const itemStatuses = order.orderItems.map(i => i.itemStatus);
        const returnStatuses = order.orderItems.map(i => i.returnStatus).filter(s => s !== 'none');

        const overallStatus = itemStatuses.every(s => s === 'cancelled') 
            ? 'cancelled' 
            : (itemStatuses.every(s => s === 'delivered') ? 'delivered' : itemStatuses.find(s => s !== 'cancelled') || 'processing');

        const overallReturnStatus = returnStatuses.length > 0 
            ? (returnStatuses.every(s => s === 'item reached') ? 'item reached' : returnStatuses[0]) 
            : 'none';

        let paymentModeLabel = 'COD';
        let paymentStatusText = 'Unpaid';

        if (order.paymentMode === 'razorpay') {
            paymentModeLabel = 'Razorpay Online';
            paymentStatusText = 'Paid';
        } else if (order.paymentMode === 'wallet') {
            paymentModeLabel = 'Wallet';
            paymentStatusText = 'Paid';
        } else if (order.paymentMode === 'cod') {
            paymentModeLabel = 'Cash on Delivery';
            paymentStatusText = overallStatus === 'delivered' ? 'Paid' : 'Unpaid';
        }

        const createdDateObj = new Date(order.createdAt);
        const formattedOrderDate = createdDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const updatedDateObj = new Date(order.updatedAt || order.createdAt);
        const formattedUpdatedDate = updatedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const expectedDateObj = new Date(createdDateObj);
        expectedDateObj.setDate(expectedDateObj.getDate() + 4);
        const formattedExpectedDate = expectedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        let isReturnEligible = false;
        let formattedReturnDeadline = '';
        if (overallStatus === 'delivered') {
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

        const hasCancellableItems = order.orderItems.some(i => i.itemStatus !== 'delivered' && i.itemStatus !== 'cancelled');
        const hasReturnableItems = order.orderItems.some(i => i.itemStatus === 'delivered' && (!i.returnStatus || i.returnStatus === 'none'));

        const productIds = order.orderItems
            .map(item => item.productVariantId?.productId?._id)
            .filter(Boolean);

        const userReviews = await reviewService.getUserReviewsForProducts(userId, productIds);

        logger.info(`User (${userEmail}) loaded details for Order [${order.orderId}] | IP: ${clientIp}`);

        return res.render('user/orderdetail', {
            user: req.user,
            order,
            userReviews,
            overallStatus,
            overallReturnStatus,
            paymentModeLabel,
            paymentStatusText,
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
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading order details for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred while retrieving order details.'
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
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid cancellation reason.'
            });
        }

        const result = await orderService.cancelOrderOrItem(userId, orderId, orderItemId || null, reason);

        const msg = result.isEntireOrder 
            ? 'Your entire order has been cancelled successfully.' 
            : 'Selected item has been cancelled successfully.';

        logger.info(`User (${userEmail}) cancelled ${result.isEntireOrder ? 'Order' : 'Item ' + orderItemId} [${orderId}] | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: msg
        });

    } catch (error) {
        logger.error(`Error cancelling in Order (${req.body?.orderId}): ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'An error occurred while cancelling.'
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

        if (!order || order.status !== 'delivered') {
            logger.warn(`User (${userEmail}) attempted to access invoice for non-delivered order: ${orderId} | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

        const subtotal = order.orderItems.reduce((acc, item) => acc + (item.currentPrice * item.quantity), 0);
        const shippingCharges = 0;
        const totalAmount = subtotal + shippingCharges;

        let paymentMethodName = 'Cash on Delivery';
        if (order.paymentMode === 'razorpay') paymentMethodName = 'Razorpay';
        if (order.paymentMode === 'wallet') paymentMethodName = 'HomeStation Wallet';

        const formattedOrderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        logger.info(`User (${userEmail}) viewed/printed invoice for order: ${order.orderId} | IP: ${clientIp}`);

        return res.render('user/invoice', {
            pageTitle: `HomeStation - Invoice ${order.orderId}`,
            order,
            subtotal,
            shippingCharges,
            totalAmount,
            paymentMethodName,
            formattedOrderDate,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading invoice page for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred while preparing your invoice.'
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
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid return reason.'
            });
        }

        const result = await orderService.returnOrderOrItem(userId, orderId, orderItemId || null, reason);

        const msg = result.isEntireOrder 
            ? 'Return request for the entire order has been submitted successfully.' 
            : 'Return request for the selected item has been submitted successfully.';

        logger.info(`User (${userEmail}) returned ${result.isEntireOrder ? 'Order' : 'Item ' + orderItemId} [${orderId}] | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: msg
        });

    } catch (error) {
        logger.error(`Error returning in Order (${req.body?.orderId}): ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to submit return request.'
        });
    }
};