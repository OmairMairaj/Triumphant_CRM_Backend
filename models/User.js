const mongoose = require('mongoose');
const { isValidPhoneNumber } = require('libphonenumber-js');

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
        enum: ['admin', 'employee', 'customer'],
        default: 'customer',
    },
    phone: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return isValidPhoneNumber(v); // Automatic international validation
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Refers to the admin who created the employee
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
});

module.exports = mongoose.model('User', UserSchema);
