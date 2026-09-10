import crypto from 'crypto';
import Wallet from '../../models/Wallet.js';
import { razorpayInstance } from '../../config/razorpay.js';

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
        throw new Error(`Database error in getOrCreateUserWalletPaginated: ${error.message}`);
    }
};

export const createAddMoneyOrder = async (userId, amount) => {
    try {
        const parsedAmount = Math.round(Number(amount));
        if (!parsedAmount || parsedAmount <= 0) {
            throw new Error('Invalid recharge amount provided.');
        }

        const options = {
            amount: parsedAmount * 100, 
            currency: 'INR',
            receipt: `wlt_${Date.now()}`
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        return {
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID
        };
    } catch (error) {
        const detailedMessage = 
            error?.error?.description || 
            error?.description || 
            error?.message || 
            (typeof error === 'object' ? JSON.stringify(error) : String(error));

        throw new Error(`Service error in createAddMoneyOrder: ${detailedMessage}`);
    }
};

export const verifyAndCreditWallet = async (userId, paymentDetails) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = paymentDetails;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
            throw new Error('Missing necessary Razorpay payment verification parameters.');
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
            throw new Error('Payment verification failed: Invalid transaction signature.');
        }

        const creditAmount = Math.round(Number(amount));

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0.0, transactions: [] });
        }

        wallet.balance += creditAmount;
        wallet.transactions.push({
            transactionId: razorpay_payment_id,
            amount: creditAmount,
            type: 'credit',
            purpose: 'add_money',
            description: `Deposited ₹${creditAmount.toLocaleString('en-IN')} via Razorpay`,
            date: new Date()
        });

        await wallet.save();

        return {
            success: true,
            newBalance: wallet.balance,
            message: `₹${creditAmount.toLocaleString('en-IN')} added to your wallet successfully.`
        };
    } catch (error) {
        throw new Error(`Service error in verifyAndCreditWallet: ${error.message}`);
    }
};