import Cart from '../../models/Cart.js';
import ProductVariant from '../../models/ProductVariant.js';
import { removeVariantFromWishlist } from '../../services/user/wishlistService.js';
import Offer from '../../models/Offer.js';
import mongoose from 'mongoose';

export const handleAddToCartIntent = async (userId, variantId, quantity = 1) => {
    try {
        const MAX_PER_PRODUCT_LIMIT = 5;
        const parsedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

        const variant = await ProductVariant.findById(variantId).populate({
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

        let cartItem = await Cart.findOne({ userId, productVariantId: variantId });

        if (cartItem) {
            if (cartItem.quantity >= MAX_PER_PRODUCT_LIMIT) {
                return {
                    success: false,
                    reason: 'MAX_LIMIT_REACHED',
                    message: "Maximum quantity limit reached for this product."
                };
            }

            if (cartItem.quantity + parsedQuantity > MAX_PER_PRODUCT_LIMIT) {
                const remainingAllowed = MAX_PER_PRODUCT_LIMIT - cartItem.quantity;
                return {
                    success: false,
                    reason: 'MAX_LIMIT_EXCEEDED',
                    message: `You can only add ${remainingAllowed} more unit(s). Maximum limit is ${MAX_PER_PRODUCT_LIMIT} per product.`
                };
            }

            if (cartItem.quantity + parsedQuantity > variant.stock) {
                return { 
                    success: false, 
                    reason: 'OUT_OF_STOCK', 
                    message: `Cannot add requested quantity. Only ${variant.stock} units are available, and you have ${cartItem.quantity} already in your cart.` 
                };
            }

            cartItem.quantity += parsedQuantity;
            await cartItem.save();
        } else {
            if (parsedQuantity > MAX_PER_PRODUCT_LIMIT) {
                return {
                    success: false,
                    reason: 'MAX_LIMIT_EXCEEDED',
                    message: `Maximum quantity limit is ${MAX_PER_PRODUCT_LIMIT} per product.`
                };
            }

            if (parsedQuantity > variant.stock) {
                return { success: false, reason: 'OUT_OF_STOCK', message: `Only ${variant.stock} units available in stock.` };
            }

            cartItem = new Cart({
                userId,
                productVariantId: variantId,
                quantity: parsedQuantity
            });
            await cartItem.save();
        }

        await removeVariantFromWishlist(userId, variantId);

        const cartCountAggregation = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalCount: { $sum: "$quantity" } } }
        ]);

        const totalCartCount = cartCountAggregation.length > 0 ? cartCountAggregation[0].totalCount : 0;

        return { 
            success: true, 
            totalCartCount: totalCartCount 
        };

    } catch (error) {
        throw new Error(`Service Layer failure handling add-to-cart logic: ${error.message}`);
    }
};

export const getCartItems = async (userId) => {
    try {
        const currentDate = new Date();

        const activeOffers = await Offer.find({
            isDeleted: false,
            status: 'active',
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        }).lean();

        const productOffersMap = {};
        const categoryOffersMap = {};

        activeOffers.forEach((offer) => {
            const targetIdStr = offer.targetId ? offer.targetId.toString() : null;
            if (!targetIdStr) return;

            if (offer.offerType === 'product') {
                if (!productOffersMap[targetIdStr] || offer.discount > productOffersMap[targetIdStr]) {
                    productOffersMap[targetIdStr] = offer.discount;
                }
            } else if (offer.offerType === 'category') {
                if (!categoryOffersMap[targetIdStr] || offer.discount > categoryOffersMap[targetIdStr]) {
                    categoryOffersMap[targetIdStr] = offer.discount;
                }
            }
        });

        const calculateBestDiscount = (variantDiscount = 0, productId, categoryId) => {
            const pIdStr = productId ? productId.toString() : '';
            const cIdStr = categoryId ? categoryId.toString() : '';

            const productOfferDiscount = productOffersMap[pIdStr] || 0;
            const categoryOfferDiscount = categoryOffersMap[cIdStr] || 0;
            const baseDiscount = Number(variantDiscount) || 0;

            return Math.max(baseDiscount, productOfferDiscount, categoryOfferDiscount);
        };

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
            .lean();

        let subtotal = 0;
        let totalQuantity = 0;
        const validCartItems = [];
        let stockExceededItem = null;
        const unavailableNames = [];

        for (const item of cartItems) {
            const variant = item.productVariantId;
            const product = variant?.productId;
            const category = product?.categoryId;

            const isVariantMissing = !variant;
            const isProductDeleted = !product || product.isDeleted === true || product.isDeleted === 'true';
            const isCategoryDeleted = category && (category.isDeleted === true || category.isDeleted === 'true');
            const isOutOfStock = typeof variant?.stock === 'number' && variant.stock <= 0;

            if (isVariantMissing || isProductDeleted || isCategoryDeleted || isOutOfStock) {
                const name = product ? `${product.name} (${variant?.variantName || 'Item'})` : 'An item in your cart';
                unavailableNames.push(name);
                continue;
            }

            if (typeof variant.stock === 'number' && variant.stock < item.quantity && !stockExceededItem) {
                stockExceededItem = {
                    cartItemId: item._id.toString(),
                    productName: `${product.name} (${variant.variantName})`,
                    availableStock: variant.stock,
                    selectedQuantity: item.quantity
                };
            }

            const effectiveDiscount = calculateBestDiscount(
                variant.discount,
                product._id,
                category?._id || category
            );

            const calculatedPrice = Math.round(variant.originalPrice * (1 - (effectiveDiscount / 100)));

            subtotal += calculatedPrice * item.quantity;
            totalQuantity += item.quantity;

            validCartItems.push({
                ...item,
                productVariantId: {
                    ...variant,
                    effectiveDiscount,
                    calculatedPrice
                }
            });
        }

        const unavailableNotice = unavailableNames.length > 0 ? {
            title: "Product Unavailable",
            message: `${unavailableNames.join(', ')} is currently out of stock or no longer available.`
        } : null;

        return { 
            cartItems: validCartItems, 
            subtotal, 
            totalQuantity, 
            stockExceededItem, 
            unavailableNotice 
        };

    } catch (error) {
        throw new Error(`Database error while fetching cart items: ${error.message}`);
    }
};

