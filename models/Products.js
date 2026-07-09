import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    description: {
        type: String
    },
    brand: {
        type: String,
        trim: true
    },
    material: {
        type: String,
        trim: true
    },
    warranty: {
        type: String,
        trim: true
    },
    specifications: {
        type: String
    },
    images: [{
        type: String 
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);