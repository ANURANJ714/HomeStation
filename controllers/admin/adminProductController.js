import logger from '../../utils/logger.js';
import * as productService from "../../services/admin/productService.js";
import { notFoundMiddleware } from '../../middlewares/notFoundMiddleware.js';

export const loadProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const searchQuery = req.query.search ? req.query.search.trim() : "";
        const statusFilter = req.query.status || "all";
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        const result = await productService.getAdminProductsPageData(page, limit, searchQuery, statusFilter);

        logger.info(`Admin (${adminEmail}) viewed products (Page: ${result.safePage}, Filter: "${statusFilter}", Search: "${searchQuery}")`);

        res.render('admin/products', { 
            products: result.products,
            categories: result.categories, 
            currentPage: result.safePage,
            totalPages: result.totalPages,
            totalProducts: result.totalProducts,
            searchQuery,
            statusFilter,
            limit
        });

    } catch (error) {
        logger.error(`Error loading products page: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false, 
            title: "Server Error", 
            message: "Internal Server Error Occurred!"
        });
    }
};

export const getAddProductPage = async (req, res) => {
    try {
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        const categories = await productService.getActiveCategoriesForDropdown();

        logger.info(`Admin (${adminEmail}) accessed the Add Product page.`);

        res.render("admin/addproduct", { categories });

    } catch (error) {
        logger.error(`Error loading Add Product page: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false, 
            title: "Server Error", 
            message: "Internal Server Error Occurred!"
        });
    }
};

