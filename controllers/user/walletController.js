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

export const initiateAddMoney = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';
        const { amount } = req.body;

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            logger.warn(`Invalid add money amount (${amount}) by ${userEmail} | IP: ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: "Please enter a valid recharge amount greater than 0."
            });
        }

        if (numAmount > 50000) {
            logger.warn(`Excessive add money request (${numAmount}) by ${userEmail} | IP: ${clientIp}`);
            return res.status(400).json({
                success: false,
                message: "Maximum deposit limit per transaction is ₹50,000."
            });
        }

        const razorpayOrder = await walletService.createAddMoneyOrder(userId, numAmount);

        logger.info(`User (${userEmail}) created Razorpay order [${razorpayOrder.orderId}] for ₹${numAmount} | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            order: razorpayOrder,
            user: {
                name: req.user.fullName || 'User',
                email: req.user.email || '',
                phone: req.user.phone || ''
            }
        });
    } catch (error) {
        logger.error(`Error initiating add money for (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            message: "Unable to initialize payment gateway. Please try again later."
        });
    }
};

export const verifyAddMoneyPayment = async (req, res) => {
    try {
        const clientIp = req.ip;
        const userId = req.user._id;
        const userEmail = req.user.email || 'Unknown User';
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        const result = await walletService.verifyAndCreditWallet(userId, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount
        });

        logger.info(`User (${userEmail}) successfully added ₹${amount} to wallet. Payment ID: ${razorpay_payment_id} | IP: ${clientIp}`);

        return res.status(200).json({
            success: true,
            message: result.message,
            newBalance: result.newBalance
        });
    } catch (error) {
        logger.error(`Payment verification failed for user (${req.user?.email || 'Unknown'}): ${error.message}\nStack: ${error.stack}`);
        return res.status(400).json({
            success: false,
            message: error.message || "Payment verification failed."
        });
    }
};