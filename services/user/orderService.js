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