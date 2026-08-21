import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [{
        productVariantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductVariant',
            required: true
        },
        quantity: { type: Number, required: true },
        currentPrice: { type: Number, required: true },
        originalPrice: { type: Number, required: true },
        discount: { type: Number, default: 0 }
    }],
    shippingAddress: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        pincode: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        fullAddress: { type: String, required: true },
        addressType: { type: String, default: 'Home' }
    },
    billingAddress: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        pincode: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        fullAddress: { type: String, required: true },
        addressType: { type: String, default: 'Home' }
    },
    paymentMode: {
        type: String,
        enum: ['razorpay', 'wallet', 'cod'],
        required: true
    },
    status: {
        type: String,
        enum: ['processing', 'packed', 'shipped', 'on the way', 'out for delivery', 'delivered', 'cancelled'],
        default: 'processing'
    },
    returnStatus: {
        type: String,
        enum: ['none', 'return initiated', 'pickup assigned', 'item picked up', 'in transit', 'item reached'],
        default: 'none'
    }
}, { timestamps: true });


export default mongoose.model('Order', orderSchema);