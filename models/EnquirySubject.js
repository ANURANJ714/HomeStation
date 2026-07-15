import mongoose from 'mongoose';

const enquirySubjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    needAuth: {
        type: Boolean,
        required: true,
        default: true
    },
    isDeleted: {
        type: Boolean,
        required: true,
        default: false 
    }
}, { timestamps: true });

export default mongoose.model('EnquirySubject', enquirySubjectSchema);