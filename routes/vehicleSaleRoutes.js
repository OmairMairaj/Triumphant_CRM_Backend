const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VehicleSale = require('../models/VehicleSale');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');


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

// @route   PUT /api/vehiclesales/:id
// @desc    Update a vehicle sale record
// @access  Private (Admin & Employee)
router.put(
    '/:id',
    auth,
    [
        check('vehicleDetails.vin', 'VIN is required and must be a valid string')
            .optional()
            .isString()
            .isLength({ min: 5 }),
        check('vehicleDetails.make', 'Vehicle make is required and must be a string')
            .optional()
            .isString(),
        check('vehicleDetails.model', 'Vehicle model is required and must be a string')
            .optional()
            .isString(),
        check('vehicleDetails.year', 'Vehicle year must be a valid 4-digit number')
            .optional()
            .isInt({ min: 1900, max: new Date().getFullYear() }),
        check('vehicleDetails.price', 'Vehicle price must be a positive number')
            .optional()
            .isFloat({ min: 0 }),

        check('paymentDetails.amountPaid', 'Amount paid must be a non-negative number')
            .optional()
            .isFloat({ min: 0 }),
        check('paymentDetails.amountDue', 'Amount due must be a non-negative number')
            .optional()
            .isFloat({ min: 0 }),
        check('paymentDetails.paymentStatus', 'Invalid payment status')
            .optional()
            .custom((value) => {
                const validStatuses = ['Paid', 'Pending'];
                if (!validStatuses.includes(value)) {
                    throw new Error('Invalid payment status');
                }
                return true;
            }),

        check('saleDate', 'Invalid sale date')
            .optional()
            .isISO8601(),
        check('estimatedDelivery', 'Invalid estimated delivery date')
            .optional()
            .isISO8601(),
        check('status', 'Invalid status')
            .optional()
            .isIn(['pending', 'in progress', 'shipped', 'delivered', 'cancelled']),

        check('customer', 'Invalid customer ID')
            .optional()
            .isMongoId(),

        check('seller', 'Invalid seller ID')
            .optional()
            .isMongoId(),
    ],
    async (req, res) => {
        if (!['admin', 'employee'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            let sale = await VehicleSale.findById(req.params.id);
            if (!sale) {
                return res.status(404).json({ msg: 'Sale not found' });
            }

            // If employee, ensure they are only modifying their own sales
            if (req.user.role === 'employee' && sale.seller.toString() !== req.user.id) {
                return res.status(403).json({ msg: 'Access denied: Unauthorized seller' });
            }

            // Validate new customer if provided
            if (req.body.customer) {
                const customer = await User.findById(req.body.customer);
                if (!customer || customer.role !== 'customer') {
                    return res.status(400).json({ msg: 'Invalid customer ID' });
                }
                sale.customer = req.body.customer;
            }

            // Validate new seller if provided (admin only)
            if (req.body.seller && req.user.role === 'admin') {
                const seller = await User.findById(req.body.seller);
                if (!seller || (seller.role !== 'employee' && seller.role !== 'admin')) {
                    return res.status(400).json({ msg: 'Invalid seller ID' });
                }
                sale.seller = req.body.seller;
            }

            // Update sale details based on provided fields
            const { vehicleDetails, paymentDetails, saleDate, estimatedDelivery, status } = req.body;

            if (vehicleDetails) {
                sale.vehicleDetails.vin = vehicleDetails.vin || sale.vehicleDetails.vin;
                sale.vehicleDetails.make = vehicleDetails.make || sale.vehicleDetails.make;
                sale.vehicleDetails.model = vehicleDetails.model || sale.vehicleDetails.model;
                sale.vehicleDetails.year = vehicleDetails.year || sale.vehicleDetails.year;
                sale.vehicleDetails.price = vehicleDetails.price || sale.vehicleDetails.price;
            }

            if (paymentDetails) {
                sale.paymentDetails.amountPaid = paymentDetails.amountPaid || sale.paymentDetails.amountPaid;
                sale.paymentDetails.amountDue = paymentDetails.amountDue || sale.paymentDetails.amountDue;
                sale.paymentDetails.paymentStatus = paymentDetails.paymentStatus || sale.paymentDetails.paymentStatus;
            }

            if (saleDate) sale.saleDate = saleDate;
            if (estimatedDelivery) sale.estimatedDelivery = estimatedDelivery;
            if (status) sale.status = status;

            await sale.save();
            res.json({ msg: 'Sale updated successfully', sale });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server error');
        }
    }
);



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