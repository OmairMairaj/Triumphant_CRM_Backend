const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'customer'],
        default: 'customer',
    },
    phone: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /\d{10}/.test(v); // Assuming the phone number should be 10 digits
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending',
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
});

module.exports = mongoose.model('User', UserSchema);
