import logger from '../../utils/logger.js';
import * as offerService from '../../services/admin/offerService.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const loadOffersPage = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const clientIp = req.ip;

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 6;
        const search = req.query.search ? String(req.query.search).trim() : '';
        const type = req.query.type ? String(req.query.type).trim() : 'all';
        const status = req.query.status ? String(req.query.status).trim() : 'all';

        const [result, targetData] = await Promise.all([
            offerService.getOffersPaginated({
                page,
                limit,
                search,
                type,
                status
            }),
            offerService.getTargetOptionsForOffers()
        ]);

        logger.info(`Admin (${adminEmail}) loaded Offers page (Page: ${page}) | IP: ${clientIp}`);

        return res.render('admin/offers', {
            offers: result.offers,
            products: targetData.products,
            categories: targetData.categories,
            totalItems: result.totalItems,
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            stats: result.stats,
            searchQuery: search,
            selectedType: type,
            selectedStatus: status,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (error) {
        logger.error(`Error loading offers page: ${error.message}\nStack: ${error.stack}`);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const createOffer = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const newOffer = await offerService.createNewOffer(req.body);

        logger.info(`Admin (${adminEmail}) created new offer: "${newOffer.name}"`);

        return res.status(STATUS_CODES.CREATED).json({
            success: true,
            message: `Offer "${newOffer.name}" created successfully!`
        });
    } catch (error) {
        logger.error(`Error creating offer: ${error.message}`);
        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const editOffer = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const updated = await offerService.updateOfferDetails(id, req.body);

        logger.info(`Admin (${adminEmail}) updated offer "${updated.name}" [${id}]`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: `Offer "${updated.name}" updated successfully!`
        });
    } catch (error) {
        logger.error(`Error editing offer: ${error.message}`);
        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const result = await offerService.toggleOfferStatus(id);

        logger.info(`Admin (${adminEmail}) changed status of offer "${result.name}" to [${result.status}]`);

        return res.status(STATUS_CODES.OK).json({
            success: true,
            status: result.status,
            message: `Offer "${result.name}" marked as ${result.status} successfully.`
        });
    } catch (error) {
        logger.error(`Error toggling offer status: ${error.message}`);
        return res.status(error.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};