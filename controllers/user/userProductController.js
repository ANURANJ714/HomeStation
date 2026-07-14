import * as productService from '../../services/user/userProductService.js';
import * as wishlistService from '../../services/user/wishlistService.js';
import Category from '../../models/Category.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import logger from '../../utils/logger.js';

export const loadProductsCatalogPage = async (req, res) => {
    try {
        const user = req.user || null;
        
        const currentCategory = req.query.category ? String(req.query.category).trim() : 'all';
        const currentSort = req.query.sort ? String(req.query.sort).trim() : 'all';
        const searchQuery = req.query.q ? String(req.query.q).trim() : '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 6;

        let selectedBrandsArray = [];
        if (req.query.brands) {
            selectedBrandsArray = String(req.query.brands).split(',').map(b => decodeURIComponent(b.trim()));
        }

        let pageHeading = "All Mattresses";
        if (currentCategory !== 'all') {
            const activeCategoryDoc = await Category.findOne({ _id: currentCategory, isDeleted: false });
            if (activeCategoryDoc) pageHeading = activeCategoryDoc.name;
        }

        const [categories, uniqueBrands, catalogResult, bannerText, userWishlist] = await Promise.all([
            Category.find({ isDeleted: false }).lean(),
            productService.getUniqueActiveBrands(),
            productService.getFilteredProductsCatalog({
                category: currentCategory,
                brands: selectedBrandsArray,
                sort: currentSort,
                searchQuery,
                page,
                limit
            }),
            getActivePromoBanner(),
            wishlistService.getUserWishlistArray(user ? user._id : null)
        ]);

        logger.info(`Catalog rendered safely for context: [Category: ${currentCategory}] by User: ${user ? user.email : 'Guest'}`);

        return res.render('user/categories', {
            user,
            categories,
            brands: uniqueBrands,
            products: catalogResult.products,
            currentPage: page,
            totalPages: catalogResult.totalPages,
            totalItems: catalogResult.totalItems,
            pageHeading,
            currentCategory,
            currentSort,
            currentBrands: selectedBrandsArray,
            searchQuery,
            bannerText,
            userWishlist,
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        logger.error(`Critical Product Catalog Controller Failure: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "An unexpected error occurred while generating the mattress catalog items." });
    }
};