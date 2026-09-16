import logger from '../../utils/logger.js';
import mongoose from 'mongoose';
import * as adminOrderService from '../../services/admin/adminOrderService.js';
import { notFoundMiddleware } from '../../middlewares/notFoundMiddleware.js';

export const loadOrdersPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const adminEmail = req.user?.email || req.session?.admin?.email || 'Unknown Admin';

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const statusFilter = req.query.status || '';

        const data = await adminOrderService.getAdminOrdersPageData(page, limit, searchQuery, statusFilter);

        logger.info(`Admin (${adminEmail}) viewed Orders list (Page: ${data.safePage}, Search: "${searchQuery}") | IP: ${clientIp}`);

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
        logger.error(`Error loading admin orders page: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error occurred while retrieving orders.'
        });
    }
};

export const loadViewOrderPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const adminEmail = req.user?.email || req.session?.admin?.email || 'Unknown Admin';
        const { orderId } = req.params;
        const rawItemId = req.query._id || req.query.itemId || null;

        if (!orderId || !orderId.trim()) {
            logger.warn(`Admin view order 404: Missing orderId path parameter | IP: ${clientIp}`);
            return notFoundMiddleware(req, res);
        }

        let cleanItemId = null;
        if (rawItemId) {
            const trimmedItemId = rawItemId.trim();
            if (!mongoose.Types.ObjectId.isValid(trimmedItemId)) {
                logger.warn(`Admin view order 404: Malformed query item ObjectId [${rawItemId}] for Order [${orderId}] | IP: ${clientIp}`);
                return notFoundMiddleware(req, res);
            }
            cleanItemId = trimmedItemId;
        }

        const cleanOrderId = orderId.trim();

        const result = await adminOrderService.getOrderDetailsByOrderIdAndItemId(cleanOrderId, cleanItemId);

        if (!result || !result.order || !result.item) {
            logger.warn(`Admin view order 404: Order [${cleanOrderId}] or Item [${cleanItemId || 'default'}] not found | Attempted by: ${adminEmail} | IP: ${clientIp}`);
            return notFoundMiddleware(req, res);
        }

        const { order, item } = result;

        const subtotal = item.currentPrice * item.quantity;
        const originalTotal = item.originalPrice * item.quantity;
        const couponDiscount = Math.max(0, originalTotal - subtotal);
        const shippingFee = 0;
        const grandTotal = subtotal + shippingFee;

        let paymentStatus = 'Unpaid';
        const isOnline = order.paymentMode === 'razorpay' || order.paymentMode === 'wallet';

        if (item.returnStatus === 'item reached') {
            paymentStatus = 'Refunded';
        } else if (item.itemStatus === 'cancelled') {
            paymentStatus = isOnline ? 'Refunded' : 'Unpaid';
        } else if (isOnline) {
            paymentStatus = 'Paid';
        } else if (order.paymentMode === 'cod') {
            paymentStatus = item.itemStatus === 'delivered' ? 'Paid' : 'Unpaid';
        }

        logger.info(`Admin (${adminEmail}) viewed item [${item._id}] in Order [${order.orderId}] | IP: ${clientIp}`);

        return res.render('admin/vieworder', {
            pageTitle: 'HomeStation - ADMIN',
            order,
            item,
            subtotal,
            couponDiscount,
            shippingFee,
            grandTotal,
            paymentStatus,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        if (
            error.name === 'CastError' || 
            error.name === 'BSONError' || 
            error.message.includes('24 character hex string')
        ) {
            logger.warn(`Admin view order 404: Malformed query ID cast error for Order (${req.params?.orderId}) | Error: ${error.message}`);
            return notFoundMiddleware(req, res);
        }

        logger.error(`Error loading view order page for Order (${req.params?.orderId}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error occurred while retrieving order details.'
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const clientIp = req.ip;
        const adminEmail = req.user?.email || req.session?.admin?.email || 'Unknown Admin';
        const { orderId, orderItemId, status } = req.body;

        if (!orderId || !orderItemId || !status) {
            logger.warn(`Admin (${adminEmail}) failed status update: Missing required payload fields | IP: ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: 'Order ID, Item ID, and status are required.'
            });
        }

        const result = await adminOrderService.updateOrderItemStatus(orderId, orderItemId, status);

        if (result.isUnchanged) {
            logger.info(`Admin (${adminEmail}) submitted unchanged status for item [${orderItemId}] in Order [${orderId}] | IP: ${clientIp}`);
            return res.status(200).json({
                success: false,
                isUnchanged: true,
                message: 'No change made in status.'
            });
        }

        logger.info(`Admin (${adminEmail}) updated status of item [${orderItemId}] in Order [${orderId}] to [${status}] | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            isUnchanged: false,
            message: `Status updated to "${status}" successfully.`
        });

    } catch (error) {
        logger.error(`Error updating item status in Order (${req.body?.orderId}): ${error.message}\nStack: ${error.stack}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update item status.'
        });
    }
};