import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    productVariantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ProductVariant', 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true, 
        default: 1, 
        min: 1 
    }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);