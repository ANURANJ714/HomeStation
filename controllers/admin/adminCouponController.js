import logger from '../../utils/logger.js';
import * as couponService from '../../services/admin/couponService.js';

export const loadCouponsPage = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const clientIp = req.ip;

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 5;
        const search = req.query.search ? String(req.query.search).trim() : '';
        const type = req.query.type ? String(req.query.type).trim() : 'all';
        const status = req.query.status ? String(req.query.status).trim() : 'all';

        const result = await couponService.getCouponsPaginated({
            page,
            limit,
            search,
            type,
            status
        });

        logger.info(`Admin (${adminEmail}) loaded Manage Coupons page (Page: ${page}) | IP: ${clientIp}`);

        return res.render('admin/managecoupons', {
            coupons: result.coupons,
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
        logger.error(`Error loading coupons page: ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: 'Server error while loading coupons.'
        });
    }
};

export const createCoupon = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const newCoupon = await couponService.createNewCoupon(req.body);

        logger.info(`Admin (${adminEmail}) created new coupon: "${newCoupon.code}"`);

        return res.status(201).json({
            success: true,
            message: `Coupon "${newCoupon.code}" created successfully!`
        });
    } catch (error) {
        logger.error(`Error creating coupon: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create coupon.'
        });
    }
};

export const editCoupon = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const updated = await couponService.updateCouponDetails(id, req.body);

        logger.info(`Admin (${adminEmail}) updated coupon "${updated.code}" [ID: ${id}]`);

        return res.status(200).json({
            success: true,
            message: `Coupon "${updated.code}" updated successfully!`
        });
    } catch (error) {
        logger.error(`Error editing coupon: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update coupon.'
        });
    }
};

export const toggleStatus = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const result = await couponService.toggleCouponStatus(id);

        logger.info(`Admin (${adminEmail}) changed status of coupon "${result.code}" to [${result.status}]`);

        return res.status(200).json({
            success: true,
            status: result.status,
            message: `Coupon "${result.code}" marked as ${result.status} successfully.`
        });
    } catch (error) {
        logger.error(`Error toggling coupon status: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to toggle status.'
        });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const adminEmail = req.user?.email || 'Unknown Admin';
        const { id } = req.params;

        const result = await couponService.softDeleteCoupon(id);

        logger.info(`Admin (${adminEmail}) deleted coupon "${result.code}" [ID: ${id}]`);

        return res.status(200).json({
            success: true,
            message: `Coupon "${result.code}" deleted successfully.`
        });
    } catch (error) {
        logger.error(`Error deleting coupon: ${error.message}`);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete coupon.'
        });
    }
};