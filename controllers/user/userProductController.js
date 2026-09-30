import mongoose from "mongoose";
import * as productService from "../../services/user/userProductService.js";
import * as wishlistService from "../../services/user/wishlistService.js";
import * as reviewService from "../../services/user/reviewService.js";
import { getActivePromoBanner } from "../../services/user/bannerService.js";
import { getUserHeaderCounts } from "../../services/user/badgeService.js";
import { notFoundMiddleware } from "../../middlewares/notFoundMiddleware.js";
import logger from "../../utils/logger.js";

export const loadProductsCatalogPage = async (req, res) => {
  try {
    const user = req.user || null;
    const userId = user ? user._id : null;

    const serverAlert = req.session.serverAlert || null;
    if (req.session.serverAlert) {
      delete req.session.serverAlert;
    }

    let selectedCategoriesArray = [];
    if (req.query.categories) {
      selectedCategoriesArray = String(req.query.categories)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    } else if (req.query.category && req.query.category !== "all") {
      selectedCategoriesArray = [String(req.query.category).trim()];
    }

    for (const catId of selectedCategoriesArray) {
      if (!mongoose.Types.ObjectId.isValid(catId)) {
        logger.warn(
          `Catalog 404: Malformed Category ObjectId [${catId}] | IP: ${req.ip}`,
        );
        return notFoundMiddleware(req, res);
      }
    }

    const currentSort = req.query.sort ? String(req.query.sort).trim() : "all";
    const searchQuery = req.query.q ? String(req.query.q).trim() : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 6;

    let selectedBrandsArray = [];
    if (req.query.brands) {
      selectedBrandsArray = String(req.query.brands)
        .split(",")
        .map((b) => decodeURIComponent(b.trim()))
        .filter(Boolean);
    }

    const [
      metaData,
      uniqueBrands,
      catalogResult,
      bannerText,
      userWishlist,
      headerCounts,
    ] = await Promise.all([
      productService.getCatalogPageMetadata(selectedCategoriesArray),
      productService.getUniqueActiveBrands(),
      productService.getFilteredProductsCatalog({
        categories: selectedCategoriesArray,
        brands: selectedBrandsArray,
        sort: currentSort,
        searchQuery,
        page,
        limit,
      }),
      getActivePromoBanner(),
      wishlistService.getUserWishlistArray(userId),
      getUserHeaderCounts(userId),
    ]);

    if (metaData.categoryNotFound) {
      logger.warn(
        `Catalog 404: Requested category not found [${selectedCategoriesArray.join(", ")}] | IP: ${req.ip}`,
      );
      return notFoundMiddleware(req, res);
    }

    const catalogProductIds = (catalogResult.products || []).map((p) => p._id);
    const productRatingsMap =
      await reviewService.getMultipleProductReviewSummaries(catalogProductIds);

    logger.info(
      `Catalog rendered safely for categories [${selectedCategoriesArray.join(", ")}] by User: ${user ? user.email : "Guest"}`,
    );

    return res.render("user/categories", {
      user,
      categories: metaData.categories,
      brands: uniqueBrands,
      products: catalogResult.products,
      productRatingsMap,
      currentPage: page,
      totalPages: catalogResult.totalPages,
      totalItems: catalogResult.totalItems,
      pageHeading: metaData.pageHeading,
      currentCategories: selectedCategoriesArray,
      currentSort,
      currentBrands: selectedBrandsArray,
      searchQuery,
      bannerText,
      userWishlist,
      wishlistCount: headerCounts.wishlistCount,
      cartCount: headerCounts.cartCount,
      errorAlert: serverAlert,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
    });
  } catch (error) {
    if (
      error.name === "CastError" ||
      error.name === "BSONError" ||
      error.message.includes("24 character hex string")
    ) {
      logger.warn(
        `Catalog 404: Cast/BSON error on category query: ${error.message} | IP: ${req.ip}`,
      );
      return notFoundMiddleware(req, res);
    }

    logger.error(
      `Critical Product Catalog Controller Failure: ${error.message}\nStack: ${error.stack}`,
    );

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while generating the mattress catalog items.",
    });
  }
};

