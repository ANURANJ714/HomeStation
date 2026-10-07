import * as salesReportService from '../../services/admin/salesReportService.js';
import logger from '../../utils/logger.js';

export const getSalesReport = async (req, res) => {
    try {
        const { filter = 'last30', fromDate = '', toDate = '', page = 1 } = req.query;
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';

        logger.info(`Sales report accessed by ${adminEmail} [Filter: ${filter}, Page: ${page}] | IP: ${req.ip}`);

        const reportData = await salesReportService.getSalesReportData({
            filter,
            fromDate,
            toDate,
            page: parseInt(page, 10) || 1,
            limit: 6
        });

        return res.render('admin/salesreport', {
            admin: req.user,
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            data: reportData
        });
    } catch (error) {
        logger.error(`Error loading sales report: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            title: "Server Error",
            message: "An error occurred while loading the sales report."
        });
    }
};

export const downloadPdfReport = async (req, res) => {
    try {
        const { filter = 'last30', fromDate = '', toDate = '' } = req.query;
        logger.info(`Generating PDF Sales Report for filter: ${filter} | IP: ${req.ip}`);

        const records = await salesReportService.getAllFilteredRecords({ filter, fromDate, toDate });
        const filterTitle = filter === 'custom' ? `Custom (${fromDate} to ${toDate})` : filter.toUpperCase();
        const pdfBuffer = await salesReportService.generatePdfReport(records, filterTitle);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=SalesReport_${filter}_${Date.now()}.pdf`);
        return res.end(pdfBuffer);
    } catch (error) {
        logger.error(`PDF export error: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Failed to download PDF." });
    }
};

export const exportSpreadsheet = async (req, res) => {
    try {
        const { filter = 'last30', fromDate = '', toDate = '' } = req.query;
        logger.info(`Generating Excel Sales Report for filter: ${filter} | IP: ${req.ip}`);

        const records = await salesReportService.getAllFilteredRecords({ filter, fromDate, toDate });
        const filterTitle = filter === 'custom' ? `Custom (${fromDate} to ${toDate})` : filter.toUpperCase();
        const excelBuffer = await salesReportService.generateExcelReport(records, filterTitle);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=SalesReport_${filter}_${Date.now()}.xlsx`);
        return res.end(excelBuffer);
    } catch (error) {
        logger.error(`Excel export error: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Failed to export spreadsheet." });
    }
};