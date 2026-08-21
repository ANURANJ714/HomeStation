import express from 'express';
import { ensureCheckoutOrigin, ensureAddressSelected, ensurePaymentModeSelected } from '../../middlewares/checkoutAuth.js';
import { loadCheckoutAddress, postCheckoutAddress, loadSelectPaymentMode, postCheckoutPaymentMode, loadOrderReview } from '../../controllers/user/checkoutController.js';
import { addAddress, editAddress, deleteAddress } from '../../controllers/user/addressController.js';

const router = express.Router();

router.get('/address', ensureCheckoutOrigin, loadCheckoutAddress);
router.post('/address/select', ensureCheckoutOrigin, postCheckoutAddress);

router.post('/address/add', ensureCheckoutOrigin, addAddress);
router.patch('/address/edit/:address_id', ensureCheckoutOrigin, editAddress);
router.delete('/address/delete/:address_id', ensureCheckoutOrigin, deleteAddress);

router.get('/payment', ensureAddressSelected, loadSelectPaymentMode);
router.post('/payment/select', ensureAddressSelected, postCheckoutPaymentMode);

router.get('/review', ensurePaymentModeSelected, loadOrderReview);

export default router;