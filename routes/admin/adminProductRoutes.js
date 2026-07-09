import express from 'express';
import { loadProducts, getAddProductPage, addProduct, viewProduct,
         getEditProductPage, updateProduct, softDeleteProduct, loadDeletedProducts, restoreProduct } from '../../controllers/admin/adminProductController.js';
import { uploadProduct } from '../../config/cloudinary.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdmin);

router.get('/products', loadProducts);
router.get('/products/add', getAddProductPage);
router.get('/products/deleted', loadDeletedProducts);

router.post('/products', uploadProduct.array('images', 3), addProduct);
router.get('/products/:product_id', viewProduct);
router.get('/products/:product_id/edit', getEditProductPage);
router.patch('/products/:product_id', uploadProduct.array('images', 3), updateProduct);
router.delete('/products/:product_id', softDeleteProduct);
router.patch('/products/:product_id/restore', restoreProduct);

export default router;