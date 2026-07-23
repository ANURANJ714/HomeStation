import Product from "../../models/Products.js";
import ProductVariant from "../../models/ProductVariant.js";
import Category from "../../models/Category.js";
import logger from '../../utils/logger.js';
import * as productService from "../../services/admin/productService.js";
import mongoose from "mongoose";

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

        if (!req.files || req.files.length === 0) {
            logger.warn(`Product creation blocked: Missing images. Attempted by: ${adminEmail}`);
            return res.status(400).json({
                success: false,
                message: "At least one product image is required.",
            });
        }

        const imageUrls = req.files.map((file) => file.path);

        const savedProduct = await productService.createProductWithVariants(req.body, req.body.variants, imageUrls);

        logger.info(`Product "${savedProduct.name}" (ID: ${savedProduct.productId}) created successfully by ${adminEmail}.`);

        return res.status(201).json({
            success: true,
            message: "Product and variants created successfully!",
        });

    } catch (error) {
        if (error.statusCode === 400) {
            logger.warn(`Product processing error: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        if (error.code === 11000) {
            logger.warn(`Product variant duplicate error: ${error.message}`);
            return res.status(400).json({
                success: false,
                message: "A variant with this name already exists for this product.",
            });
        }

        let errorMessage = "An internal server error occurred while saving the product.";
        if (error.name === "ValidationError") {
            errorMessage = Object.values(error.errors)
                .map((val) => val.message)
                .join(", ");
                
            logger.warn(`Product schema validation failed: ${errorMessage}`);
            
            return res.status(400).json({
                success: false,
                message: errorMessage,
            });
        } 
        
        if (error.message) {
            errorMessage = error.message;
        }

        logger.error(`Error adding product: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
};

export const viewProduct = async (req, res) => {
  try {
    const { product_id } = req.params;
    const adminEmail = req.user ? req.user.email : 'Unknown Admin';

    const result = await productService.getProductDetailsForView(product_id);

    if (!result) {
      logger.warn(`Product view blocked: ID ${product_id} not found or deleted. Attempted by: ${adminEmail}`);
      return res.status(404).json({ 
        success: false, 
        message: "Product not found." 
      });
    }

    logger.info(`Admin (${adminEmail}) viewed details for product "${result.productData.name}" (ID: ${product_id})`);

    res.render("admin/viewproduct", {
      product: result.productData,
      totalStock: result.totalStock,
      priceDisplay: result.priceDisplay,
    });
    
  } catch (error) {
    logger.error(`Error viewing product ID ${req.params.product_id}: ${error.message}\nStack: ${error.stack}`);
    
    res.status(500).json({ 
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

        const result = await productService.getProductDetailsForEdit(product_id);

        if (result.isNotFound) {
            logger.warn(`Edit product page access blocked: Product ID ${product_id} not found. Attempted by: ${adminEmail}`);
            return res.status(404).json({ 
                success: false, 
                message: "Product not found!" 
            });
        }

        logger.info(`Admin (${adminEmail}) accessed the Edit page for product "${result.product.name}" (ID: ${product_id}).`);

        res.render("admin/editproduct", {
            product: result.product,
            categories: result.categories,
            variants: result.variants,
        });

    } catch (error) {
        logger.error(`Error loading edit product page (ID: ${req.params.product_id}): ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
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

        const newFiles = (req.files && req.files.length > 0) ? req.files : [];

        const result = await productService.updateExistingProduct(product_id, req.body, newFiles, req.body.variants);

        if (!result.isUpdated) {
            if (result.isNotFound) {
                logger.warn(`Product update blocked: ID ${product_id} not found. Attempted by: ${adminEmail}`);
                return res.status(404).json({ success: false, message: "Product not found" });
            }
        }

        logger.info(`Product "${result.product.name}" (ID: ${product_id}) successfully updated by ${adminEmail}.`);

        return res.json({
            success: true,
            message: "Product updated successfully!",
        });

    } catch (error) {
        let errorMessage = "An error occurred while updating the product.";

        if (error.name === "ValidationError") {
            errorMessage = Object.values(error.errors)
                .map((val) => val.message)
                .join(", ");
                
            logger.warn(`Product update validation failed (ID: ${req.params.product_id}): ${errorMessage}`);
            
            return res.status(400).json({
                success: false,
                message: errorMessage,
            });
        }

        logger.error(`Error updating product ID ${req.params.product_id}: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
};

export const softDeleteProduct = async (req, res) => {
  try {
    const idFromFrontend = req.params.product_id.trim();

    if (
      idFromFrontend === "null" ||
      idFromFrontend === "undefined" ||
      !idFromFrontend
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID sent to server." });
    }

    const query = {
      $or: [{ productId: idFromFrontend }],
    };

    if (mongoose.isValidObjectId(idFromFrontend)) {
      query.$or.push({ _id: idFromFrontend });
    }

    const product = await Product.findOne(query);

    if (!product) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Product not found in the database.",
        });
    }

    product.isDeleted = true;
    await product.save();

    return res.json({
      success: true,
      message: "Product successfully moved to Recycle Bin.",
    });
  } catch (error) {
    console.error("Error soft deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the product.",
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

