import * as enquiryService from '../../services/admin/enquiryService.js';
import logger from '../../utils/logger.js';

export const loadEnquiriesDashboard = async (req, res) => {
    try {
        const search = req.query.search ? String(req.query.search).trim() : '';
        const status = req.query.status ? String(req.query.status).trim() : '';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 6;

        const viewData = await enquiryService.getPaginatedEnquiries({
            search,
            status,
            page,
            limit
        });

        logger.info(`Admin enquiries view loaded. Filter applied -> [Search: "${search}", Status: "${status}", Page: ${page}]`);

        return res.render('admin/enquiry', {
            enquiries: viewData.enquiries,
            subjects: viewData.subjects,
            totalItems: viewData.totalItems,
            totalPages: viewData.totalPages,
            currentPage: viewData.currentPage,
            startIndex: viewData.startIndex,
            endIndex: viewData.endIndex,
            searchQuery: search,
            currentStatusFilter: status,
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        logger.error(`Critical parsing exception caught inside loadEnquiriesDashboard: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({ success: false, message: "Internal server processing error mapping enquiries dataset context." });
    }
};

export const addNewEnquirySubject = async (req, res) => {
    try {
        const { name, needAuth } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: "Subject name field cannot be blank." });
        }

        const authCondition = needAuth === 'true' || needAuth === true;

        const result = await enquiryService.createEnquirySubject({
            name: name.trim(),
            needAuth: authCondition
        });

        if (!result.success) {
            logger.warn(`Admin subject addition rejected: ${result.message}`);
            return res.status(200).json({ success: false, reason: result.reason, message: result.message });
        }

        logger.info(`Admin successfully created new enquiry subject: "${name.trim()}" [needAuth: ${authCondition}]`);
        return res.status(200).json({ success: true, message: result.message });

    } catch (error) {
        logger.error(`Critical failure in addNewEnquirySubject controller: ${error.message}`);
        return res.status(500).json({ success: false, message: "An internal server error occurred while creating the subject." });
    }
};

export const removeEnquirySubject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Subject identifier variable is required." });
        }

        const result = await enquiryService.deleteEnquirySubject(id);

        if (!result.success) {
            logger.warn(`Admin action denied on subject removal for ID ${id}: ${result.message}`);
            return res.status(200).json({ success: false, message: result.message });
        }

        logger.info(`Admin successfully deleted enquiry subject ID: ${id}`);
        return res.status(200).json({ success: true, message: result.message });

    } catch (error) {
        logger.error(`Critical breakdown inside removeEnquirySubject controller pipeline: ${error.message}`);
        return res.status(500).json({ success: false, message: "Internal server processing error removing subject reference mapping." });
    }
};