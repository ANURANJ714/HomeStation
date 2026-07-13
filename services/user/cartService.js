import Cart from '../../models/Cart.js';
import ProductVariant from '../../models/ProductVariant.js';
import Product from '../../models/Products.js';
import { removeVariantFromWishlist } from '../../services/user/wishlistService.js';

export const addVariantToCart = async (userId, productVariantId) => {
    try {
        let cartItem = await Cart.findOne({ userId, productVariantId });

        if (cartItem) {
            cartItem.quantity += 1;
            await cartItem.save();
            return { action: 'updated', quantity: cartItem.quantity };
        } else {
            cartItem = new Cart({
                userId,
                productVariantId,
                quantity: 1
            });
            await cartItem.save();
            return { action: 'added', quantity: 1 };
        }
    } catch (error) {
        throw new Error(`Database error while adding to cart: ${error.message}`);
    }
};

export const handleAddToCartIntent = async (userId, variantId) => {
    try {
        const variant = await ProductVariant.findById(variantId).populate({
            path: 'productId',
            populate: { path: 'categoryId' }
        });

        if (!variant || !variant.productId || variant.productId.isDeleted === true) {
            return { success: false, reason: 'PRODUCT_REMOVED', message: "Product has been removed." };
        }

        if (variant.stock <= 0) {
            return { success: false, reason: 'OUT_OF_STOCK', message: "Product is out of stock." };
        }

        if (variant.productId.categoryId && variant.productId.categoryId.isDeleted === true) {
            return { success: false, reason: 'PRODUCT_REMOVED', message: "Product has been removed." };
        }

        let cartItem = await Cart.findOne({ userId, productVariantId: variantId });

        if (cartItem) {
            cartItem.quantity += 1;
            await cartItem.save();
        } else {
            cartItem = new Cart({
                userId,
                productVariantId: variantId,
                quantity: 1
            });
            await cartItem.save();
        }

        await removeVariantFromWishlist(userId, variantId);

        return { success: true };

    } catch (error) {
        throw new Error(`Service Layer failure handling add-to-cart logic: ${error.message}`);
    }
};

export const getCartItems = async (userId) => {
    try {
        const cartItems = await Cart.find({ userId })
            .populate({
                path: 'productVariantId',
                populate: {
                    path: 'productId',
                    model: 'Product',
                    populate: {
                        path: 'categoryId',
                        model: 'Category'
                    }
                }
            })
            .exec();

        let subtotal = 0;
        let totalQuantity = 0;
        let flags = { outOfStockRemoved: false, productRemoved: false, categoryRemoved: false };
        const validCartItems = [];

        for (const item of cartItems) {
            const variant = item.productVariantId;
            
            if (!variant || !variant.productId) {
                flags.productRemoved = true;
                continue; 
            }

            const product = variant.productId;
            const category = product.categoryId;

            if (variant.stock <= 0) {
                flags.outOfStockRemoved = true;
                continue; 
            }

            if (product.isDeleted === true) {
                flags.productRemoved = true;
                continue; 
            }

            if (category && category.isDeleted === true) {
                flags.categoryRemoved = true;
                continue; 
            }

            const currentPrice = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));
            subtotal += currentPrice * item.quantity;
            totalQuantity += item.quantity;
            validCartItems.push(item);
        }

        return { 
            cartItems: validCartItems, 
            subtotal, 
            totalQuantity,
            flags 
        };

    } catch (error) {
        throw new Error(`Database error while fetching cart items: ${error.message}`);
    }
};

export const updateCartQuantity = async (userId, cartItemId, actionType) => {
    try {
        const cartItem = await Cart.findOne({ _id: cartItemId, userId });
        if (!cartItem) {
            return { success: false, reason: 'NOT_FOUND', message: 'Cart item not found.' };
        }

        const variant = await ProductVariant.findById(cartItem.productVariantId).populate({
            path: 'productId',
            populate: { path: 'categoryId' }
        });

        if (!variant || !variant.productId || variant.productId.isDeleted === true) {
            return { success: false, reason: 'PRODUCT_REMOVED', message: "Product has been removed." };
        }

        if (variant.productId.categoryId && variant.productId.categoryId.isDeleted === true) {
            return { success: false, reason: 'PRODUCT_REMOVED', message: "Product has been removed." };
        }

        if (variant.stock <= 0) {
            return { success: false, reason: 'OUT_OF_STOCK', message: "Product is out of stock." };
        }

        if (actionType === 'increase') {
            if (cartItem.quantity >= variant.stock) {
                return { 
                    success: false, 
                    reason: 'OUT_OF_STOCK', 
                    message: `Only ${variant.stock} units available in stock.` 
                };
            }
            cartItem.quantity += 1;
            await cartItem.save();
            return { success: true, action: 'updated', currentQuantity: cartItem.quantity };

        } else if (actionType === 'decrease') {
            if (cartItem.quantity <= 1) {
                await Cart.deleteOne({ _id: cartItemId, userId });
                return { success: true, action: 'removed', currentQuantity: 0 };
            }
            
            cartItem.quantity -= 1;
            await cartItem.save();
            return { success: true, action: 'updated', currentQuantity: cartItem.quantity };
        }

        return { success: false, message: 'Invalid action type.' };
    } catch (error) {
        throw new Error(`Database error while modifying cart item quantity: ${error.message}`);
    }
};

export const deleteCartItemCompletely = async (userId, cartItemId) => {
    try {
        const deletionResult = await Cart.deleteOne({ _id: cartItemId, userId });
        return deletionResult.deletedCount > 0;
    } catch (error) {
        throw new Error(`Database error while completely deleting cart entry: ${error.message}`);
    }
};
