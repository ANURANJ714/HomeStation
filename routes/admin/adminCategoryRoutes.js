import express from 'express';
import { loadCategories, addCategory, deleteCategory, restoreCategory,
         editCategory, viewCategoryProducts } from '../../controllers/admin/adminCategoryController.js';
import { uploadCategory } from '../../config/cloudinary.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.get('/categories',verifyAdmin, loadCategories);
router.post('/categories', verifyAdmin, uploadCategory.single('image'), addCategory);

router.delete('/categories/:category_id', verifyAdmin, deleteCategory);
router.patch('/categories/:category_id/restore',verifyAdmin,  restoreCategory);

router.patch('/categories/:category_id', verifyAdmin, uploadCategory.single('image'), editCategory);
router.get('/categories/:category_id/products', verifyAdmin, viewCategoryProducts);

export default router;