import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true 
    },
    variants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductVariant'
    }]
}, { timestamps: true });

export default mongoose.model('Wishlist', wishlistSchema);