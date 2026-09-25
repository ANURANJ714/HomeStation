import Order from '../../models/Order.js';
import Coupon from '../../models/Coupon.js';

export const validateAndCalculateCouponDiscount = async (userId, couponCode, originalPayableAmount) => {
    try {
        if (!couponCode || !couponCode.trim()) {
            const err = new Error('Please enter a coupon code.');
            err.statusCode = 400;
            throw err;
        }

        const cleanCode = couponCode.trim().toUpperCase();

        const basePayableAmountSnapshot = Number(JSON.parse(JSON.stringify(originalPayableAmount)));

        if (isNaN(basePayableAmountSnapshot) || basePayableAmountSnapshot <= 0) {
            const err = new Error('Invalid cart total amount.');
            err.statusCode = 400;
            throw err;
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const coupon = await Coupon.findOne({
            code: cleanCode,
            isDeleted: false,
            status: 'active'
        }).lean();

        if (!coupon) {
            const err = new Error('The coupon is unavailable.');
            err.statusCode = 404;
            throw err;
        }

        const expiryDate = new Date(coupon.validUntil);
        expiryDate.setHours(23, 59, 59, 999);

        if (expiryDate < todayStart) {
            const err = new Error('This coupon has expired.');
            err.statusCode = 400;
            throw err;
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            const err = new Error('This coupon has reached its maximum usage limit.');
            err.statusCode = 400;
            throw err;
        }

        const previousOrderWithCoupon = await Order.findOne({
            userId,
            couponUsed: cleanCode
        }).lean();

        if (previousOrderWithCoupon) {
            const err = new Error('You have already redeemed this coupon on a previous order.');
            err.statusCode = 400;
            throw err;
        }

        if (basePayableAmountSnapshot < coupon.minPurchase) {
            const err = new Error(`Minimum purchase of ₹${coupon.minPurchase.toLocaleString('en-IN')} is required to apply this coupon.`);
            err.statusCode = 400;
            throw err;
        }

        let finalDiscountAmount = 0;

        if (coupon.discountType === 'percentage') {
            const maxRedeemLimit = Number(coupon.maxRedeemAmount) || 0;
            const calculatedPercentageDiscount = Math.round((basePayableAmountSnapshot * coupon.discountValue) / 100);

            if (maxRedeemLimit > 0 && calculatedPercentageDiscount > maxRedeemLimit) {
                finalDiscountAmount = maxRedeemLimit;
            } else {
                finalDiscountAmount = calculatedPercentageDiscount;
            }
        } else if (coupon.discountType === 'flat') {
            finalDiscountAmount = Number(coupon.discountValue) || 0;
        }

        if (finalDiscountAmount > basePayableAmountSnapshot) {
            finalDiscountAmount = basePayableAmountSnapshot;
        }

        const newTotalPayable = Math.max(0, basePayableAmountSnapshot - finalDiscountAmount);

        return {
            success: true,
            couponCode: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: finalDiscountAmount,
            basePayableAmount: basePayableAmountSnapshot,
            newTotalPayable
        };
    } catch (error) {
        throw error;
    }
};