import express from 'express';
import { loadEnquiriesDashboard, addNewEnquirySubject, removeEnquirySubject, updateTicketStatus } from '../../controllers/admin/enquiryController.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.get('/enquiries', verifyAdmin, loadEnquiriesDashboard);
router.post('/enquiries/subjects', verifyAdmin, addNewEnquirySubject);
router.delete('/enquiries/subjects/:id', verifyAdmin, removeEnquirySubject);
router.patch('/enquiries/tickets/:id/status', verifyAdmin, updateTicketStatus);

export default router;