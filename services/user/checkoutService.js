import Cart from '../../models/Cart.js';
import ProductVariant from '../../models/ProductVariant.js';
import Product from '../../models/Products.js';
import Category from '../../models/Category.js';

export const validateCartForCheckout = async (userId) => {
    try {
        const cartItems = await Cart.find({ userId })
            .populate({
                path: 'productVariantId',
                populate: {
                    path: 'productId',
                    populate: { path: 'categoryId' }
                }
            })
            .lean();

        if (!cartItems || cartItems.length === 0) {
            return {
                isValid: false,
                reason: 'EMPTY_CART',
                message: 'Your cart is empty.'
            };
        }

        const validItems = [];

        for (const item of cartItems) {
            const variant = item.productVariantId;
            if (!variant) continue;

            const product = variant.productId;
            if (!product || product.isDeleted === true) continue;

            const category = product.categoryId;
            if (category && category.isDeleted === true) continue;

            if (typeof variant.stock === 'number' && variant.stock <= 0) {
                continue;
            }

            if (variant.stock < item.quantity) {
                return {
                    isValid: false,
                    reason: 'STOCK_EXCEEDED',
                    message: `Only ${variant.stock} item(s) are available in stock for this variant.`,
                    cartItemId: item._id,
                    availableStock: variant.stock,
                    productName: `${product.name} (${variant.variantName})`
                };
            }

            validItems.push(item);
        }

        if (validItems.length === 0) {
            return {
                isValid: false,
                reason: 'EMPTY_CART',
                message: 'No available items in cart to checkout.'
            };
        }

        return {
            isValid: true,
            cartItems: validItems
        };
    } catch (error) {
        throw new Error(`Checkout validation service error: ${error.message}`);
    }
};

export const getUserWalletBalance = async (userId) => {
    try {
        return 0;
    } catch (error) {
        throw new Error(`Database error while fetching wallet balance: ${error.message}`);
    }
};

