const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');


// Get all users (Admin or Employee)
router.get('/', auth, async (req, res) => {
    try {
        let users;

        if (req.user.role === 'admin') {
            // Admin sees all users
            users = await User.find().populate('createdBy', 'name email');;
        } else if (req.user.role === 'employee') {
            // Employee sees only their created users
            users = await User.find({ createdBy: req.user.id });
        } else {
            return res.status(403).json({ msg: 'Access denied' });
        }

        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// Create a new user (Admin only)
router.post('/create', auth, async (req, res) => {
    if (!['admin', 'employee'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied' });
    }

    const { name, email, password, role, phone } = req.body;

    const validRoles = req.user.role === 'admin' ? ['admin', 'employee', 'customer'] : ['customer'];

    if (!validRoles.includes(role)) {
        return res.status(400).json({ msg: 'Invalid role specified' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ name, email, password: hashedPassword, role, phone, status: 'active', createdBy: req.user.id });

        await user.save();

        res.json({ msg: 'User created successfully. Please securely share the login credentials.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// @route   PUT /users/approve/:id
// @desc    Approve a user (Admin & Employee only)
// @access  Private
router.put('/approve/:id', auth, async (req, res) => {
    if (!['admin', 'employee'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
        const user = await User.findOneAndUpdate(filter, { status: 'active' }, { new: true });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'User approved successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT /users/suspend/:id
// @desc    Suspend a user (Admin & Employee only)
// @access  Private
router.put('/suspend/:id', auth, async (req, res) => {
    if (!['admin', 'employee'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
        const user = await User.findOneAndUpdate(filter, { status: 'suspended' }, { new: true });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'User suspended successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update a user (Admin only)
router.put('/:id', auth, async (req, res) => {
    if (!['admin', 'employee'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
        const updatedUser = await User.findOneAndUpdate(filter, req.body, { new: true });
        if (!updatedUser) return res.status(404).json({ msg: 'User not found' });
        res.json(updatedUser);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete a user (Admin only)
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;