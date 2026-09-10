import Order from '../../models/Order.js';
import ProductVariant from '../../models/ProductVariant.js';
import Product from '../../models/Products.js';
import Cart from '../../models/Cart.js';

const generateNextOrderId = async () => {
    const totalOrders = await Order.countDocuments();
    const nextNum = totalOrders + 1;
    return `#ORD-${nextNum.toString().padStart(5, '0')}`;
};

export const createNewOrder = async (userId, validatedCheckoutData, shippingAddr, billingAddr, paymentMode) => {
    try {
        const { validItems, subtotal, deliveryCharges, totalPayable } = validatedCheckoutData;

        if (!validItems || validItems.length === 0) {
            throw new Error('No valid items found for creating the order.');
        }

        const formattedOrderItems = [];

        for (const item of validItems) {
            const variantId = item.productVariantId._id;
            const quantity = item.quantity;

            const updatedVariant = await ProductVariant.findOneAndUpdate(
                { _id: variantId, stock: { $gte: quantity } },
                { $inc: { stock: -quantity } },
                { new: true }
            );

            if (!updatedVariant) {
                throw new Error(`Stock mismatch for variant: ${item.productVariantId.variantName}. Please re-check your order.`);
            }

            formattedOrderItems.push({
                productVariantId: updatedVariant._id,
                quantity,
                currentPrice: item.currentPrice,
                originalPrice: item.originalPrice,
                discount: item.discount,
                itemStatus: 'processing',
                returnStatus: 'none',
                cancellationReason: null,
                returnReason: null,
                cancelledAt: null,
                returnedAt: null
            });
        }

        const customOrderId = await generateNextOrderId();

        const newOrder = await Order.create({
            orderId: customOrderId,
            userId,
            orderItems: formattedOrderItems,
            shippingAddress: {
                name: shippingAddr.name || shippingAddr.fullName,
                phone: shippingAddr.phone,
                pincode: shippingAddr.pincode,
                city: shippingAddr.city,
                state: shippingAddr.state,
                fullAddress: shippingAddr.fullAddress || shippingAddr.addressLine,
                addressType: shippingAddr.addressType || 'Home'
            },
            billingAddress: {
                name: billingAddr.name || billingAddr.fullName,
                phone: billingAddr.phone,
                pincode: billingAddr.pincode,
                city: billingAddr.city,
                state: billingAddr.state,
                fullAddress: billingAddr.fullAddress || billingAddr.addressLine,
                addressType: billingAddr.addressType || 'Home'
            },
            paymentMode
        });

        await Cart.deleteMany({ userId });

        return {
            order: newOrder,
            subtotal,
            deliveryCharges,
            totalPayable
        };
    } catch (error) {
        throw new Error(`Order creation service failure: ${error.message}`);
    }
};

export const getOrderDetailsByOrderId = async (orderId) => {
    try {
        const order = await Order.findOne({ orderId })
            .populate('userId', 'fullName email phone')
            .populate({
                path: 'orderItems.productVariantId',
                populate: {
                    path: 'productId',
                    select: 'name images isDeleted'
                }
            })
            .lean();

        if (!order) {
            return null;
        }

        return order;
    } catch (error) {
        throw new Error(`Admin Order Service Failure while retrieving order details: ${error.message}`);
    }
};

