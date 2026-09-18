import express from 'express';
import { verifyAdmin } from '../../middlewares/adminAuth.js';
import { loadOffersPage, createOffer, editOffer, toggleStatus } from '../../controllers/admin/adminOfferController.js';

const router = express.Router();

router.get('/', verifyAdmin, loadOffersPage);
router.post('/create', verifyAdmin, createOffer);
router.patch('/edit/:id', verifyAdmin, editOffer);
router.patch('/toggle-status/:id', verifyAdmin, toggleStatus);

export default router;