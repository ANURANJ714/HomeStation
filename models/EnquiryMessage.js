import mongoose from 'mongoose';

const enquiryMessageSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EnquirySubject',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    ticketStatus: {
        type: String,
        required: true,
        enum: ['Ticket Raised', 'Pending', 'Resolved'],
        default: 'Ticket Raised'
    }
}, { timestamps: true });

export default mongoose.model('EnquiryMessage', enquiryMessageSchema);