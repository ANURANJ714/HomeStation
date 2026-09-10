import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) {
    console.error('CRITICAL: Razorpay API keys are missing in environment variables.');
}

export const razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
});