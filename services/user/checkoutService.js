import Cart from '../../models/Cart.js';
import Wallet from '../../models/Wallet.js';
import ProductVariant from '../../models/ProductVariant.js';

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
        const findUser = await Wallet.findOne({ userId }).lean();
        const balance = findUser && typeof findUser.balance === 'number' ? findUser.balance : 0;
        
        return balance;
    } catch (error) {
        throw new Error(`Database error while fetching wallet balance: ${error.message}`);
    }
};

export const validateCheckoutSessionOrder = async (checkoutOrder) => {
    try {
        if (!checkoutOrder || !checkoutOrder.cartItems || checkoutOrder.cartItems.length === 0) {
            return {
                isValid: false,
                reason: 'NO_ITEMS',
                message: 'No items available for checkout.'
            };
        }

        const validItems = [];
        let subtotal = 0;

        for (const item of checkoutOrder.cartItems) {
            const variantId = item.productVariantId?._id || item.productVariantId;
            const quantity = parseInt(item.quantity, 10) || 1;

            const variant = await ProductVariant.findById(variantId).populate({
                path: 'productId',
                populate: { path: 'categoryId' }
            }).lean();

            if (!variant) continue;

            const product = variant.productId;
            const category = product?.categoryId;

            if (!product || product.isDeleted === true) continue;
            if (category && category.isDeleted === true) continue;

            if (typeof variant.stock === 'number' && variant.stock <= 0) {
                continue;
            }

            if (variant.stock < quantity) {
                return {
                    isValid: false,
                    reason: 'STOCK_EXCEEDED',
                    message: `Only ${variant.stock} item(s) are available in stock for ${product.name} (${variant.variantName}).`,
                    availableStock: variant.stock,
                    productName: `${product.name} (${variant.variantName})`
                };
            }

            const currentPrice = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));
            subtotal += currentPrice * quantity;

            validItems.push({
                productVariantId: variant,
                quantity,
                currentPrice,
                originalPrice: variant.originalPrice,
                discount: variant.discount || 0
            });
        }

        if (validItems.length === 0) {
            return {
                isValid: false,
                reason: 'NO_ITEMS',
                message: 'No items available for checkout.'
            };
        }

        return {
            isValid: true,
            validItems,
            subtotal
        };
    } catch (error) {
        throw new Error(`Checkout session validation error: ${error.message}`);
    }
};

