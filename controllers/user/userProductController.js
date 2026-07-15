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

        const [metaData, uniqueBrands, catalogResult, bannerText, userWishlist] = await Promise.all([
            productService.getCatalogPageMetadata(currentCategory),
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
            categories: metaData.categories,
            brands: uniqueBrands,
            products: catalogResult.products,
            currentPage: page,
            totalPages: catalogResult.totalPages,
            totalItems: catalogResult.totalItems,
            pageHeading: metaData.pageHeading,
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
        
        return res.status(500).json({ 
            success: false, 
            message: "An unexpected error occurred while generating the mattress catalog items." 
        });
    }
};

export const loadProductDetailViewPage = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || null;

        if (!id) {
            return res.status(400).json({ success: false, message: "Target resource context ID reference is missing." });
        }

        const [catalogContext, bannerText, userWishlist] = await Promise.all([
            productService.getValidatedProductDetails(id),
            getActivePromoBanner(),
            wishlistService.getUserWishlistArray(user ? user._id : null)
        ]);

        logger.info(`Product detailed profile views rendered accurately for ID: ${id} by Session User: ${user ? user.email : 'Guest'}`);

        return res.render('user/productdetails', {
            user,
            product: catalogContext.product,
            variants: catalogContext.variants,
            related: catalogContext.relatedProducts,
            bannerText,
            userWishlist,
            csrfToken: req.csrfToken(),
            errorAlert: null
        });

    } catch (error) {
        if (error.reason === 'UNAVAILABLE' || error.reason === 'OUT_OF_STOCK') {
            logger.warn(`Product profile delivery rejected on constraint checkpoints: ${error.message}`);
            
            return res.render('user/productdetails', {
                user: req.user || null,
                product: null,
                variants: [],
                related: [],
                bannerText: null,
                userWishlist: [],
                csrfToken: req.csrfToken(),
                errorAlert: {
                    type: 'warning',
                    title: 'Resource Unavailable',
                    message: error.message
                }
            });
        }

        logger.error(`Critical parsing breakdown inside Product profile mapping subroutine: ${error.message}`);
        return res.status(500).json({ success: false, message: "An unexpected internal server error occurred." });
    }
};

export const executeCatalogSearchPage = async (req, res) => {
    try {
        const user = req.user || null;
        
        const searchQuery = req.query.q ? String(req.query.q).trim() : '';
        const currentSort = req.query.sort ? String(req.query.sort).trim() : 'all';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 8;

        const [searchResults, bannerText, userWishlist] = await Promise.all([
            productService.searchActiveProductsCatalog({
                query: searchQuery,
                sort: currentSort,
                page,
                limit
            }),
            getActivePromoBanner(),
            wishlistService.getUserWishlistArray(user ? user._id : null)
        ]);

        logger.info(`User [${user ? user.email : 'Guest'}] queried active tokens: "${searchQuery}" - Returned ${searchResults.totalItems} entries.`);

        return res.render('user/searchresult', {
            user,
            products: searchResults.products,
            totalItems: searchResults.totalItems,
            totalPages: searchResults.totalPages,
            currentPage: page,
            searchQuery,
            currentSort,
            bannerText,
            userWishlist,
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        logger.error(`Critical parsing exception caught in executeCatalogSearchPage: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "An explicit exception failure occurred handling search profiles." });
    }
};