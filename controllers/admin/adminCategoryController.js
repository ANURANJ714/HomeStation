import * as categoryService from '../../services/admin/categoryService.js';
import { handleAdminNotFound } from '../admin/adminErrorController.js';
import logger from '../../utils/logger.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const loadCategories = async (req, res) => {
    try {
        const sortQuery = req.query.sort ? String(req.query.sort).trim() : 'newest';
        const searchQuery = req.query.q ? String(req.query.q).trim() : '';
        const page = Math.max(1, parseInt(req.query.page) || 1); 
        const limit = 6; 

        const { categories, totalPages } = await categoryService.getPaginatedCategories(sortQuery, page, limit, searchQuery);

        logger.info(`Admin (${req.user ? req.user.email : 'Unknown'}) loaded categories page ${page} with sort: "${sortQuery}" and filter: "${searchQuery}"`);

        return res.render('admin/categories', { 
            categories, 
            currentSort: sortQuery,
            searchQuery: searchQuery,
            currentPage: page,
            totalPages: totalPages,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading categories: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false, 
            title: "Server Error", 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        if (!name || name.trim() === '') {
            logger.warn(`Category creation blocked: Missing name. User: ${adminEmail}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Category name is required." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        if (!req.file) {
            logger.warn(`Category creation blocked: Missing image for "${name}". User: ${adminEmail}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Category image is required." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        const result = await categoryService.createCategory(name, req.file.path);

        if (!result.isCreated) {
            logger.warn(`Category creation blocked: Duplicate name "${name}". User: ${adminEmail}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: result.message || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        logger.info(`New category "${name}" successfully created by ${adminEmail}.`);
        return res.status(STATUS_CODES.CREATED).json({ 
            success: true, 
            message: "Category added successfully!" 
        });

    } catch (error) {
        logger.error(`Error adding category: ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.category_id;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        
        const category = await categoryService.softDeleteCategory(categoryId);

        if (!category) {
            logger.warn(`Category deletion failed: ID ${categoryId} not found. Attempted by: ${adminEmail}`);
            return res.status(STATUS_CODES.NOT_FOUND).json({ 
                success: false, 
                message: "Category not found." || COMMON_MESSAGES.NOT_FOUND 
            });
        }

        logger.info(`Category "${category.name}" (ID: ${categoryId}) was deleted by ${adminEmail}.`);

        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: `Category "${category.name}" and its products have been deleted.` 
        });

    } catch (error) {
        logger.error(`Error deleting category ID ${req.params.category_id}: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const restoreCategory = async (req, res) => {
    try {
        const categoryId = req.params.category_id;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        
        const category = await categoryService.restoreSoftDeletedCategory(categoryId);

        if (!category) {
            logger.warn(`Category restore failed: ID ${categoryId} not found. Attempted by: ${adminEmail}`);
            return res.status(STATUS_CODES.NOT_FOUND).json({ 
                success: false, 
                message: "Category not found." || COMMON_MESSAGES.NOT_FOUND 
            });
        }
        logger.info(`Category "${category.name}" (ID: ${categoryId}) was restored by ${adminEmail}.`);
        
        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: `Category "${category.name}" and its products have been restored.` 
        });

    } catch (error) {
        logger.error(`Error restoring category ID ${req.params.category_id}: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const editCategory = async (req, res) => {
    try {
        const categoryId = req.params.category_id;
        const { name } = req.body;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        if (!name || name.trim() === '') {
            logger.warn(`Category edit blocked: Missing name (ID: ${categoryId}). User: ${adminEmail}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: "Category name is required." || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        const imagePath = req.file ? req.file.path : null;

        const result = await categoryService.updateCategoryDetails(categoryId, name, imagePath);

        if (!result.isUpdated) {
            if (result.isNotFound) {
                logger.warn(`Category edit failed: ID ${categoryId} not found. User: ${adminEmail}`);
                return res.status(STATUS_CODES.NOT_FOUND).json({ 
                    success: false, 
                    message: result.message || COMMON_MESSAGES.NOT_FOUND 
                });
            }

            logger.warn(`Category edit blocked: Duplicate name "${name}" (ID: ${categoryId}). User: ${adminEmail}`);
            return res.status(STATUS_CODES.BAD_REQUEST).json({ 
                success: false, 
                message: result.message || COMMON_MESSAGES.BAD_REQUEST 
            });
        }

        logger.info(`Category "${name}" (ID: ${categoryId}) successfully updated by ${adminEmail}. Image updated: ${!!imagePath}`);
        
        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: "Category updated successfully!" 
        });

    } catch (error) {
        logger.error(`Error editing category ID ${req.params.category_id}: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};

export const viewCategoryProducts = async (req, res, next) => {
    try {
        const categoryId = req.params.category_id;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;
        const sortQuery = req.query.sort ? String(req.query.sort).trim() : 'newest';
        const searchQuery = req.query.search ? String(req.query.search).trim() : '';

        const result = await categoryService.getCategoryWithProducts(categoryId, { 
            page, 
            limit, 
            sortQuery, 
            searchQuery 
        });

        if (!result || result.isNotFound) {
            logger.warn(`View category products failed: Category ID ${categoryId} not found. Attempted by: ${adminEmail}`);
            return handleAdminNotFound(req, res);
        }

        logger.info(`Admin (${adminEmail}) viewed products for category "${result.category.name}" (Page: ${result.pagination.safePage}, Sort: ${sortQuery}, Search: "${searchQuery}")`);

        return res.render('admin/viewcategoryproducts', {
            categoryName: result.category.name, 
            categoryId: result.category._id, 
            products: result.products,
            currentPage: result.pagination.safePage,
            totalPages: result.pagination.totalPages,
            totalProducts: result.pagination.totalProducts,
            currentSort: sortQuery,
            searchQuery: searchQuery,
            limit: limit,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading category products (Category ID: ${req.params?.category_id}): ${error.message}\nStack: ${error.stack}`);
        next(error);
    }
};