import express from 'express';
import { loadEnquiriesDashboard, addNewEnquirySubject, removeEnquirySubject } from '../../controllers/admin/enquiryController.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdmin);

router.get('/enquiries', loadEnquiriesDashboard);
router.post('/enquiries/subjects', addNewEnquirySubject);
router.delete('/enquiries/subjects/:id', removeEnquirySubject);

export default router;

