import express from 'express';
import { getAddresses, addAddress, editAddress, deleteAddress } from '../../controllers/user/addressController.js';
import {ensureAuthenticated} from '../../middlewares/auth.js';
import {validateAddressData} from '../../middlewares/addressValidator.js';

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/', getAddresses);
router.post('/', validateAddressData, addAddress);
router.patch('/:address_id', validateAddressData, editAddress);
router.delete('/:address_id', deleteAddress);

export default router;