const mongoose = require('mongoose');

const VehicleSaleSchema = new mongoose.Schema({
    vehicleDetails: {
        make: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: Number, required: true },
        vin: { type: String, required: true },
        price: { type: Number, required: true },
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    paymentDetails: {
        amountPaid: { type: Number, required: true },
        amountDue: { type: Number },
        paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
        currency: {
            type: String,
            required: true, // To address the earlier currency field issue
        },
    },
    status: {
        type: String,
        enum: ['pending', 'in progress', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // References the employee or admin who created the sale record
        required: true,
    },
    estimatedDelivery: { type: Date },
    saleDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VehicleSale', VehicleSaleSchema);