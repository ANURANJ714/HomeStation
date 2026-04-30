import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true, required: true },
    fullName: { type: String },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    passwordHash: { 
        type: String,
        required: function(){
            return this.role === 'Admin' || this.authProvider === 'local' || this.authProvider === 'both';
        }
    }, 
    authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' },
    googleId: { type: String, unique: true, sparse: true }, 
    profileImage: { type: String, default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' },
    role: { type: String, enum: ['User', 'Admin'], default: 'User' },
    status: { type: String, enum: ['Active', 'Blocked'], default: 'Active' }
}, { 
    timestamps: true 
});

const User = mongoose.model('User', userSchema);
export default User;
