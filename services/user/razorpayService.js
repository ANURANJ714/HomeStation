import crypto from 'crypto';
import { razorpayInstance } from '../../config/razorpay.js';

export const createRazorpayOrder = async (amountInRupees, receiptIdentifier) => {
    try {
        const amountInPaise = Math.round(Number(amountInRupees) * 100);

        if (isNaN(amountInPaise) || amountInPaise <= 0) {
            throw new Error('Invalid payment amount calculated for Razorpay.');
        }

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: String(receiptIdentifier).slice(-40),
            payment_capture: 1
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);
        return razorpayOrder;
    } catch (error) {
        throw new Error(`Razorpay gateway order initiation failed: ${error.message}`);
    }
};

export const verifyRazorpayPaymentSignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
        if (!keySecret) {
            throw new Error('Razorpay secret key is not configured.');
        }

        const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
        const generatedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(payload)
            .digest('hex');

        return generatedSignature === razorpaySignature;
    } catch (error) {
        throw new Error(`Razorpay signature verification failed: ${error.message}`);
    }
};