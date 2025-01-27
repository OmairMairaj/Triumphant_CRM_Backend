const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// Helper function to generate JWT
const generateToken = (user) => {
    const payload = { user: { id: user.id, role: user.role } };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
};

// @route   POST /forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email (add an email service like nodemailer here)
        // For demonstration:
        console.log(`Password reset link: ${process.env.FRONTEND_URL}/reset-password/${resetToken}`);

        res.json({ msg: 'Password reset link has been sent to your email' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /reset-password/:token
// @desc    Reset the password
// @access  Public
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;

    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ msg: 'Token is invalid or has expired' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ msg: 'Password has been reset successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    [
        check('name', 'Name is required').not().isEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
        // check('phone', 'Phone is required and must be a valid number').matches(/\d{10}/)
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, phone } = req.body;
        try {
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({ name, email, password: hashedPassword, role: 'customer', phone, status: 'pending', createdBy: null });
            await user.save();

            res.status(201).json({ msg: 'User registered successfully. Awaiting admin approval.' });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ mg: 'Server error', error: err.message });
        }
    }
);



// @route   POST /login
// @desc    Authenticate user and get token
// @access  Public
router.post(
    '/login',
    [
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email });

            // Check if the user exists
            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }

            // Check account status
            if (user.status === 'suspended') {
                return res.status(403).json({ msg: 'Your account has been suspended.' });
            } else if (user.status === 'pending') {
                return res.status(403).json({ msg: 'Your account is awaiting admin approval.' });
            }

            // Generate JWT Token
            const token = generateToken(user);

            // Exclude sensitive fields before sending the response
            const { id, name, role } = user;
            res.json({ token, user: { id, name, email, role } });

        } catch (err) {
            console.error('Login Error:', err.message);
            res.status(500).json({ msg: 'Server Error' });
        }
    }
);


module.exports = router;