export const addProduct = async (req, res) => {
    try {
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        const clientIp = req.ip;

        if (!req.files || req.files.length === 0) {
            logger.warn(`Product creation blocked: Missing images by (${adminEmail}) | IP: ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: "All 3 product images are required."
            });
        }

        const imageUrls = req.files.map((file) => file.path);

        const savedProduct = await productService.createProductWithVariants(req.body, req.body.variants, imageUrls);

        logger.info(`Product "${savedProduct.name}" (ID: ${savedProduct.productId}) created successfully by ${adminEmail} | IP: ${clientIp}`);

        return res.status(201).json({
            success: true,
            message: "Product and variants created successfully!"
        });

    } catch (error) {
        if (error.statusCode === 400) {
            logger.warn(`Product validation failed: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === 11000) {
            logger.warn(`Product duplicate key error: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: "A product or variant with this identifier already exists."
            });
        }

        let errorMessage = "An internal server error occurred while saving the product.";
        if (error.name === "ValidationError") {
            errorMessage = Object.values(error.errors)
                .map((val) => val.message)
                .join(", ");

            logger.warn(`Product Mongoose schema validation failed: ${errorMessage}`);

            return res.status(400).json({
                success: false,
                message: errorMessage
            });
        }

        logger.error(`Error adding product: ${error.message}\nStack: ${error.stack}`);

        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
};

export const viewProduct = async (req, res) => {
  try {
    const { product_id } = req.params;
    const adminEmail = req.user ? req.user.email : 'Unknown Admin';

    if (!product_id || !product_id.trim()) {
      logger.warn(`Admin product view 404: Missing product_id parameter | Attempted by: ${adminEmail}`);
      return notFoundMiddleware(req, res);
    }

    const result = await productService.getProductDetailsForView(product_id.trim());

    if (!result || !result.productData) {
      logger.warn(`Admin product view 404: Product ID "${product_id}" not found or deleted | Attempted by: ${adminEmail}`);
      return notFoundMiddleware(req, res);
    }

    logger.info(`Admin (${adminEmail}) viewed details for product "${result.productData.name}" (ID: ${product_id})`);

    return res.render("admin/viewproduct", {
      product: result.productData,
      totalStock: result.totalStock,
      priceDisplay: result.priceDisplay,
    });
    
  } catch (error) {
    if (
      error.name === 'CastError' || 
      error.name === 'BSONError' || 
      error.message.includes('24 character hex string')
    ) {
      logger.warn(`Admin product view 404: Malformed ID cast error for ID "${req.params.product_id}" | Error: ${error.message}`);
      return notFoundMiddleware(req, res);
    }

    logger.error(`Error viewing product ID ${req.params.product_id}: ${error.message}\nStack: ${error.stack}`);
    
    return res.status(500).json({ 
      success: false, 
      title: "Server Error", 
      message: "An internal server error occurred." 
    });
  }
};

export const getEditProductPage = async (req, res) => {
    try {
        const { product_id } = req.params;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        if (!product_id || !product_id.trim()) {
            logger.warn(`Admin edit product 404: Missing product_id parameter | Attempted by: ${adminEmail}`);
            return notFoundMiddleware(req, res);
        }

        const result = await productService.getProductDetailsForEdit(product_id.trim());

        if (!result || result.isNotFound || !result.product) {
            logger.warn(`Admin edit product 404: Product ID "${product_id}" not found. Attempted by: ${adminEmail}`);
            return notFoundMiddleware(req, res);
        }

        logger.info(`Admin (${adminEmail}) accessed the Edit page for product "${result.product.name}" (ID: ${product_id}).`);

        return res.render("admin/editproduct", {
            product: result.product,
            categories: result.categories,
            variants: result.variants,
        });

    } catch (error) {
        if (
            error.name === 'CastError' || 
            error.name === 'BSONError' || 
            error.message.includes('24 character hex string')
        ) {
            logger.warn(`Admin edit product 404: Malformed ID cast error for ID "${req.params.product_id}" | Error: ${error.message}`);
            return notFoundMiddleware(req, res);
        }

        logger.error(`Error loading edit product page (ID: ${req.params.product_id}): ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false, 
            title: "Server Error", 
            message: "An internal server error occurred while loading the page."
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { product_id } = req.params;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        const clientIp = req.ip;

        const newFiles = (req.files && req.files.length > 0) ? req.files : [];

        const result = await productService.updateExistingProduct(product_id, req.body, newFiles, req.body.variants);

        if (!result.isUpdated) {
            if (result.isNotFound) {
                logger.warn(`Product update blocked: ID ${product_id} not found. Attempted by: ${adminEmail} | IP: ${clientIp}`);
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }
        }

        logger.info(`Product "${result.product.name}" (ID: ${product_id}) successfully updated by ${adminEmail} | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: "Product updated successfully!"
        });

    } catch (error) {
        if (error.statusCode === 400) {
            logger.warn(`Product update validation failed (ID: ${req.params.product_id}): ${error.message}`);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === 11000) {
            logger.warn(`Product variant duplicate key error (ID: ${req.params.product_id}): ${error.message}`);
            return res.status(400).json({
                success: false,
                message: "A variant with this name already exists for this product."
            });
        }

        let errorMessage = "An error occurred while updating the product.";
        if (error.name === "ValidationError") {
            errorMessage = Object.values(error.errors)
                .map((val) => val.message)
                .join(", ");

            logger.warn(`Product Mongoose schema validation failed (ID: ${req.params.product_id}): ${errorMessage}`);

            return res.status(400).json({
                success: false,
                message: errorMessage
            });
        }

        logger.error(`Error updating product ID ${req.params.product_id}: ${error.message}\nStack: ${error.stack}`);

        return res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
};

export const softDeleteProduct = async (req, res) => {
    try {
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        const idFromFrontend = req.params.product_id ? req.params.product_id.trim() : '';

        if (
            !idFromFrontend ||
            idFromFrontend === 'null' ||
            idFromFrontend === 'undefined'
        ) {
            logger.warn(`Soft delete rejected: Invalid ID parameter [${idFromFrontend}] by Admin (${adminEmail})`);
            return res.status(400).json({
                success: false,
                message: 'Invalid ID sent to server.'
            });
        }

        const result = await productService.softDeleteProductById(idFromFrontend);

        if (!result.isFound) {
            logger.warn(`Soft delete failed: Product not found for ID [${idFromFrontend}] by Admin (${adminEmail})`);
            return res.status(404).json({
                success: false,
                message: result.message
            });
        }

        logger.info(`Admin (${adminEmail}) soft deleted product "${result.productName}" (ID: ${idFromFrontend})`);

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        logger.error(`Error soft deleting product (ID: ${req.params.product_id}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the product.'
        });
    }
};

export const loadDeletedProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        const result = await productService.getDeletedProductsPageData(page, limit);

        logger.info(`Admin (${adminEmail}) viewed deleted products (Page: ${result.safePage})`);

        res.render("admin/deletedproducts", {
            products: result.products,
            currentPage: result.safePage,
            totalPages: result.totalPages,
            totalProducts: result.totalProducts,
            limit: limit,
        });

    } catch (error) {
        logger.error(`Error loading deleted products page: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An error occurred while loading the deleted products.", 
        });
    }
};

export const restoreProduct = async (req, res) => {
    try {
        const idFromFrontend = req.params.product_id ? req.params.product_id.trim() : "";
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        if (!idFromFrontend || idFromFrontend === "null" || idFromFrontend === "undefined") {
            logger.warn(`Product restore blocked: Invalid ID string received. User: ${adminEmail}`);
            return res.status(400).json({ success: false, message: "Invalid product ID." });
        }

        const result = await productService.restoreSoftDeletedProduct(idFromFrontend);

        if (!result.isRestored) {
            if (result.reason === "invalid_id") {
                logger.warn(`Product restore blocked: Invalid ObjectId format (${idFromFrontend}). User: ${adminEmail}`);
                return res.status(400).json({ success: false, message: result.message });
            }
            if (result.reason === "not_found") {
                logger.warn(`Product restore failed: ID ${idFromFrontend} not found. User: ${adminEmail}`);
                return res.status(404).json({ success: false, message: result.message });
            }
            if (result.reason === "category_deleted") {
                logger.warn(`Product restore blocked: Parent category is deleted (Product ID: ${idFromFrontend}). User: ${adminEmail}`);
                return res.status(400).json({
                    success: false,
                    title: "Restoring Failed!",
                    message: result.message,
                });
            }
        }

        logger.info(`Product "${result.product.name}" (ID: ${idFromFrontend}) was successfully restored by ${adminEmail}.`);
        
        return res.json({
            success: true,
            message: "Product successfully restored.",
        });

    } catch (error) {
        logger.error(`Error restoring product ID ${req.params.product_id}: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            title: "System Error",
            message: "An error occurred while restoring the product.",
        });
    }
};

