import express from 'express';
import { loadEnquiriesDashboard, addNewEnquirySubject, removeEnquirySubject, updateTicketStatus } from '../../controllers/admin/enquiryController.js';
import { verifyAdmin } from '../../middlewares/adminAuth.js';

const router = express.Router();

router.use(verifyAdmin);

router.get('/enquiries', loadEnquiriesDashboard);
router.post('/enquiries/subjects', addNewEnquirySubject);
router.delete('/enquiries/subjects/:id', removeEnquirySubject);
router.patch('/enquiries/tickets/:id/status', updateTicketStatus);

export default router;

