const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, generateToken, sendTokenResponse } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { userValidation } = require('../middleware/validators');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Private (admin only)
router.post('/register',
    protect,
    // authLimiter, // temporarily disabled for testing
    validateRequest(userValidation.register),
    asyncHandler(async (req, res) => {
        const { name, email, password, role = 'employee' } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    createdAt: user.createdAt
                }
            }
        });
    })
);

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login',
    // authLimiter, // temporarily disabled for testing
    validateRequest(userValidation.login),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Find user and include password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(401).json({
                success: false,
                message: 'Account is temporarily locked due to multiple failed login attempts'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // Increment login attempts
            await user.incLoginAttempts();

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Reset login attempts and update last login
        await user.resetLoginAttempts();

        // Send token response
        sendTokenResponse(user, 200, res, 'Login successful');
    })
);

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me',
    protect,
    asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    permissions: user.permissions,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            }
        });
    })
);

// @desc    Update user profile
// @route   PUT /api/v1/auth/me
// @access  Private
router.put('/me',
    protect,
    asyncHandler(async (req, res) => {
        const { name, phone } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { name, phone },
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin,
                    createdAt: user.createdAt
                }
            }
        });
    })
);

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
router.put('/change-password',
    protect,
    asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Find user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    })
);

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
router.post('/logout',
    protect,
    asyncHandler(async (req, res) => {
        // In a JWT-based system, logout is typically handled on the client side
        // by removing the token. However, we can implement token blacklisting
        // or update user's last logout time here if needed.

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    })
);

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
// @access  Private
router.post('/refresh',
    protect,
    asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Generate new token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                    isActive: user.isActive,
                    lastLogin: user.lastLogin
                }
            }
        });
    })
);

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
router.post('/forgot-password',
    passwordResetLimiter,
    asyncHandler(async (req, res) => {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If the email exists, a reset link has been sent'
            });
        }

        // Generate reset token (in a real app, you'd send this via email)
        const resetToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store reset token in user document
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        // In production, you would send an email with the reset link
        console.log(`Password reset token for ${email}: ${resetToken}`);

        res.status(200).json({
            success: true,
            message: 'If the email exists, a reset link has been sent',
            // Remove this in production - only for development
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });
    })
);

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password
// @access  Public
router.put('/reset-password',
    passwordResetLimiter,
    asyncHandler(async (req, res) => {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Find user with reset token
        const user = await User.findOne({
            _id: decoded.id,
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    })
);

module.exports = router;
