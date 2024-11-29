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
    },
    status: {
        type: String,
        enum: ['in progress', 'shipped', 'delivered'],
        default: 'in progress',
    },
    estimatedDelivery: { type: Date },
    saleDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VehicleSale', VehicleSaleSchema);