export const getUserOrdersPageData = async (userId, page = 1, limit = 4, searchQuery = '', statusFilters = [], timeFilter = '') => {
    try {
        const query = { userId };

        if (searchQuery && searchQuery.trim() !== '') {
            const matchingProducts = await Product.find({
                name: { $regex: searchQuery.trim(), $options: 'i' }
            }).select('_id').lean();

            const productIds = matchingProducts.map(p => p._id);

            const matchingVariants = await ProductVariant.find({
                productId: { $in: productIds }
            }).select('_id').lean();

            const variantIds = matchingVariants.map(v => v._id);

            query['orderItems.productVariantId'] = { $in: variantIds };
        }

        if (statusFilters && statusFilters.length > 0) {
            const statusQueries = [];

            statusFilters.forEach(stat => {
                if (stat === 'on-the-way') {
                    statusQueries.push({
                        orderItems: {
                            $elemMatch: {
                                itemStatus: { $nin: ['cancelled', 'delivered'] },
                                returnStatus: 'none'
                            }
                        }
                    });
                } else if (stat === 'delivered') {
                    statusQueries.push({
                        orderItems: {
                            $elemMatch: {
                                itemStatus: 'delivered',
                                returnStatus: 'none'
                            }
                        }
                    });
                } else if (stat === 'cancelled') {
                    statusQueries.push({
                        orderItems: {
                            $elemMatch: {
                                itemStatus: 'cancelled',
                                returnStatus: 'none'
                            }
                        }
                    });
                } else if (stat === 'returned') {
                    statusQueries.push({
                        orderItems: {
                            $elemMatch: {
                                returnStatus: { $ne: 'none' }
                            }
                        }
                    });
                }
            });

            if (statusQueries.length > 0) {
                query.$or = statusQueries;
            }
        }

        if (timeFilter) {
            const now = new Date();
            if (timeFilter === '30days') {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(now.getDate() - 30);
                query.createdAt = { $gte: thirtyDaysAgo };
            } else if (timeFilter === 'lastyear') {
                const lastYearDate = new Date();
                lastYearDate.setDate(now.getDate() - 365);
                query.createdAt = { $gte: lastYearDate };
            } else if (timeFilter === 'older') {
                const olderThanYear = new Date();
                olderThanYear.setDate(now.getDate() - 365);
                query.createdAt = { $lt: olderThanYear };
            }
        }

        const skip = (page - 1) * limit;

        const [orders, totalFilteredOrders] = await Promise.all([
            Order.find(query)
                .populate({
                    path: 'orderItems.productVariantId',
                    populate: {
                        path: 'productId',
                        select: 'name images categoryId',
                        populate: { path: 'categoryId', select: 'name' }
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query)
        ]);

        orders.forEach(order => {
            order.orderItems = order.orderItems.filter(item => {
                let matchesStatus = true;
                if (statusFilters && statusFilters.length > 0) {
                    matchesStatus = statusFilters.some(stat => {
                        if (stat === 'on-the-way') {
                            return item.itemStatus !== 'cancelled' && item.itemStatus !== 'delivered' && item.returnStatus === 'none';
                        }
                        if (stat === 'delivered') {
                            return item.itemStatus === 'delivered' && item.returnStatus === 'none';
                        }
                        if (stat === 'cancelled') {
                            return item.itemStatus === 'cancelled' && item.returnStatus === 'none';
                        }
                        if (stat === 'returned') {
                            return item.returnStatus && item.returnStatus !== 'none';
                        }
                        return false;
                    });
                }

                let matchesSearch = true;
                if (searchQuery && searchQuery.trim() !== '') {
                    const prodName = item.productVariantId?.productId?.name || '';
                    matchesSearch = prodName.toLowerCase().includes(searchQuery.trim().toLowerCase());
                }

                return matchesStatus && matchesSearch;
            });
        });

        const filteredOrders = orders.filter(order => order.orderItems.length > 0);

        const totalPages = Math.ceil(totalFilteredOrders / limit) || 1;
        const safePage = Math.min(page, totalPages);

        return {
            orders: filteredOrders,
            totalFilteredOrders,
            totalPages,
            safePage,
            limit
        };
    } catch (error) {
        throw new Error(`User Order Service Failure: ${error.message}`);
    }
};

export const getUserOrderFullDetails = async (userId, orderId) => {
    try {
        if (!orderId) return null;

        const formattedOrderId = orderId.startsWith('#') ? orderId : `#${orderId}`;

        const order = await Order.findOne({
            userId,
            $or: [{ orderId: formattedOrderId }, { orderId }]
        })
            .populate({
                path: 'orderItems.productVariantId',
                populate: {
                    path: 'productId',
                    select: 'name images categoryId',
                    populate: {
                        path: 'categoryId',
                        select: 'name'
                    }
                }
            })
            .lean();

        return order;
    } catch (error) {
        throw new Error(`Service failure fetching order details: ${error.message}`);
    }
};

export const cancelOrderOrItem = async (userId, orderId, orderItemId, reason) => {
    try {
        if (!orderId || !reason || reason.trim() === '') {
            const err = new Error('Order ID and a valid cancellation reason are required.');
            err.statusCode = 400;
            throw err;
        }

        const formattedOrderId = orderId.startsWith('#') ? orderId : `#${orderId}`;

        const order = await Order.findOne({
            userId,
            $or: [{ orderId: formattedOrderId }, { orderId }]
        });

        if (!order) {
            const err = new Error('Order not found.');
            err.statusCode = 404;
            throw err;
        }

        const trimmedReason = reason.trim();
        const now = new Date();

        if (orderItemId) {
            const item = order.orderItems.id(orderItemId);
            if (!item) {
                const err = new Error('Item not found in this order.');
                err.statusCode = 404;
                throw err;
            }

            if (item.itemStatus === 'delivered' || item.itemStatus === 'cancelled') {
                const err = new Error(`Cannot cancel an item that is already ${item.itemStatus}.`);
                err.statusCode = 400;
                throw err;
            }

            item.itemStatus = 'cancelled';
            item.cancellationReason = trimmedReason;
            item.cancelledAt = now;

            const allCancelled = order.orderItems.every(i => i.itemStatus === 'cancelled');
            order.status = allCancelled ? 'cancelled' : 'partially cancelled';

            await order.save();

            await ProductVariant.findByIdAndUpdate(item.productVariantId, {
                $inc: { stock: item.quantity }
            });

            return { isEntireOrder: false, order };
        }

        if (order.status === 'delivered' || order.status === 'cancelled') {
            const err = new Error(`Cannot cancel an order that is already ${order.status}.`);
            err.statusCode = 400;
            throw err;
        }

        order.status = 'cancelled';

        for (const item of order.orderItems) {
            if (item.itemStatus !== 'cancelled') {
                item.itemStatus = 'cancelled';
                item.cancellationReason = trimmedReason;
                item.cancelledAt = now;

                await ProductVariant.findByIdAndUpdate(item.productVariantId, {
                    $inc: { stock: item.quantity }
                });
            }
        }

        await order.save();
        return { isEntireOrder: true, order };

    } catch (error) {
        throw error;
    }
};

export const getUserDeliveredOrderInvoice = async (userId, orderId) => {
    try {
        if (!orderId) return null;

        const formattedOrderId = orderId.startsWith('#') ? orderId : `#${orderId}`;

        const order = await Order.findOne({
            userId,
            $or: [{ orderId: formattedOrderId }, { orderId }]
        })
            .populate('userId', 'fullName email phone')
            .populate({
                path: 'orderItems.productVariantId',
                populate: {
                    path: 'productId',
                    select: 'name categoryId',
                    populate: {
                        path: 'categoryId',
                        select: 'name'
                    }
                }
            })
            .lean();

        return order;
    } catch (error) {
        throw new Error(`Service Layer failure fetching invoice details: ${error.message}`);
    }
};

export const returnOrderOrItem = async (userId, orderId, orderItemId, reason) => {
    try {
        if (!orderId || !reason || reason.trim() === '') {
            const err = new Error('Order ID and a valid return reason are required.');
            err.statusCode = 400;
            throw err;
        }

        const formattedOrderId = orderId.startsWith('#') ? orderId : `#${orderId}`;

        const order = await Order.findOne({
            userId,
            $or: [{ orderId: formattedOrderId }, { orderId }]
        });

        if (!order) {
            const err = new Error('Order not found.');
            err.statusCode = 404;
            throw err;
        }

        const deliveredDate = new Date(order.updatedAt || order.createdAt);
        const differenceInDays = (new Date() - deliveredDate) / (1000 * 60 * 60 * 24);

        if (differenceInDays > 15) {
            const err = new Error('Return window expired. Items can only be returned within 15 days of delivery.');
            err.statusCode = 400;
            throw err;
        }

        const trimmedReason = reason.trim();
        const now = new Date();

        if (orderItemId) {
            const item = order.orderItems.id(orderItemId);
            if (!item) {
                const err = new Error('Item not found in this order.');
                err.statusCode = 404;
                throw err;
            }

            if (item.itemStatus !== 'delivered') {
                const err = new Error('Only delivered items are eligible for return.');
                err.statusCode = 400;
                throw err;
            }

            if (item.returnStatus && item.returnStatus !== 'none') {
                const err = new Error('A return request has already been submitted for this item.');
                err.statusCode = 400;
                throw err;
            }

            item.returnStatus = 'return initiated';
            item.returnReason = trimmedReason;
            item.returnedAt = now;

            const allReturned = order.orderItems.every(i => i.returnStatus === 'return initiated' || i.returnStatus === 'item reached');
            order.returnStatus = allReturned ? 'return initiated' : 'partially returned';

            await order.save();
            return { isEntireOrder: false, order };
        }

        if (order.status !== 'delivered') {
            const err = new Error('Only delivered orders can be returned.');
            err.statusCode = 400;
            throw err;
        }

        if (order.returnStatus === 'return initiated' || order.returnStatus === 'returned') {
            const err = new Error('A return request has already been submitted for this order.');
            err.statusCode = 400;
            throw err;
        }

        order.returnStatus = 'return initiated';

        order.orderItems.forEach(item => {
            if (item.itemStatus === 'delivered') {
                item.returnStatus = 'return initiated';
                item.returnReason = trimmedReason;
                item.returnedAt = now;
            }
        });

        await order.save();
        return { isEntireOrder: true, order };

    } catch (error) {
        throw error;
    }
};