import logger from '../../utils/logger.js';
import * as walletService from '../../services/user/walletService.js';
import { getActivePromoBanner } from '../../services/user/bannerService.js';
import { getUserHeaderCounts } from '../../services/user/badgeService.js';

export const loadWalletPage = async (req, res) => {
    try {
        const clientIp = req.ip;
        const user = req.user || null;
        const userId = user ? user._id : null;
        const userEmail = user?.email || 'Unknown User';

        const page = parseInt(req.query.page, 10) || 1;
        const limit = 5;

        const [walletData, bannerText, headerCounts] = await Promise.all([
            walletService.getOrCreateUserWalletPaginated(userId, page, limit),
            getActivePromoBanner(),
            getUserHeaderCounts(userId)
        ]);

        logger.info(`User (${userEmail}) loaded wallet interface (Page: ${page}) | IP: ${clientIp}`);

        return res.render('user/wallet', {
            user,
            balance: walletData.balance,
            transactions: walletData.transactions,
            totalTransactions: walletData.totalTransactions,
            totalPages: walletData.totalPages,
            currentPage: walletData.currentPage,
            bannerText,
            wishlistCount: headerCounts.wishlistCount,
            cartCount: headerCounts.cartCount,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });

    } catch (error) {
        logger.error(`Error loading Wallet Page for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while retrieving your wallet details."
        });
    }
};