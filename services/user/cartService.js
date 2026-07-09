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