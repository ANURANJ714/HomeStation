import * as wishlistService from '../../services/user/wishlistService.js'; 
import {getActivePromoBanner} from '../../services/user/bannerService.js';
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

export const loadWishlistPage = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 6; 

        const [wishlistData, bannerText] = await Promise.all([
            wishlistService.getWishlistItemsPaginated(userId, page, limit),
            getActivePromoBanner()
        ]);

        return res.render('user/wishlist', {
            user: req.user,
            items: wishlistData.items,
            currentPage: wishlistData.currentPage,
            totalPages: wishlistData.totalPages,
            totalItems: wishlistData.totalItems,
            bannerText
        });

    } catch (error) {
        logger.error(`Error loading Wishlist Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Server error occurred while loading wishlist." });
    }
};

export const deleteWishlistItem = async (req, res) => {
    try {
        const { variantId } = req.body;
        const userId = req.user._id;

        if (!variantId) {
            return res.status(400).json({ success: false, message: "Variant ID is required." });
        }

        await wishlistService.removeVariantFromWishlist(userId, variantId);

        logger.info(`User (${req.user.email}) deleted variant ${variantId} from their wishlist page template.`);

        return res.status(200).json({
            success: true,
            message: "Item removed from your wishlist successfully."
        });

    } catch (error) {
        logger.error(`Wishlist Deletion Endpoint Failure (IP: ${req.ip}): ${error.message}`);
        return res.status(500).json({ success: false, message: "Failed to remove item from wishlist." });
    }
};