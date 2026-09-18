import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Offer name is required'],
        trim: true,
        uppercase: true
    },
    offerType: {
        type: String,
        required: [true, 'Offer type is required'],
        enum: {
            values: ['product', 'category'],
            message: 'Offer type must be either product or category'
        }
    },
    discount: {
        type: Number,
        required: [true, 'Discount percentage is required'],
        min: [1, 'Discount must be greater than 0'],
        max: [90, 'Discount must be 90% or below']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'Target reference ID is required'],
        refPath: 'targetModel'
    },
    targetModel: {
        type: String,
        required: true,
        enum: ['Product', 'Category']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
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

export default mongoose.model('Offer', offerSchema);