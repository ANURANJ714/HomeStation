import Order from '../../models/Order.js';
import User from '../../models/User.js';

export const getAdminOrdersPageData = async (page = 1, limit = 5, searchQuery = '', statusFilter = '') => {
    try {
        const query = {};

        if (searchQuery && searchQuery.trim() !== '') {
            query.orderId = { $regex: searchQuery.trim(), $options: 'i' };
        }

        if (statusFilter && statusFilter.trim() !== '') {
            if (statusFilter.toLowerCase() === 'return') {
                query.returnStatus = { $ne: 'none' };
            } else {
                query.status = statusFilter;
            }
        }

        const skip = (page - 1) * limit;

        const [
            orders,
            totalFilteredOrders,
            totalOrdersCount,
            processingCount,
            packedCount,
            shippedCount,
            onTheWayCount,
            outForDeliveryCount,
            deliveredCount,
            cancelledCount,
            returnCount
        ] = await Promise.all([
            Order.find(query)
                .populate('userId', 'fullName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query),
            Order.countDocuments(),
            Order.countDocuments({ status: 'processing' }),
            Order.countDocuments({ status: 'packed' }),
            Order.countDocuments({ status: 'shipped' }),
            Order.countDocuments({ status: 'on the way' }),
            Order.countDocuments({ status: 'out for delivery' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' }),
            Order.countDocuments({ returnStatus: { $ne: 'none' } })
        ]);

        const totalPages = Math.ceil(totalFilteredOrders / limit) || 1;
        const safePage = Math.min(page, totalPages);

        return {
            orders,
            totalFilteredOrders,
            totalPages,
            safePage,
            metrics: {
                totalOrdersCount,
                processingCount,
                packedCount,
                shippedCount,
                onTheWayCount,
                outForDeliveryCount,
                deliveredCount,
                cancelledCount,
                returnCount
            }
        };
    } catch (error) {
        throw new Error(`Admin Order Service Failure: ${error.message}`);
    }
};

export const updateOrderStatus = async (orderId, newStatus) => {
    try {
        const validStatuses = ['processing', 'packed', 'shipped', 'on the way', 'out for delivery', 'delivered', 'cancelled'];
        
        const updateData = {};
        if (validStatuses.includes(newStatus)) {
            updateData.status = newStatus;
        } else if (newStatus.startsWith('return:')) {
            updateData.returnStatus = newStatus.replace('return:', '');
        } else {
            throw new Error('Invalid status provided.');
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId },
            { $set: updateData },
            { new: true }
        );

        if (!updatedOrder) {
            throw new Error('Order not found.');
        }

        return updatedOrder;
    } catch (error) {
        throw new Error(`Admin Order Service Status Update Failure: ${error.message}`);
    }
};