import * as wishlistService from '../../services/user/wishlistService.js'; 
import logger from '../../utils/logger.js';

export const toggleWishlistItem = async (req, res) => {
    try {
        const { variantId } = req.body;

        if (!variantId) {
            return res.status(400).json({ success: false, message: "Variant ID is required." });
        }

        if (!req.user || !req.isAuthenticated()) {
            req.session.pendingWishlistVariantId = variantId;
            req.session.save();

            return res.status(401).json({ 
                success: false, 
                message: "Please login to add to wishlist.",
                redirectUrl: '/user/login' 
            });
        }

        const userId = req.user._id;
        const result = await wishlistService.toggleVariantInWishlist(userId, variantId);

        return res.status(200).json({ 
            success: true, 
            action: result.action,
            message: result.action === 'added' ? "Item added to your wishlist!" : "Item removed from your wishlist." 
        });

    } catch (error) {
        logger.error(`Wishlist Toggle Error: ${error.message}`);
        return res.status(500).json({ success: false, message: "Server error occurred." });
    }
};