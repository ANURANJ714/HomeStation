import express from 'express';
import { loadProducts, getAddProductPage, addProduct, viewProduct,
         getEditProductPage, updateProduct, softDeleteProduct, loadDeletedProducts, restoreProduct } from '../../controllers/admin/adminProductController.js';
import { uploadProduct } from '../../config/cloudinary.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.get('/products', verifyAdmin, loadProducts);
router.get('/products/add', verifyAdmin, getAddProductPage);
router.get('/products/deleted', verifyAdmin, loadDeletedProducts);

router.post('/products', verifyAdmin, uploadProduct.array('images', 3), addProduct);
router.get('/products/:product_id', verifyAdmin, viewProduct);
router.get('/products/:product_id/edit', verifyAdmin, getEditProductPage);
router.patch('/products/:product_id', verifyAdmin, uploadProduct.array('images', 3), updateProduct);
router.delete('/products/:product_id', verifyAdmin, softDeleteProduct);
router.patch('/products/:product_id/restore', verifyAdmin, restoreProduct);

export default router;