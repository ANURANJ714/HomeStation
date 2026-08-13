import express from 'express';
import { getAddresses, addAddress, editAddress, deleteAddress } from '../../controllers/user/addressController.js';
import {ensureAuthenticated} from '../../middlewares/auth.js';
import {validateAddressData} from '../../middlewares/addressValidator.js';

const router = express.Router();

router.get('/', ensureAuthenticated, getAddresses);
router.post('/', validateAddressData, ensureAuthenticated, addAddress);
router.patch('/:address_id', ensureAuthenticated, validateAddressData, editAddress);
router.delete('/:address_id', ensureAuthenticated, deleteAddress);

export default router;