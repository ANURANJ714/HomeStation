import Order from '../../models/Order.js';
import ProductVariant from '../../models/ProductVariant.js';
import Product from '../../models/Products.js';
import Cart from '../../models/Cart.js';
import Coupon from '../../models/Coupon.js';
import * as walletService from '../../services/user/walletService.js';

const generateNextOrderId = async () => {
    try {
        const totalOrders = await Order.countDocuments();
        let nextNum = totalOrders + 1;
        let orderId = `#ORD-${nextNum.toString().padStart(5, '0')}`;

        let exists = await Order.findOne({ orderId }).lean();
        while (exists) {
            nextNum += 1;
            orderId = `#ORD-${nextNum.toString().padStart(5, '0')}`;
            exists = await Order.findOne({ orderId }).lean();
        }

        return orderId;
    } catch (error) {
        throw new Error(`Order ID generation failed: ${error.message}`);
    }
};

export const createNewOrder = async (userId, validatedCheckoutData, shippingAddr, billingAddr, paymentMode, couponData = {}) => {
    try {
        const { validItems, subtotal, deliveryCharges, totalPayable } = validatedCheckoutData;
        const { 
            couponUsed = null, 
            couponType = null, 
            couponDiscountValue = null,
            couponDiscount = 0 
        } = couponData;

        if (!validItems || validItems.length === 0) {
            throw new Error('No valid items found for creating the order.');
        }

        const formattedOrderItems = [];

        for (const item of validItems) {
            const variantId = item.productVariantId?._id || item.productVariantId;
            const quantity = parseInt(item.quantity, 10) || 1;

            const updatedVariant = await ProductVariant.findOneAndUpdate(
                { _id: variantId, stock: { $gte: quantity } },
                { $inc: { stock: -quantity } },
                { new: true }
            );

            if (!updatedVariant) {
                const variantName = item.productVariantId?.variantName || 'Selected Item';
                throw new Error(`Stock mismatch for variant: ${variantName}. Please re-check your order.`);
            }

            formattedOrderItems.push({
                productVariantId: updatedVariant._id,
                quantity,
                currentPrice: item.currentPrice,
                originalPrice: item.originalPrice,
                discount: item.discount || 0,
                itemStatus: 'processing',
                returnStatus: 'none',
                returnRequestStatus: null,
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
            paymentMode,
            couponUsed: couponUsed ? couponUsed.trim().toUpperCase() : null,
            couponType: couponType ? couponType.toLowerCase() : null,
            couponDiscountValue: (couponDiscountValue !== null && !isNaN(Number(couponDiscountValue))) ? Number(couponDiscountValue) : null,
            couponDiscount: Number(couponDiscount) || 0
        });

        if (couponUsed && couponUsed.trim() !== '') {
            await Coupon.updateOne(
                { code: couponUsed.trim().toUpperCase() },
                { $inc: { usedCount: 1 } }
            );
        }

        if (paymentMode === 'wallet') {
            await walletService.deductWalletBalance(userId, totalPayable, newOrder.orderId);
        }

        await Cart.deleteMany({ userId });

        return {
            order: newOrder,
            subtotal,
            deliveryCharges,
            couponUsed,
            couponType,
            couponDiscountValue,
            couponDiscount,
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

export const getUserOrderFullDetails = async (userId, orderId, orderItemId = null) => {
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

        if (!order || !order.orderItems || order.orderItems.length === 0) {
            return null;
        }

        if (orderItemId) {
            const targetItem = order.orderItems.find(
                i => i._id && i._id.toString() === orderItemId.toString()
            );

            if (!targetItem) {
                return null;
            }

            order.orderItems = [targetItem];
        }

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
        const allowedCancelStages = ['processing', 'packed'];
        const isOnlinePayment = order.paymentMode === 'razorpay' || order.paymentMode === 'wallet';

        if (orderItemId) {
            const item = order.orderItems.id(orderItemId);
            if (!item) {
                const err = new Error('Item not found in this order.');
                err.statusCode = 404;
                throw err;
            }

            if (!allowedCancelStages.includes(item.itemStatus)) {
                const err = new Error(`Item cannot be cancelled once it is ${item.itemStatus}.`);
                err.statusCode = 400;
                throw err;
            }

            item.itemStatus = 'cancelled';
            item.cancellationReason = trimmedReason;
            item.cancelledAt = now;

            await ProductVariant.findByIdAndUpdate(item.productVariantId, {
                $inc: { stock: item.quantity }
            });

            let refundedAmount = 0;
            if (isOnlinePayment) {
                refundedAmount = calculateItemRefundAmount(order, item);
                if (refundedAmount > 0) {
                    await walletService.creditWalletRefund(
                        userId,
                        refundedAmount,
                        `Refund for Cancelled Item in Order ${order.orderId}`,
                        order.orderId,
                        'cancellation_refund'
                    );
                }
            }

            await order.save();

            return { isEntireOrder: false, order, refundedAmount };
        }

        const cancellableItems = order.orderItems.filter(i => allowedCancelStages.includes(i.itemStatus));
        if (cancellableItems.length === 0) {
            const err = new Error('None of the items in this order are eligible for cancellation.');
            err.statusCode = 400;
            throw err;
        }

        let totalRefunded = 0;

        for (const item of cancellableItems) {
            item.itemStatus = 'cancelled';
            item.cancellationReason = trimmedReason;
            item.cancelledAt = now;

            await ProductVariant.findByIdAndUpdate(item.productVariantId, {
                $inc: { stock: item.quantity }
            });

            if (isOnlinePayment) {
                const refundForItem = calculateItemRefundAmount(order, item);
                totalRefunded += refundForItem;
            }
        }

        if (isOnlinePayment && totalRefunded > 0) {
            await walletService.creditWalletRefund(
                userId,
                totalRefunded,
                `Refund for Cancelled Order ${order.orderId}`,
                order.orderId,
                'cancellation_refund'
            );
        }

        await order.save();
        return { isEntireOrder: true, order, refundedAmount: totalRefunded };

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

            if (item.returnRequestStatus && item.returnRequestStatus !== null) {
                const err = new Error('A return request has already been submitted for this item.');
                err.statusCode = 400;
                throw err;
            }

            item.returnRequestStatus = 'requested';
            item.returnStatus = 'none';
            item.returnReason = trimmedReason;
            item.returnedAt = now;

            await order.save();
            return { isEntireOrder: false, order };
        }

        order.orderItems.forEach(item => {
            if (item.itemStatus === 'delivered' && !item.returnRequestStatus) {
                item.returnRequestStatus = 'requested';
                item.returnStatus = 'none';
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

export const calculateItemRefundAmount = (order, item) => {
    const itemTotal = Number(item.currentPrice) * Number(item.quantity);

    if (!order.couponUsed) {
        return itemTotal;
    }

    if (order.couponType === 'percentage') {
        const percent = Number(order.couponDiscountValue) || 0;
        const discountForThisItem = Math.round((itemTotal * percent) / 100);
        const finalRefund = Math.max(0, itemTotal - discountForThisItem);
        return finalRefund;
    }

    if (order.couponType === 'flat') {
        const totalOrderAmount = order.orderItems.reduce((acc, curr) => {
            return acc + (Number(curr.currentPrice) * Number(curr.quantity));
        }, 0);

        if (totalOrderAmount <= 0) return itemTotal;

        const flatDiscountValue = Number(order.couponDiscountValue) || 0;
        const itemShareOfDiscount = Math.round((itemTotal / totalOrderAmount) * flatDiscountValue);
        const finalRefund = Math.max(0, itemTotal - itemShareOfDiscount);
        return finalRefund;
    }

    return itemTotal;
};