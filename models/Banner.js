import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    bannerText: {
        type: String,
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('Banner', bannerSchema);