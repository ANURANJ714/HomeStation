import * as bannerService from '../../services/admin/bannerService.js';
import logger from '../../utils/logger.js';

export const getAdminDashboard = async (req, res) => {
    try {
        logger.info(`Admin dashboard accessed by: ${req.user ? req.user.email : 'Unknown'}`);

        const banner = await bannerService.getActiveBanner();
        
        res.render('admin/dashboard', { 
            admin: req.user,
            bannerText: banner ? banner.bannerText : ''
        });
    } catch (error) {
        logger.error(`Error loading admin dashboard: ${error.message}\nStack: ${error.stack}`);
        
        res.status(500).json({
            success: false, 
            title: "Server Error", 
            message: "An Internal Error has occurred!"
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