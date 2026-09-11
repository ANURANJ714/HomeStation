import * as pageService from '../../services/user/pageService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import { toggleVariantInWishlist, getUserWishlistArray } from '../../services/user/wishlistService.js';
import { getUserHeaderCounts } from '../../services/user/badgeService.js';
import * as cartService from '../../services/user/cartService.js';
import * as reviewService from '../../services/user/reviewService.js';
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

        const userId = user ? user._id : null;

        const [homePageData, bannerText, userWishlist, headerCounts] = await Promise.all([
            pageService.getHomePageData(),
            getActivePromoBanner(),
            getUserWishlistArray(userId),
            getUserHeaderCounts(userId)
        ]);

        const { categories, bestSellers, topDeals } = homePageData;

        const productIds = [
            ...(bestSellers || []).map(p => p._id),
            ...(topDeals || []).map(d => d.product?._id).filter(Boolean)
        ];

        const productRatingsMap = await reviewService.getMultipleProductReviewSummaries(productIds);

        return res.render('user/home', { 
            user,
            categories,
            bestSellers,
            topDeals,
            productRatingsMap,
            bannerText,
            userWishlist,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            wishlistJustAdded: wishlistAddedFlag,
            cartJustAdded: cartAddedFlag,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading Home Page (IP: ${req.ip}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Server error occurred!" });
    }
};


export const loadContactPage = async (req, res) => {
    try {
        const user = req.user || null;
        const userId = user ? user._id : null;
        const isAuthenticated = !!(req.user && req.isAuthenticated && req.isAuthenticated());

        const [subjectsList, bannerText, headerCounts] = await Promise.all([
            pageService.getFilteredContactSubjects(isAuthenticated),
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        logger.info(`Contact Us interface profile loaded. Context -> [Authenticated: ${isAuthenticated}]`);

        return res.render('user/contact', {
            user,
            subjects: subjectsList,
            isAuthenticated,
            bannerText, 
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
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

export const submitContactInquiryForm = async (req, res) => {
    try {
        const { name, email, subjectId, message } = req.body;

        const result = await pageService.createEnquiryTicket({
            name,
            email,
            subjectId,
            message
        });

        if (!result.success) {
            logger.warn(`User enquiry ticket submission rejected: ${result.message}`);
            return res.status(result.status || 200).json({ success: false, message: result.message });
        }

        logger.info(`Inquiry ticket created cleanly by [${email ? email.trim().toLowerCase() : 'Unknown'}] using subject ID -> ${subjectId}`);
        return res.status(200).json({ success: true, message: result.message });

    } catch (error) {
        logger.error(`Critical transaction failure tracked inside submitContactInquiryForm controller: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "An unexpected database mapping exception failure occurred." });
    }
};

export const loadPrivacyPolicyPage = async (req, res) => {
    try {
        const user = req.user || null;
        const userId = user ? user._id : null;

        const [bannerText, headerCounts] = await Promise.all([
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        logger.info(`Privacy policy document view rendered for user profile: [${user ? user.email : 'Guest visitor'}]`);

        return res.render('user/privacypolicy', {
            user,
            bannerText,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        logger.error(`Parsing failure caught inside loadPrivacyPolicyPage controller context: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ 
            success: false, 
            message: "An internal parsing error occurred loading legal policy documents." 
        });
    }
};