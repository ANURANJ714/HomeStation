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
        const unavailableProductNames = [];

        for (const item of cartItems) {
            const variant = item.productVariantId;
            const product = variant?.productId;
            const category = product?.categoryId;

            const isVariantMissing = !variant;
            const isProductDeleted = !product || product.isDeleted === true;
            const isCategoryDeleted = category && category.isDeleted === true;
            const isOutOfStock = typeof variant?.stock === 'number' && variant.stock <= 0;

            if (isVariantMissing || isProductDeleted || isCategoryDeleted || isOutOfStock) {
                const name = product ? `${product.name} (${variant?.variantName || 'Item'})` : 'An item';
                unavailableProductNames.push(name);
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

        const warningNotice = unavailableProductNames.length > 0 
            ? `${unavailableProductNames.join(', ')} is out of stock or no longer available and was excluded from checkout.`
            : null;

        return {
            isValid: true,
            cartItems: validItems,
            warningNotice
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
        const unavailableProductNames = [];

        for (const item of checkoutOrder.cartItems) {
            const variantId = item.productVariantId?._id || item.productVariantId;
            const quantity = parseInt(item.quantity, 10) || 1;

            const variant = await ProductVariant.findById(variantId).populate({
                path: 'productId',
                populate: { path: 'categoryId' }
            }).lean();

            if (!variant) {
                unavailableProductNames.push('An item');
                continue;
            }

            const product = variant.productId;
            const category = product?.categoryId;

            const isProductDeleted = !product || product.isDeleted === true;
            const isCategoryDeleted = category && category.isDeleted === true;
            const isOutOfStock = typeof variant.stock === 'number' && variant.stock <= 0;

            if (isProductDeleted || isCategoryDeleted || isOutOfStock) {
                const name = product ? `${product.name} (${variant.variantName})` : 'An item';
                unavailableProductNames.push(name);
                continue;
            }

            if (variant.stock < quantity) {
                return {
                    isValid: false,
                    reason: 'STOCK_EXCEEDED',
                    message: `Only ${variant.stock} item(s) are available in stock for ${product.name} (${variant.variantName}).`,
                    variantId: variant._id.toString(),
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
                message: 'No available items in cart to checkout.'
            };
        }

        const warningNotice = unavailableProductNames.length > 0
            ? `${unavailableProductNames.join(', ')} is out of stock or no longer available and was excluded from your order.`
            : null;

        return {
            isValid: true,
            validItems,
            subtotal,
            warningNotice
        };
    } catch (error) {
        throw new Error(`Checkout session validation error: ${error.message}`);
    }
};

export const applyStockResolutionToSession = async (userId, checkoutOrder, { variantId, action, targetQuantity }) => {
    try {
        if (!checkoutOrder || !checkoutOrder.cartItems) return checkoutOrder;

        const targetVariantId = String(variantId);

        if (action === 'set') {
            const resolvedQty = Math.max(1, parseInt(targetQuantity, 10));

            checkoutOrder.cartItems = checkoutOrder.cartItems.map((item) => {
                const id = (item.productVariantId?._id || item.productVariantId).toString();
                if (id === targetVariantId) {
                    item.quantity = resolvedQty;
                }
                return item;
            });

            if (userId) {
                await Cart.updateOne(
                    { userId, productVariantId: targetVariantId },
                    { $set: { quantity: resolvedQty } }
                );
            }
        } else if (action === 'remove') {
            checkoutOrder.cartItems = checkoutOrder.cartItems.filter((item) => {
                const id = (item.productVariantId?._id || item.productVariantId).toString();
                return id !== targetVariantId;
            });

            if (userId) {
                await Cart.deleteOne({ userId, productVariantId: targetVariantId });
            }
        }

        checkoutOrder.totalQuantity = checkoutOrder.cartItems.reduce(
            (acc, item) => acc + (parseInt(item.quantity, 10) || 1),
            0
        );

        return checkoutOrder;
    } catch (error) {
        throw new Error(`Error syncing stock resolution to cart database: ${error.message}`);
    }
};