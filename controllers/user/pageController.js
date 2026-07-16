import * as pageService from '../../services/user/pageService.js';
import {getActivePromoBanner} from '../../services/user/bannerService.js';
import { toggleVariantInWishlist, getUserWishlistArray } from '../../services/user/wishlistService.js';
import { addVariantToCart } from '../../services/user/cartService.js';
import logger from '../../utils/logger.js';

export const loadHomePage = async (req, res) => {
    try {
        const user = req.user || null;
        let wishlistAddedFlag = false;
        let cartAddedFlag = false;

        if (user && req.session.pendingWishlistVariantId) {
            await toggleVariantInWishlist(user._id, req.session.pendingWishlistVariantId);
            req.session.pendingWishlistVariantId = null;
            wishlistAddedFlag = true;
            req.session.save(); 
        }

        if (user && req.session.pendingCartVariantId) {
            const savedQty = req.session.pendingCartQuantity || 1;
            await cartService.handleAddToCartIntent(user._id, req.session.pendingCartVariantId, savedQty);
            
            req.session.pendingCartVariantId = null;
            req.session.pendingCartQuantity = null; 
            cartAddedFlag = true;
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
            userWishlist,
            wishlistJustAdded: wishlistAddedFlag,
            cartJustAdded: cartAddedFlag
        });

    } catch (error) {
        logger.error(`Error loading Home Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        res.status(500).json({success: false, message: "Server error occurred!"});
    }
};

export const loadContactPage = async (req, res) => {
    try {
        const user = req.user || null;
        const isAuthenticated = !!(req.user && req.isAuthenticated && req.isAuthenticated());

        const [subjectsList, bannerText] = await Promise.all([
            pageService.getFilteredContactSubjects(isAuthenticated),
            getActivePromoBanner()
        ]);

        logger.info(`Contact Us interface profile loaded. Context -> [Authenticated: ${isAuthenticated}]`);

        return res.render('user/contact', {
            user,
            subjects: subjectsList,
            isAuthenticated,
            bannerText, 
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        logger.error(`Critical parsing breakdown inside loadContactPage controller: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ 
            success: false, 
            message: "An unexpected processing error occurred loading the support catalog form." 
        });
    }
};