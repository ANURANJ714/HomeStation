import * as pageService from '../../services/user/pageService.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import { toggleVariantInWishlist, getUserWishlistArray } from '../../services/user/wishlistService.js';
import logger from '../../utils/logger.js';

export const loadHomePage = async (req, res) => {
    try {
        const user = req.user || null;

        if (user && req.session.pendingWishlistVariantId) {
            await toggleVariantInWishlist(user._id, req.session.pendingWishlistVariantId);
            
            req.session.pendingWishlistVariantId = null;
            req.session.save(); 
        }

        const [homePageData, bannerText, userWishlist] = await Promise.all([
            pageService.getHomePageData(),
            getActivePromoBanner(),
            getUserWishlistArray(user ? user._id : null) 
        ]);

        const { categories, bestSellers, topDeals } = homePageData;

        res.render('user/home', { 
            user,
            categories,
            bestSellers,
            topDeals,
            bannerText,
            userWishlist
        });

    } catch (error) {
        logger.error(`Error loading Home Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        res.status(500).json({success: false, message: "Server error occured!"});
    }
};