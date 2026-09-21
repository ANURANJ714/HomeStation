import Coupon from '../../models/Coupon.js';

export const getCouponsPaginated = async ({ page = 1, limit = 5, search = '', type = 'all', status = 'all' }) => {
    try {
        const query = { isDeleted: false };

        if (status && status !== 'all') {
            query.status = status.toLowerCase();
        }

        if (type && type !== 'all') {
            query.discountType = type.toLowerCase();
        }

        if (search && search.trim() !== '') {
            query.code = new RegExp(search.trim(), 'i');
        }

        const skip = (page - 1) * limit;

        const [coupons, totalItems, totalCoupons, activeCoupons, inactiveCoupons] = await Promise.all([
            Coupon.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Coupon.countDocuments(query),
            Coupon.countDocuments({ isDeleted: false }),
            Coupon.countDocuments({ isDeleted: false, status: 'active' }),
            Coupon.countDocuments({ isDeleted: false, status: 'inactive' })
        ]);

        const totalPages = Math.ceil(totalItems / limit) || 1;

        return {
            coupons,
            totalItems,
            totalPages,
            currentPage: page,
            stats: {
                totalCoupons,
                activeCoupons,
                inactiveCoupons
            }
        };
    } catch (error) {
        throw new Error(`Service failure fetching coupons: ${error.message}`);
    }
};

export const createNewCoupon = async (data) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxRedeemAmount,
            usageLimit,
            validUntil,
            status
        } = data;

        const cleanCode = code ? code.trim().toUpperCase() : '';
        const cleanType = discountType ? discountType.trim().toLowerCase() : '';
        const numDiscount = Number(discountValue);
        const numMinPurchase = Number(minPurchase);
        const numMaxRedeem = Number(maxRedeemAmount);
        const numUsageLimit = Number(usageLimit);

        if (!cleanCode) {
            const err = new Error('Coupon code is required.');
            err.statusCode = 400;
            throw err;
        }

        const existingCoupon = await Coupon.findOne({ code: cleanCode, isDeleted: false });
        if (existingCoupon) {
            const err = new Error(`Coupon with code "${cleanCode}" already exists.`);
            err.statusCode = 409;
            throw err;
        }

        if (!['percentage', 'flat'].includes(cleanType)) {
            const err = new Error('Discount type must be either percentage or flat.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numDiscount) || numDiscount <= 0) {
            const err = new Error('Discount value must be greater than 0.');
            err.statusCode = 400;
            throw err;
        }

        if (cleanType === 'percentage' && numDiscount > 90) {
            const err = new Error('Percentage discount cannot exceed 90%.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numMinPurchase) || numMinPurchase < 1000) {
            const err = new Error('Minimum purchase amount must be at least ₹1000.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numMaxRedeem) || numMaxRedeem <= 0) {
            const err = new Error('Maximum redeem amount must be greater than 0.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numUsageLimit) || numUsageLimit <= 0) {
            const err = new Error('Usage limit must be greater than 0.');
            err.statusCode = 400;
            throw err;
        }

        if (!validUntil) {
            const err = new Error('Valid until date is required.');
            err.statusCode = 400;
            throw err;
        }

        const expiryDate = new Date(validUntil);
        expiryDate.setHours(23, 59, 59, 999);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        if (expiryDate <= todayEnd) {
            const err = new Error('Valid until date cannot be today or in the past.');
            err.statusCode = 400;
            throw err;
        }

        const newCoupon = new Coupon({
            code: cleanCode,
            discountType: cleanType,
            discountValue: numDiscount,
            minPurchase: numMinPurchase,
            maxRedeemAmount: numMaxRedeem,
            usageLimit: numUsageLimit,
            validUntil: expiryDate,
            status: status ? status.toLowerCase() : 'active'
        });

        await newCoupon.save();
        return newCoupon;
    } catch (error) {
        throw error;
    }
};

export const updateCouponDetails = async (couponId, data) => {
    try {
        const coupon = await Coupon.findOne({ _id: couponId, isDeleted: false });
        if (!coupon) {
            const err = new Error('Coupon not found.');
            err.statusCode = 404;
            throw err;
        }

        const {
            code,
            discountType,
            discountValue,
            minPurchase,
            maxRedeemAmount,
            usageLimit,
            validUntil,
            status
        } = data;

        const cleanCode = code ? code.trim().toUpperCase() : '';
        const cleanType = discountType ? discountType.trim().toLowerCase() : '';
        const numDiscount = Number(discountValue);
        const numMinPurchase = Number(minPurchase);
        const numMaxRedeem = Number(maxRedeemAmount);
        const numUsageLimit = Number(usageLimit);

        if (!cleanCode) {
            const err = new Error('Coupon code is required.');
            err.statusCode = 400;
            throw err;
        }

        const duplicateCoupon = await Coupon.findOne({
            _id: { $ne: couponId },
            code: cleanCode,
            isDeleted: false
        });

        if (duplicateCoupon) {
            const err = new Error(`Another coupon with code "${cleanCode}" already exists.`);
            err.statusCode = 409;
            throw err;
        }

        if (isNaN(numDiscount) || numDiscount <= 0) {
            const err = new Error('Discount value must be greater than 0.');
            err.statusCode = 400;
            throw err;
        }

        if (cleanType === 'percentage' && numDiscount > 90) {
            const err = new Error('Percentage discount cannot exceed 90%.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numMinPurchase) || numMinPurchase < 1000) {
            const err = new Error('Minimum purchase amount must be at least ₹1000.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numMaxRedeem) || numMaxRedeem <= 0) {
            const err = new Error('Maximum redeem amount must be greater than 0.');
            err.statusCode = 400;
            throw err;
        }

        if (isNaN(numUsageLimit) || numUsageLimit <= 0) {
            const err = new Error('Usage limit must be greater than 0.');
            err.statusCode = 400;
            throw err;
        }

        if (!validUntil) {
            const err = new Error('Valid until date is required.');
            err.statusCode = 400;
            throw err;
        }

        const expiryDate = new Date(validUntil);
        expiryDate.setHours(23, 59, 59, 999);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        if (expiryDate <= todayEnd) {
            const err = new Error('Valid until date cannot be today or in the past.');
            err.statusCode = 400;
            throw err;
        }

        coupon.code = cleanCode;
        coupon.discountType = cleanType;
        coupon.discountValue = numDiscount;
        coupon.minPurchase = numMinPurchase;
        coupon.maxRedeemAmount = numMaxRedeem;
        coupon.usageLimit = numUsageLimit;
        coupon.validUntil = expiryDate;
        if (status) coupon.status = status.toLowerCase();

        await coupon.save();
        return coupon;
    } catch (error) {
        throw error;
    }
};

export const toggleCouponStatus = async (couponId) => {
    try {
        const coupon = await Coupon.findOne({ _id: couponId, isDeleted: false });
        if (!coupon) {
            const err = new Error('Coupon not found.');
            err.statusCode = 404;
            throw err;
        }

        coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
        await coupon.save();

        return {
            status: coupon.status,
            code: coupon.code
        };
    } catch (error) {
        throw error;
    }
};

export const softDeleteCoupon = async (couponId) => {
    try {
        const coupon = await Coupon.findOne({ _id: couponId, isDeleted: false });
        if (!coupon) {
            const err = new Error('Coupon not found.');
            err.statusCode = 404;
            throw err;
        }

        coupon.isDeleted = true;
        await coupon.save();

        return {
            code: coupon.code
        };
    } catch (error) {
        throw error;
    }
};