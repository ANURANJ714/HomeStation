import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        required: [true, 'Discount type is required'],
        enum: {
            values: ['percentage', 'flat'],
            message: 'Discount type must be either percentage or flat'
        }
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [1, 'Discount value must be greater than 0']
    },
    minPurchase: {
        type: Number,
        required: [true, 'Minimum purchase amount is required'],
        min: [1000, 'Minimum purchase must be at least ₹1000']
    },
    maxRedeemAmount: {
        type: Number,
        required: [true, 'Maximum redeem amount is required'],
        min: [1, 'Maximum redeem amount must be greater than 0']
    },
    usageLimit: {
        type: Number,
        required: [true, 'Usage limit is required'],
        min: [1, 'Usage limit must be greater than 0']
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    validUntil: {
        type: Date,
        required: [true, 'Valid until date is required']
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('Coupon', couponSchema);