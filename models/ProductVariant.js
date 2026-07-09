import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantName: {
        type: String,
        required: true,
        trim: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    stock: {
        type: Number,
        required: true,
        default: 0
    },
    length: {
        type: Number
    },
    width: {
        type: Number
    },
    height: {
        type: Number
    }
});

export default mongoose.model('ProductVariant', productVariantSchema);