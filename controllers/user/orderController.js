import logger from '../../utils/logger.js';
import * as orderService from '../../services/user/orderService.js';
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
            orderService.getUserOrderDetails(userId, orderId),
            getActivePromoBanner()
        ]);

        if (!order) {
            logger.warn(`User (${userEmail}) attempted to access non-existent or unauthorized order: ${orderId} | IP: ${clientIp}`);
            return res.redirect('/user/orders');
        }

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
            paymentStatusText = order.status === 'delivered' ? 'Paid' : 'Unpaid';
        }

        const createdDateObj = new Date(order.createdAt);
        const formattedOrderDate = createdDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const updatedDateObj = new Date(order.updatedAt || order.createdAt);
        const formattedUpdatedDate = updatedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const expectedDateObj = new Date(createdDateObj);
        expectedDateObj.setDate(expectedDateObj.getDate() + 4);
        const formattedExpectedDate = expectedDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        logger.info(`User (${userEmail}) viewed details for order ${order.orderId} | IP: ${clientIp}`);

        return res.render('user/orderdelivered', {
            pageTitle: `HomeStation - Order Details (${order.orderId})`,
            user: req.user,
            order,
            paymentModeLabel,
            paymentStatusText,
            formattedOrderDate,
            formattedUpdatedDate,
            formattedExpectedDate,
            bannerText,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading order details page for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred while retrieving order details.'
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