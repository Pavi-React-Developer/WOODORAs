const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'staff', 'admin'],
        default: 'user',
    },
    phone: {
        type: String,
        default: '',
        trim: true,
    },
    dateOfBirth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['', 'Female', 'Male', 'Other', 'Prefer not to say'],
        default: '',
    },
    profileImage: {
        type: String,
        default: '',
    },
    addresses: [{
        label: { type: String, default: 'Home', trim: true },
        fullName: { type: String, trim: true },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pinCode: { type: String, trim: true },
        landmark: { type: String, trim: true },
        isDefault: { type: Boolean, default: false },
    }],
    preferences: {
        preferredAgeGroup: { type: String, default: 'All Ages' },
        emailNotifications: { type: Boolean, default: true },
    },
    loyalty: {
        points: { type: Number, default: 0 },
        tier: { type: String, default: 'Premium Member' },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, { timestamps: true });
// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
