const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('./asyncHandler');
const PermissionService = require('../services/permissionService');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized, user not found'
                });
            }

            if (!req.user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized, user account is deactivated'
                });
            }

            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({
                success: false,
                message: 'Not authorized, token failed'
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token provided'
        });
    }
});

// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, please login first'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }

        next();
    };
};

// Grant access to users with specific permissions
// Uses PermissionService for centralized permission checking with dependency resolution
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, please login first'
            });
        }

        if (PermissionService.hasPermission(req.user, permission)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `User does not have permission: ${permission}`
        });
    };
};

// Grant access to users with any of the specified permissions
const requireAnyPermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, please login first'
            });
        }

        if (!PermissionService.hasAnyPermission(req.user, permissions)) {
            return res.status(403).json({
                success: false,
                message: `User does not have any of the required permissions: ${permissions.join(', ')}`
            });
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            // Token is invalid, but we continue without user
            req.user = null;
        }
    }

    next();
});

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = generateToken(user._id);

    const options = {
        expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            message,
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
};

module.exports = {
    protect,
    authorize,
    requirePermission,
    requireAnyPermission,
    optionalAuth,
    generateToken,
    sendTokenResponse
};
