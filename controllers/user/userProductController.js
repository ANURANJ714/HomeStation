import * as userService from '../../services/user/userProductService.js';

export const loadCategoryPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6; 
        const safeSkip = (page - 1) * limit;

        const searchQuery = req.query.search ? req.query.search.trim() : '';
        const categoryFilter = req.query.category || '';
        const maxPriceFilter = req.query.price ? parseFloat(req.query.price) : null;

        const [banner, categories, pageData] = await Promise.all([
            userService.getActiveBanner(),
            userService.getActiveCategories(),
            userService.getProductsPageData({ searchQuery, categoryFilter, maxPriceFilter, safeSkip, limit })
        ]);

        const totalPages = Math.max(1, Math.ceil(pageData.totalCount / limit));

        res.render('user/categories', {
            user: req.user || null, 
            bannerText: banner && banner.bannerText ? banner.bannerText.trim() : '',
            categories,
            products: pageData.products,
            totalProducts: pageData.totalCount,
            currentPage: Math.min(page, totalPages),
            totalPages,
            searchQuery,
            categoryFilter,
            maxPriceFilter,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        console.error("Critical routing breakdown in category initialization:", error);
        res.status(500).render('errors/500', { message: 'Server context temporary mismatch.' });
    }
};