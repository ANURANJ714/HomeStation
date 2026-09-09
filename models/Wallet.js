import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        default: () => 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000)
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Transaction amount cannot be negative']
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    },
    purpose: {
        type: String,
        enum: ['return_refund', 'add_money', 'order_purchase', 'cancellation_refund'],
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    orderId: {
        type: String,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0.0,
        min: [0, 'Wallet balance cannot be negative']
    },
    transactions: [transactionSchema]
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);