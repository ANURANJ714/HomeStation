import * as bannerService from '../../services/admin/bannerService.js';
import * as dashboardService from '../../services/admin/dashboardService.js';
import logger from '../../utils/logger.js';
import { STATUS_CODES } from '../../src/constants/httpStatusCodes.js';
import { COMMON_MESSAGES } from '../../src/constants/commonMessages.js';

export const getAdminDashboard = async (req, res) => {
    try {
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        logger.info(`Admin dashboard accessed by: ${adminEmail} | IP: ${req.ip}`);

        const [banner, analytics] = await Promise.all([
            bannerService.getActiveBanner(),
            dashboardService.getDashboardAnalytics()
        ]);

        return res.render('admin/dashboard', { 
            admin: req.user,
            csrfToken: req.csrfToken ? req.csrfToken() : '',
            bannerText: banner ? banner.bannerText : '',
            stats: analytics
        });
    } catch (error) {
        logger.error(`Error loading admin dashboard: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false, 
            title: "Server Error", 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR
        });
    }
};

export const updateBannerTextHandler = async (req, res) => {
    try {
        const bannerText = req.body.bannerText !== undefined ? req.body.bannerText.trim() : '';

        await bannerService.updateBannerText(bannerText);

        logger.info(`Banner updated by Admin (${req.user ? req.user.email : 'Unknown'}). New text: "${bannerText}"`);

        return res.status(STATUS_CODES.OK).json({ 
            success: true, 
            message: bannerText ? 'Promotion banner updated successfully!' : 'Promotion banner cleared!' 
        });
    } catch (error) {
        logger.error(`Error updating banner text: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: error.message || COMMON_MESSAGES.SERVER_ERROR 
        });
    }
};