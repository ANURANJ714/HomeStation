import express from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.js';
import { noCache } from '../../middlewares/cache.js';
import { loadCartPage } from '../../controllers/user/cartController.js';

const router = express.Router();

router.use(ensureAuthenticated);
router.use(noCache);


router.get('/cart', loadCartPage);

export default router;