export const updateItemExactQuantity = async (userId, cartItemId, newQuantity) => {
    try {
        const cartItem = await Cart.findOne({ _id: cartItemId, userId });
        if (!cartItem) {
            return { success: false, reason: 'NOT_FOUND', message: 'Cart item not found.' };
        }

        const variant = await ProductVariant.findById(cartItem.productVariantId);
        if (!variant || variant.stock <= 0) {
            return { success: false, reason: 'OUT_OF_STOCK', message: 'Product variant is no longer in stock.' };
        }

        const desiredQty = parseInt(newQuantity, 10);

        if (desiredQty <= 0) {
            await Cart.deleteOne({ _id: cartItemId, userId });
            return { success: true, action: 'removed', currentQuantity: 0 };
        }

        const finalQuantity = Math.min(desiredQty, variant.stock, 5);
        cartItem.quantity = finalQuantity;
        await cartItem.save();

        return { success: true, action: 'updated', currentQuantity: cartItem.quantity };
    } catch (error) {
        throw new Error(`Failed to adjust cart item quantity: ${error.message}`);
    }
};

export const updateCartQuantity = async (userId, cartItemId, actionType, targetQuantity = null) => {
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
            return { success: false, reason: 'PRODUCT_REMOVED', message: 'Product has been removed.' };
        }

        if (variant.productId.categoryId && variant.productId.categoryId.isDeleted === true) {
            return { success: false, reason: 'PRODUCT_REMOVED', message: 'Product has been removed.' };
        }

        if (variant.stock <= 0) {
            return { success: false, reason: 'OUT_OF_STOCK', message: 'Product is out of stock.' };
        }

        if (actionType === 'set') {
            const desiredQty = parseInt(targetQuantity, 10);
            if (isNaN(desiredQty) || desiredQty <= 0) {
                await Cart.deleteOne({ _id: cartItemId, userId });
                return { success: true, action: 'removed', currentQuantity: 0 };
            }
            cartItem.quantity = Math.min(desiredQty, variant.stock, 5);
            await cartItem.save();
            return { success: true, action: 'updated', currentQuantity: cartItem.quantity };
        }

        if (actionType === 'increase') {
            if (cartItem.quantity >= 5) {
                return {
                    success: false,
                    reason: 'MAX_LIMIT',
                    message: 'Maximum quantity limit is 5 items per product.'
                };
            }

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
        const isDeleted = deletionResult.deletedCount > 0;

        const cartCountAggregation = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalCount: { $sum: '$quantity' } } }
        ]);

        const totalCartCount = cartCountAggregation.length > 0 ? cartCountAggregation[0].totalCount : 0;

        return {
            isDeleted,
            totalCartCount
        };
    } catch (error) {
        throw new Error(`Database error while completely deleting cart entry: ${error.message}`);
    }
};