import Cart from '../../models/Cart.js';

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

export const getCartItems = async (userId) => {
    try {
        const cartItems = await Cart.find({ userId })
            .populate({
                path: 'productVariantId',
                populate: {
                    path: 'productId',
                    model: 'Product'
                }
            })
            .exec();

        let subtotal = 0;
        let totalQuantity = 0;

        const validCartItems = cartItems.filter(item => 
            item.productVariantId && item.productVariantId.productId
        );

        validCartItems.forEach(item => {
            const variant = item.productVariantId;
            const currentPrice = Math.round(variant.originalPrice * (1 - (variant.discount || 0) / 100));
            
            subtotal += currentPrice * item.quantity;
            totalQuantity += item.quantity;
        });

        return { 
            cartItems: validCartItems, 
            subtotal, 
            totalQuantity 
        };

    } catch (error) {
        throw new Error(`Database error while fetching cart items: ${error.message}`);
    }
};