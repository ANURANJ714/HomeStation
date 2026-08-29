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
                    populate: {
                        path: 'categoryId'
                    }
                }
            })
            .lean();
            
        if (!cartItems || cartItems.length === 0) {
            return {
                isValid: false,
                reason: 'EMPTY_CART',
                message: 'No items in the cart. Please add products to proceed.'
            };
        }

        for (const item of cartItems) {
            const variant = item.productVariantId;

            if (!variant) {
                return {
                    isValid: false,
                    reason: 'ITEM_UNAVAILABLE',
                    message: 'One of the items in your cart is no longer available.'
                };
            }

            const product = variant.productId;
            const category = product?.categoryId;

            if (!product || product.isDeleted || !category || category.isDeleted) {
                const productName = product?.name || 'Selected product';
                return {
                    isValid: false,
                    reason: 'SOFT_DELETED',
                    message: `"${productName}" is no longer available.`
                };
            }

            if (variant.stock <= 0) {
                return {
                    isValid: false,
                    reason: 'OUT_OF_STOCK',
                    message: `"${product.name} (${variant.variantName})" is out of stock.`
                };
            }

            if (item.quantity > variant.stock) {
                return {
                    isValid: false,
                    reason: 'STOCK_EXCEEDED',
                    cartItemId: item._id,
                    availableStock: variant.stock,
                    productName: `${product.name} (${variant.variantName})`,
                    message: `Only ${variant.stock} units available for "${product.name} (${variant.variantName})".`
                };
            }
        }

        return {
            isValid: true,
            cartItems
        };
    } catch (error) {
        throw new Error(`Checkout Service failure during cart validation: ${error.message}`);
    }
};

export const getUserWalletBalance = async (userId) => {
    try {
        return 0;
    } catch (error) {
        throw new Error(`Database error while fetching wallet balance: ${error.message}`);
    }
};

