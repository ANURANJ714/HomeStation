import express from 'express';
import { ensureCheckoutOrigin } from '../../middlewares/checkoutAuth.js';
import { getAddresses } from '../../controllers/user/addressController.js'
import { loadCheckoutAddress, postCheckoutAddress } from '../../controllers/user/checkoutController.js';
import { addAddress, editAddress, deleteAddress } from '../../controllers/user/addressController.js';

const router = express.Router();

router.get('/address', ensureCheckoutOrigin, loadCheckoutAddress);
router.post('/address/select', ensureCheckoutOrigin, postCheckoutAddress);

router.post('/address/add', ensureCheckoutOrigin, addAddress);
router.patch('/address/edit/:address_id', ensureCheckoutOrigin, editAddress);
router.delete('/address/delete/:address_id', ensureCheckoutOrigin, deleteAddress);

export default router;