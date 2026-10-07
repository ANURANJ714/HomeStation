import express from 'express';
import { verifyAdmin } from '../../middlewares/adminAuth.js';
import { getSalesReport, downloadPdfReport, exportSpreadsheet } from '../../controllers/admin/salesReportController.js';

const router = express.Router();

router.get('/sales-report', verifyAdmin, getSalesReport);
router.get('/sales-report/download-pdf', verifyAdmin, downloadPdfReport);
router.get('/sales-report/export-excel', verifyAdmin, exportSpreadsheet);

export default router;