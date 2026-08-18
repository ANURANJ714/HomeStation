import express from 'express';
import { ensureCheckoutOrigin } from '../../middlewares/checkoutAuth.js';
import { loadCheckoutAddress, postCheckoutAddress } from '../../controllers/user/checkoutController.js';

const router = express.Router();

router.get('/checkout/address', ensureCheckoutOrigin, loadCheckoutAddress);
router.post('/checkout/selectaddress', ensureCheckoutOrigin, postCheckoutAddress);

export default router;