import Order from '../../models/Order.js';
import ProductVariant from '../../models/ProductVariant.js';

const formatOrderId = (id) => {
    if (!id) return '';
    return id.startsWith('#') ? id : `#${id}`;
};

export const getAdminOrdersPageData = async (page = 1, limit = 5, searchQuery = '', statusFilter = '') => {
    try {
        const query = {};

        if (searchQuery && searchQuery.trim() !== '') {
            query.orderId = { $regex: searchQuery.trim(), $options: 'i' };
        }

        if (statusFilter && statusFilter.trim() !== '') {
            if (statusFilter.toLowerCase() === 'return') {
                query.orderItems = {
                    $elemMatch: {
                        returnStatus: { $ne: 'none' }
                    }
                };
            } else {
                query.orderItems = {
                    $elemMatch: {
                        itemStatus: statusFilter,
                        returnStatus: 'none'
                    }
                };
            }
        }

        const skip = (page - 1) * limit;

        const [orders, totalFilteredOrders, totalOrdersCount] = await Promise.all([
            Order.find(query)
                .populate('userId', 'fullName')
                .populate({
                    path: 'orderItems.productVariantId',
                    populate: {
                        path: 'productId',
                        select: 'name images'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query),
            Order.countDocuments()
        ]);

        if (statusFilter && statusFilter.trim() !== '') {
            orders.forEach(order => {
                if (statusFilter.toLowerCase() === 'return') {
                    order.orderItems = order.orderItems.filter(item => item.returnStatus && item.returnStatus !== 'none');
                } else {
                    order.orderItems = order.orderItems.filter(item => item.itemStatus === statusFilter && item.returnStatus === 'none');
                }
            });
        }

        const itemStatsAggregation = await Order.aggregate([
            { $unwind: '$orderItems' },
            {
                $group: {
                    _id: null,
                    processingCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'processing'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    packedCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'packed'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    shippedCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'shipped'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    onTheWayCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'on the way'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    outForDeliveryCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'out for delivery'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    deliveredCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'delivered'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    cancelledCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$orderItems.itemStatus', 'cancelled'] }, { $eq: ['$orderItems.returnStatus', 'none'] }] },
                                1, 0
                            ]
                        }
                    },
                    returnCount: {
                        $sum: {
                            $cond: [
                                { $ne: ['$orderItems.returnStatus', 'none'] },
                                1, 0
                            ]
                        }
                    }
                }
            }
        ]);

        const metrics = itemStatsAggregation[0] || {
            processingCount: 0,
            packedCount: 0,
            shippedCount: 0,
            onTheWayCount: 0,
            outForDeliveryCount: 0,
            deliveredCount: 0,
            cancelledCount: 0,
            returnCount: 0
        };
        metrics.totalOrdersCount = totalOrdersCount;

        const totalPages = Math.ceil(totalFilteredOrders / limit) || 1;
        const safePage = Math.min(page, totalPages);

        return {
            orders,
            totalFilteredOrders,
            totalPages,
            safePage,
            metrics
        };
    } catch (error) {
        throw new Error(`Admin Order Service Failure while fetching page data: ${error.message}`);
    }
};


export const getOrderDetailsByOrderIdAndItemId = async (orderId, orderItemId = null) => {
    try {
        if (!orderId) return null;

        const formattedId = orderId.startsWith('#') ? orderId : `#${orderId}`;

        const order = await Order.findOne({ 
            $or: [{ orderId: formattedId }, { orderId }] 
        })
            .populate('userId', 'fullName email phone')
            .populate({
                path: 'orderItems.productVariantId',
                populate: {
                    path: 'productId',
                    select: 'name images isDeleted'
                }
            })
            .lean();

        if (!order || !order.orderItems || order.orderItems.length === 0) {
            return null;
        }

        let targetItem = null;

        if (orderItemId) {
            targetItem = order.orderItems.find(i => i._id && i._id.toString() === orderItemId.toString()) || null;
            
            if (!targetItem) {
                return null;
            }
        } else {
            targetItem = order.orderItems[0];
        }

        return { order, item: targetItem };
    } catch (error) {
        throw new Error(`Admin Order Service Failure while retrieving order details: ${error.message}`);
    }
};

export const updateOrderItemStatus = async (orderId, orderItemId, newStatus) => {
    try {
        const deliveryStages = [
            'processing', 
            'packed', 
            'shipped', 
            'on the way', 
            'out for delivery', 
            'delivered'
        ];
        
        const returnStages = [
            'return initiated', 
            'pickup assigned', 
            'item picked up', 
            'in transit', 
            'item reached'
        ];

        const cleanStatus = newStatus.startsWith('return:') ? newStatus.replace('return:', '').trim() : newStatus.trim();
        const isReturnUpdate = returnStages.includes(cleanStatus);

        if (!isReturnUpdate && !deliveryStages.includes(cleanStatus)) {
            const err = new Error('Invalid status update value provided.');
            err.statusCode = 400;
            throw err;
        }

        const formattedId = formatOrderId(orderId);

        const order = await Order.findOne({
            $or: [{ orderId: formattedId }, { orderId }]
        });

        if (!order) {
            const err = new Error('Order not found.');
            err.statusCode = 404;
            throw err;
        }

        const item = order.orderItems.id(orderItemId);
        if (!item) {
            const err = new Error('Order item variant not found.');
            err.statusCode = 404;
            throw err;
        }

        if (isReturnUpdate) {
            if (item.returnStatus === 'none') {
                const err = new Error('Cannot update return stage because return was not initiated by user.');
                err.statusCode = 400;
                throw err;
            }

            const currentReturnIndex = returnStages.indexOf(item.returnStatus);
            const newReturnIndex = returnStages.indexOf(cleanStatus);

            if (newReturnIndex === currentReturnIndex) {
                return { isUnchanged: true };
            }

            if (newReturnIndex < currentReturnIndex) {
                const err = new Error('Cannot revert return stage to a previous status.');
                err.statusCode = 400;
                throw err;
            }

            const previousReturnStatus = item.returnStatus;
            item.returnStatus = cleanStatus;
            item.returnedAt = new Date();

            if (cleanStatus === 'item reached' && previousReturnStatus !== 'item reached') {
                await ProductVariant.findByIdAndUpdate(item.productVariantId, {
                    $inc: { stock: item.quantity }
                });
            }
        } else {
            if (item.itemStatus === 'cancelled') {
                const err = new Error('Cancelled items cannot be updated.');
                err.statusCode = 400;
                throw err;
            }

            if (item.itemStatus === 'delivered' && item.returnStatus === 'none') {
                const err = new Error('Delivered items cannot be modified unless a return is active.');
                err.statusCode = 400;
                throw err;
            }

            const currentDeliveryIndex = deliveryStages.indexOf(item.itemStatus);
            const newDeliveryIndex = deliveryStages.indexOf(cleanStatus);

            if (newDeliveryIndex === currentDeliveryIndex) {
                return { isUnchanged: true };
            }

            if (newDeliveryIndex < currentDeliveryIndex) {
                const err = new Error('Cannot revert delivery stage to a previous status.');
                err.statusCode = 400;
                throw err;
            }

            item.itemStatus = cleanStatus;
        }

        await order.save();
        return { isUnchanged: false };

    } catch (error) {
        throw error;
    }
};