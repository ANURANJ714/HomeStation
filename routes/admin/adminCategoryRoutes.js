import express from 'express';
import { loadCategories, addCategory, deleteCategory, restoreCategory,
         editCategory, viewCategoryProducts } from '../../controllers/admin/adminCategoryController.js';
import { uploadCategory } from '../../config/cloudinary.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdmin);

router.get('/categories', loadCategories);
router.post('/categories', uploadCategory.single('image'), addCategory);

router.delete('/categories/:category_id', deleteCategory);
router.patch('/categories/:category_id/restore', restoreCategory);

router.patch('/categories/:category_id', uploadCategory.single('image'), editCategory);
router.get('/categories/:category_id/products', viewCategoryProducts);

export default router;