import logger from '../../utils/logger.js';
import * as adminOrderService from '../../services/admin/adminOrderService.js';

export const loadOrdersPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const adminEmail = req.user?.email || req.session?.admin?.email || 'Unknown Admin';

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const statusFilter = req.query.status || '';

        const data = await adminOrderService.getAdminOrdersPageData(page, limit, searchQuery, statusFilter);

        logger.info(`Admin (${adminEmail}) viewed Orders Page (Page: ${data.safePage}, Search: "${searchQuery}", Filter: "${statusFilter}"). IP: ${clientIp}`);

        return res.render('admin/orders', {
            orders: data.orders,
            currentPage: data.safePage,
            totalPages: data.totalPages,
            totalFilteredOrders: data.totalFilteredOrders,
            limit,
            searchQuery,
            statusFilter,
            metrics: data.metrics,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading admin orders: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "Internal server error occurred while retrieving orders."
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const clientIp = req.ip;
        const adminEmail = req.user?.email || req.session?.admin?.email || 'Unknown Admin';
        const { orderId, status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and status are required.'
            });
        }

        const updatedOrder = await adminOrderService.updateOrderStatus(orderId, status);

        logger.info(`Admin (${adminEmail}) updated Order [${orderId}] status to [${status}]. IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: `Order status updated to "${status}" successfully.`,
            order: updatedOrder
        });

    } catch (error) {
        logger.error(`Error updating status for Order (${req.body?.orderId}): ${error.message}`);

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update order status.'
        });
    }
};

export const loadViewOrderPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const adminEmail = req.user?.email || req.session?.admin?.email || 'Unknown Admin';
        const { orderId } = req.params;

        const order = await adminOrderService.getOrderDetailsByOrderId(orderId);

        if (!order) {
            logger.warn(`Admin (${adminEmail}) tried to access non-existing order: ${orderId} | IP: ${clientIp}`);
            return res.redirect('/admin/orders');
        }

        const subtotal = order.orderItems.reduce((acc, item) => acc + (item.currentPrice * item.quantity), 0);
        const originalTotal = order.orderItems.reduce((acc, item) => acc + (item.originalPrice * item.quantity), 0);
        const couponDiscount = Math.max(0, originalTotal - subtotal);
        const shippingFee = 0;
        const grandTotal = subtotal + shippingFee;

        let paymentStatus = 'Unpaid';
        if (order.paymentMode === 'razorpay' || order.paymentMode === 'wallet') {
            paymentStatus = 'Paid';
        } else if (order.paymentMode === 'cod' && order.status === 'delivered') {
            paymentStatus = 'Paid';
        }

        logger.info(`Admin (${adminEmail}) viewed order details for ${order.orderId} | IP: ${clientIp}`);

        return res.render('admin/vieworder', {
            pageTitle: `HomeStation - ADMIN`,
            order,
            subtotal,
            couponDiscount,
            shippingFee,
            grandTotal,
            paymentStatus,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading view order page for ID (${req.params?.orderId}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "Internal server error occurred while retrieving order details."
        });
    }
};