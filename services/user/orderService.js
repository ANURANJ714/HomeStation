import Order from '../../models/Order.js';
import ProductVariant from '../../models/ProductVariant.js';
import Product from '../../models/Products.js';
import Category from '../../models/Category.js';
import Cart from '../../models/Cart.js';

export const generateNextOrderId = async () => {
    try {
        const lastOrder = await Order.findOne().sort({ createdAt: -1 });
        let nextIdNum = 1;
        
        if (lastOrder && lastOrder.orderId && lastOrder.orderId.startsWith('#ORD-')) {
            const lastNum = parseInt(lastOrder.orderId.split('-')[1], 10);
            if (!isNaN(lastNum)) {
                nextIdNum = lastNum + 1;
            }
        }

        return `#ORD-${String(nextIdNum).padStart(5, '0')}`;
    } catch (error) {
        throw new Error(`Database error while generating custom Order ID: ${error.message}`);
    }
};

export const createNewOrder = async (userId, checkoutSessionData, shippingAddr, billingAddr) => {
    try {
        const cartItems = checkoutSessionData.cartItems;

        if (!cartItems || cartItems.length === 0) {
            throw new Error('No items found in checkout session.');
        }

        const formattedOrderItems = [];

        for (const item of cartItems) {
            const variantId = item.productVariantId._id || item.productVariantId;
            const variant = await ProductVariant.findById(variantId).populate({
                path: 'productId',
                populate: { path: 'categoryId' }
            });

            if (!variant) {
                throw new Error('A product variant in your cart no longer exists.');
            }

            const product = variant.productId;
            const category = product?.categoryId;

            if (!product || product.isDeleted || !category || category.isDeleted) {
                throw new Error(`"${product?.name || 'Product'}" is no longer available.`);
            }

            if (variant.stock <= 0 || variant.stock < item.quantity) {
                throw new Error(`"${product.name} (${variant.variantName})" is out of stock.`);
            }

            const currentPrice = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));

            formattedOrderItems.push({
                productVariantId: variant._id,
                quantity: item.quantity,
                currentPrice,
                originalPrice: variant.originalPrice,
                discount: variant.discount || 0
            });
        }

        for (const item of formattedOrderItems) {
            await ProductVariant.findByIdAndUpdate(item.productVariantId, {
                $inc: { stock: -item.quantity }
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
            paymentMode: checkoutSessionData.paymentMode,
            status: 'processing'
        });

        await Cart.deleteMany({ userId });

        return newOrder;
    } catch (error) {
        throw new Error(`Order Service failure: ${error.message}`);
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
                    statusQueries.push({ status: { $in: ['processing', 'packed', 'shipped', 'on the way', 'out for delivery'] } });
                } else if (stat === 'delivered') {
                    statusQueries.push({ status: 'delivered', returnStatus: 'none' });
                } else if (stat === 'cancelled') {
                    statusQueries.push({ status: 'cancelled' });
                } else if (stat === 'returned') {
                    statusQueries.push({ returnStatus: { $ne: 'none' } });
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
                const threeHundredSixtyFiveDaysAgo = new Date();
                threeHundredSixtyFiveDaysAgo.setDate(now.getDate() - 365);
                query.createdAt = { $gte: threeHundredSixtyFiveDaysAgo };
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

        const totalPages = Math.ceil(totalFilteredOrders / limit) || 1;
        const safePage = Math.min(page, totalPages);

        return {
            orders,
            totalFilteredOrders,
            totalPages,
            safePage,
            limit
        };
    } catch (error) {
        throw new Error(`User Order Service Failure: ${error.message}`);
    }
};

export const getUserOrderDetails = async (userId, orderId) => {
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
        throw new Error(`Service Layer failure fetching order details: ${error.message}`);
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