export const loadProductDetailViewPage = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user || null;
        const userId = user ? user._id : null;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            logger.warn(`Product detail 404: Invalid or malformed ObjectId provided [${id}] | IP: ${req.ip}`);
            return notFoundMiddleware(req, res);
        }

        const [catalogContext, bannerText, userWishlist, headerCounts, reviewData] = await Promise.all([
            productService.getValidatedProductDetails(id),
            getActivePromoBanner(),
            wishlistService.getUserWishlistArray(userId),
            getUserHeaderCounts(userId),
            reviewService.getProductReviewsPreview(id)
        ]);

        if (!catalogContext || !catalogContext.product) {
            logger.warn(`Product detail 404: Product ID not found in database [${id}] | IP: ${req.ip}`);
            return notFoundMiddleware(req, res);
        }

        const relatedProductIds = (catalogContext.relatedProducts || []).map(p => p._id);
        const relatedRatingsMap = await reviewService.getMultipleProductReviewSummaries(relatedProductIds);

        logger.info(`Product detail view loaded successfully for ID: ${id} | Category: ${catalogContext.category?.name} | Reviews: ${reviewData.totalReviewsCount} | Avg: ${reviewData.averageRating} | User: ${user ? user.email : 'Guest'}`);

        return res.render('user/productdetails', {
            user,
            product: catalogContext.product,
            category: catalogContext.category,
            variants: catalogContext.variants,
            related: catalogContext.relatedProducts,
            relatedRatingsMap,
            bannerText,
            userWishlist,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            reviews: reviewData.reviews,
            totalReviewsCount: reviewData.totalReviewsCount,
            averageRating: reviewData.averageRating,
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            errorAlert: null
        });

    } catch (error) {
        if (error.reason === 'UNAVAILABLE' || error.reason === 'OUT_OF_STOCK') {
            logger.warn(`Product detail unavailable for ID (${req.params.id}): ${error.message}`);
            
            if (req.session) {
                req.session.serverAlert = {
                    type: 'warning',
                    title: 'Product Unavailable',
                    message: error.message
                };
            }

            return res.redirect('/products');
        }

        if (error.name === 'CastError' || error.name === 'BSONError' || error.message.includes('24 character hex string')) {
            logger.warn(`Product detail 404: Cast/BSON parse error for ID (${req.params.id}) | IP: ${req.ip}`);
            return notFoundMiddleware(req, res);
        }

        logger.error(`Error loading Product details (ID: ${req.params.id}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "An unexpected internal server error occurred." });
    }
};

export const getValidatedProductDetails = async (productId) => {
  try {
    const currentDate = new Date();

    const activeOffers = await Offer.find({
      isDeleted: false,
      status: "active",
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    }).lean();

    const productOffersMap = {};
    const categoryOffersMap = {};

    activeOffers.forEach((offer) => {
      const targetIdStr = offer.targetId ? offer.targetId.toString() : null;
      if (!targetIdStr) return;

      if (offer.offerType === "product") {
        if (
          !productOffersMap[targetIdStr] ||
          offer.discount > productOffersMap[targetIdStr]
        ) {
          productOffersMap[targetIdStr] = offer.discount;
        }
      } else if (offer.offerType === "category") {
        if (
          !categoryOffersMap[targetIdStr] ||
          offer.discount > categoryOffersMap[targetIdStr]
        ) {
          categoryOffersMap[targetIdStr] = offer.discount;
        }
      }
    });

    const calculateBestDiscount = (
      variantDiscount = 0,
      targetProductId,
      targetCategoryId,
    ) => {
      const pIdStr = targetProductId ? targetProductId.toString() : "";
      const cIdStr = targetCategoryId ? targetCategoryId.toString() : "";

      const productOfferDiscount = productOffersMap[pIdStr] || 0;
      const categoryOfferDiscount = categoryOffersMap[cIdStr] || 0;
      const baseDiscount = Number(variantDiscount) || 0;

      return Math.max(
        baseDiscount,
        productOfferDiscount,
        categoryOfferDiscount,
      );
    };

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
    }).lean();
    if (!product) {
      const error = new Error("Requested product is no longer available.");
      error.reason = "UNAVAILABLE";
      throw error;
    }

    const category = await Category.findOne({
      _id: product.categoryId,
      isDeleted: false,
    }).lean();
    if (!category) {
      const error = new Error("Requested product is no longer available.");
      error.reason = "UNAVAILABLE";
      throw error;
    }

    const rawVariants = await ProductVariant.find({
      productId: product._id,
    }).lean();
    const activeInStockVariants = [];
    let runningTotalStockValue = 0;

    rawVariants.forEach((v) => {
      runningTotalStockValue += v.stock;
      if (v.stock > 0) {
        const effectiveDiscount = calculateBestDiscount(
          v.discount,
          product._id,
          product.categoryId,
        );

        const calculatedPrice = Math.round(
          v.originalPrice * (1 - effectiveDiscount / 100),
        );

        activeInStockVariants.push({
          ...v,
          effectiveDiscount,
          calculatedPrice,
        });
      }
    });

    if (runningTotalStockValue <= 0 || activeInStockVariants.length === 0) {
      const error = new Error("This product is currently out of stock.");
      error.reason = "OUT_OF_STOCK";
      throw error;
    }

    const analyticalMatches = await Product.aggregate([
      {
        $match: {
          _id: { $ne: product._id },
          categoryId: category._id,
          isDeleted: false,
        },
      },
      { $sample: { size: 4 } },
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          inStockVariants: {
            $filter: {
              input: "$variants",
              as: "v",
              cond: { $gt: ["$$v.stock", 0] },
            },
          },
        },
      },
      { $match: { $expr: { $gt: [{ $size: "$inStockVariants" }, 0] } } },
    ]);

    const processedSuggestionsDeck = analyticalMatches.map((p) => {
      const primaryOption = p.inStockVariants[0];
      const effectiveDiscount = calculateBestDiscount(
        primaryOption.discount,
        p._id,
        p.categoryId,
      );

      const calculatedPrice = Math.round(
        primaryOption.originalPrice * (1 - effectiveDiscount / 100),
      );

      return {
        ...p,
        displayVariant: {
          ...primaryOption,
          effectiveDiscount,
          calculatedPrice,
        },
      };
    });

    return {
      product,
      variants: activeInStockVariants,
      relatedProducts: processedSuggestionsDeck,
    };
  } catch (error) {
    if (error.reason) throw error;
    throw new Error(
      `Data mapping transaction failed on service resolution: ${error.message}`,
    );
  }
};

export const loadAllProductReviewsPage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null;
    const userId = user ? user._id : null;

    if (!id) {
      logger.warn(
        `Access to reviews page failed: Missing Product ID | IP: ${req.ip}`,
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Target product reference ID is missing.",
        });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const sortMode = req.query.sort
      ? String(req.query.sort).trim()
      : "relevant";
    const limit = 5;

    const [productContext, reviewData, bannerText, headerCounts] =
      await Promise.all([
        productService.getValidatedProductDetails(id),
        reviewService.getProductReviewsPaginated(id, page, limit, sortMode),
        getActivePromoBanner(),
        getUserHeaderCounts(userId),
      ]);

    logger.info(
      `Reviews page loaded for Product ID: ${id} | Page: ${page} | Sort: ${sortMode} | User: ${user ? user.email : "Guest"} | IP: ${req.ip}`,
    );

    return res.render("user/review", {
      user,
      product: productContext.product,
      category: productContext.category,
      reviews: reviewData.reviews,
      totalReviews: reviewData.totalReviews,
      totalPages: reviewData.totalPages,
      currentPage: reviewData.currentPage,
      averageRating: reviewData.averageRating,
      currentSort: sortMode,
      bannerText,
      wishlistCount: headerCounts.wishlistCount,
      cartCount: headerCounts.cartCount,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
    });
  } catch (error) {
    logger.error(
      `Error loading all reviews for Product ID ${req.params.id}: ${error.message}\nStack: ${error.stack}`,
    );
    return res.status(500).json({
      success: false,
      message:
        "An internal server error occurred while retrieving customer reviews.",
    });
  }
};

export const executeCatalogSearchPage = async (req, res) => {
  try {
    const user = req.user || null;
    const userId = user ? user._id : null;

    const searchQuery = req.query.q ? String(req.query.q).trim() : "";
    const currentSort = req.query.sort ? String(req.query.sort).trim() : "all";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 8;

    const [searchResults, bannerText, userWishlist, headerCounts] =
      await Promise.all([
        productService.searchActiveProductsCatalog({
          query: searchQuery,
          sort: currentSort,
          page,
          limit,
        }),
        getActivePromoBanner(),
        wishlistService.getUserWishlistArray(userId),
        getUserHeaderCounts(userId),
      ]);

    const productIds = (searchResults.products || [])
      .map((p) => p._id)
      .filter(Boolean);
    const productRatingsMap =
      await reviewService.getMultipleProductReviewSummaries(productIds);

    logger.info(
      `User [${user ? user.email : "Guest"}] queried active tokens: "${searchQuery}" - Returned ${searchResults.totalItems} entries.`,
    );

    return res.render("user/searchresult", {
      user,
      products: searchResults.products,
      totalItems: searchResults.totalItems,
      totalPages: searchResults.totalPages,
      currentPage: page,
      searchQuery,
      currentSort,
      productRatingsMap,
      bannerText,
      userWishlist,
      wishlistCount: headerCounts.wishlistCount,
      cartCount: headerCounts.cartCount,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
    });
  } catch (error) {
    logger.error(
      `Critical parsing exception caught in executeCatalogSearchPage: ${error.message}\nStack: ${error.stack}`,
    );
    return res.status(500).json({
      success: false,
      message:
        "An explicit exception failure occurred handling search profiles.",
    });
  }
};

export const loadTopDealsPage = async (req, res) => {
  try {
    const user = req.user || null;
    const userId = user ? user._id : null;
    const priceSort = req.query.priceSort
      ? String(req.query.priceSort).trim()
      : "all";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 8;

    const [dealsData, bannerText, userWishlist, headerCounts] =
      await Promise.all([
        productService.getTopDealsCatalog({ priceSort, page, limit }),
        getActivePromoBanner(),
        wishlistService.getUserWishlistArray(userId),
        getUserHeaderCounts(userId),
      ]);

    const productIds = (dealsData.variants || [])
      .map((v) => v.productId?._id || v.productId)
      .filter(Boolean);

    const productRatingsMap =
      await reviewService.getMultipleProductReviewSummaries(productIds);

    logger.info(
      `Top Deals view aggregated for [${user ? user.email : "Guest"}] - Applied Price Sort Filter: [${priceSort}]`,
    );

    return res.render("user/topdeals", {
      user,
      variants: dealsData.variants,
      totalItems: dealsData.totalItems,
      totalPages: dealsData.totalPages,
      currentPage: dealsData.currentPage,
      currentPriceSort: priceSort,
      productRatingsMap,
      bannerText,
      userWishlist,
      wishlistCount: headerCounts.wishlistCount,
      cartCount: headerCounts.cartCount,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    logger.error(
      `Critical error caught inside loadTopDealsPage controller template pipeline: ${error.message}\nStack: ${error.stack}`,
    );
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred compiling top discount records.",
      });
  }
};

export const loadBestsellersPage = async (req, res) => {
  try {
    const user = req.user || null;
    const userId = user ? user._id : null;
    const priceSort = req.query.priceSort
      ? String(req.query.priceSort).trim()
      : "all";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 8;

    const [catalogData, bannerText, userWishlist, headerCounts] =
      await Promise.all([
        productService.getBestsellersCatalog({ priceSort, page, limit }),
        getActivePromoBanner(),
        wishlistService.getUserWishlistArray(userId),
        getUserHeaderCounts(userId),
      ]);

    const productIds = (catalogData.variants || [])
      .map((v) => v.productId?._id || v.productId)
      .filter(Boolean);

    const productRatingsMap =
      await reviewService.getMultipleProductReviewSummaries(productIds);

    logger.info(
      `Bestsellers catalog rendered for [${user ? user.email : "Guest"}] - Applied Price Sort: [${priceSort}]`,
    );

    return res.render("user/bestseller", {
      user,
      variants: catalogData.variants,
      totalItems: catalogData.totalItems,
      totalPages: catalogData.totalPages,
      currentPage: catalogData.currentPage,
      currentPriceSort: priceSort,
      productRatingsMap,
      bannerText,
      userWishlist,
      wishlistCount: headerCounts.wishlistCount,
      cartCount: headerCounts.cartCount,
      csrfToken: req.csrfToken ? req.csrfToken() : "",
    });
  } catch (error) {
    logger.error(
      `Critical error inside loadBestsellersPage controller: ${error.message}\nStack: ${error.stack}`,
    );
    return res.status(500).json({
      success: false,
      message:
        "An unexpected layout processing error occurred loading best sellers.",
    });
  }
};
