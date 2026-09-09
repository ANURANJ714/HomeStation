import Wallet from '../../models/Wallet.js';

export const getOrCreateUserWalletPaginated = async (userId, page = 1, limit = 5) => {
    try {
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0.0,
                transactions: []
            });
            await wallet.save();
        }

        const sortedTransactions = (wallet.transactions || []).sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalTransactions = sortedTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit) || 1;
        const safePage = Math.max(1, Math.min(page, totalPages));

        const startIndex = (safePage - 1) * limit;
        const endIndex = startIndex + limit;

        const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

        return {
            balance: wallet.balance,
            transactions: paginatedTransactions,
            totalTransactions,
            totalPages,
            currentPage: safePage
        };
    } catch (error) {
        throw new Error(`Database error in walletService.getOrCreateUserWalletPaginated: ${error.message}`);
    }
};