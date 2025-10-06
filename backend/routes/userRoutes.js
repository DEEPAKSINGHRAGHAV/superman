const express = require('express');
const User = require('../models/User');
const router = express.Router();

// GET /api/v1/users - Get all users
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, role, isActive } = req.query;

        // Build filter object
        const filter = {};
        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const users = await User.find(filter)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.json({
            status: 'success',
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

// GET /api/v1/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user',
            error: error.message
        });
    }
});

// POST /api/v1/users - Create new user
router.post('/', async (req, res) => {
    try {
        const { name, email, age, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this email already exists'
            });
        }

        const user = new User({
            name,
            email,
            age,
            role
        });

        await user.save();

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: { user }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to create user',
            error: error.message
        });
    }
});

// PUT /api/v1/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        const { name, email, age, role, isActive } = req.body;

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: 'User with this email already exists'
                });
            }
        }

        // Update user fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (age !== undefined) user.age = age;
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        res.json({
            status: 'success',
            message: 'User updated successfully',
            data: { user }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to update user',
            error: error.message
        });
    }
});

// DELETE /api/v1/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete user',
            error: error.message
        });
    }
});

// GET /api/v1/users/active - Get active users only
router.get('/active', async (req, res) => {
    try {
        const activeUsers = await User.findActiveUsers();

        res.json({
            status: 'success',
            data: { users: activeUsers }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch active users',
            error: error.message
        });
    }
});

module.exports = router;
