const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VehicleSale = require('../models/VehicleSale');
const User = require('../models/User');


// Get all vehicle sales (Admin only or specific employee's sales)
router.get('/', auth, async (req, res) => {
    try {
        const { seller } = req.query;

        let filter = {};
        if (req.user.role === 'admin') {
            // If filtering by seller
            if (seller) {
                filter.seller = seller;
            }
        } else if (req.user.role === 'employee') {
            filter.seller = req.user.id;
        } else {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const sales = await VehicleSale.find(filter)
            .populate('customer', 'name email phone')
            .populate('seller', 'name email');

        res.json(sales);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Get all vehicle sales data for a specific User
router.get('/:userId', auth, async (req, res) => {
    try {

        // Extract the userId from request params
        const userId = req.params.userId;

        // Find all vehicle sales for the specified user
        const sales = await VehicleSale.find({ customer: userId }).populate('customer', 'name email').populate('seller', 'name email');;

        // Respond with the sales data
        res.json(sales);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// Create a new vehicle sale (Admin or Employee)
router.post('/create', auth, async (req, res) => {
    try {
        if (!['admin', 'employee'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const { vehicleDetails, customer, paymentDetails, estimatedDelivery } = req.body;

        // Verify if the customer exists
        const existingCustomer = await User.findById(customer);
        if (!existingCustomer) {
            return res.status(404).json({ msg: 'Customer not found' });
        }

        // Ensure employees can only create sales for customers they manage
        if (req.user.role === 'employee' && existingCustomer.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Access denied: Unauthorized customer' });
        }

        const newSale = new VehicleSale({
            vehicleDetails,
            customer,
            paymentDetails,
            estimatedDelivery,
            seller: req.user.id
        });

        const sale = await newSale.save();
        res.status(201).json(sale);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Get sales for a specific customer (Customer only)
router.get('/customer', auth, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const sales = await VehicleSale.find({ customer: req.user.id });
        res.json(sales);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update the status of a sale (Admin only)
router.put('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const sale = await VehicleSale.findById(req.params.id);
        if (!sale) {
            return res.status(404).json({ msg: 'Sale not found' });
        }
        sale.status = req.body.status;
        await sale.save();
        res.json(sale);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Delete a vehicle sale (Admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const sale = await VehicleSale.findByIdAndDelete(req.params.id);

        if (!sale) {
            return res.status(404).json({ msg: 'Sale not found' });
        }

        res.json({ msg: 'Sale deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;