import * as bannerService from '../../services/admin/bannerService.js';
import * as dashboardService from '../../services/admin/dashboardService.js';
import logger from '../../utils/logger.js';

export const getAdminDashboard = async (req, res) => {
    try {
        const adminEmail = req.user ? req.user.email : 'Unknown Admin';
        logger.info(`Admin dashboard accessed by: ${adminEmail}`);

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
        
        return res.status(500).json({
            success: false, 
            title: "Server Error", 
            message: "An internal server error occurred while loading the dashboard analytics."
        });
    }
};

export const updateBannerTextHandler = async (req, res) => {
    try {
        const bannerText = req.body.bannerText !== undefined ? req.body.bannerText.trim() : '';

        await bannerService.updateBannerText(bannerText);

        logger.info(`Banner updated by Admin (${req.user ? req.user.email : 'Unknown'}). New text: "${bannerText}"`);

        return res.status(200).json({ 
            success: true, 
            message: bannerText ? 'Promotion banner updated successfully!' : 'Promotion banner cleared!' 
        });
    } catch (error) {
        logger.error(`Error updating banner text: ${error.message}\nStack: ${error.stack}`);
        
        return res.status(500).json({ 
            success: false, 
            message: 'An error occurred while saving the banner details.' 
        });
    }
};