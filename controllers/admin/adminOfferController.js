import logger from '../../utils/logger.js';
import * as offerService from '../../services/admin/offerService.js';

export const loadOffersPage = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const clientIp = req.ip;

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 6;
        const search = req.query.search ? String(req.query.search).trim() : '';
        const type = req.query.type ? String(req.query.type).trim() : 'all';
        const status = req.query.status ? String(req.query.status).trim() : 'all';

        const result = await offerService.getOffersPaginated({
            page,
            limit,
            search,
            type,
            status
        });

        logger.info(`Admin (${adminEmail}) loaded Offers page (Page: ${page}) | IP: ${clientIp}`);

        return res.render('admin/offers', {
            offers: result.offers,
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
        return res.status(500).json({
            success: false,
            message: 'Server error while loading offers.'
        });
    }
};

export const createOffer = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const newOffer = await offerService.createNewOffer(req.body);

        logger.info(`Admin (${adminEmail}) created new offer: "${newOffer.name}"`);

        return res.status(201).json({
            success: true,
            message: `Offer "${newOffer.name}" created successfully!`
        });
    } catch (error) {
        logger.error(`Error creating offer: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create offer.'
        });
    }
};

export const editOffer = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const updated = await offerService.updateOfferDetails(id, req.body);

        logger.info(`Admin (${adminEmail}) updated offer "${updated.name}" [${id}]`);

        return res.status(200).json({
            success: true,
            message: `Offer "${updated.name}" updated successfully!`
        });
    } catch (error) {
        logger.error(`Error editing offer: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update offer.'
        });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const result = await offerService.toggleOfferStatus(id);

        logger.info(`Admin (${adminEmail}) changed status of offer "${result.name}" to [${result.status}]`);

        return res.status(200).json({
            success: true,
            status: result.status,
            message: `Offer "${result.name}" marked as ${result.status} successfully.`
        });
    } catch (error) {
        logger.error(`Error toggling offer status: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to toggle status.'
        });
    }
};