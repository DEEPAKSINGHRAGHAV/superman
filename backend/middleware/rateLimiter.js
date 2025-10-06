const rateLimit = require('express-rate-limit');

// Create rate limiter with custom options
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            success: false,
            message: message || 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: message || 'Too many requests from this IP, please try again later.',
                retryAfter: Math.round(windowMs / 1000)
            });
        }
    });
};

// General API rate limiter
const generalLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for sensitive operations
const strictLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 requests per window
    'Too many requests for this sensitive operation, please try again later.'
);

// Authentication rate limiter
const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 login attempts per window
    'Too many login attempts from this IP, please try again later.',
    true // Skip successful requests
);

// Password reset rate limiter
const passwordResetLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // 3 password reset attempts per hour
    'Too many password reset attempts from this IP, please try again later.'
);

// Product operations rate limiter
const productLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    50, // 50 product operations per window
    'Too many product operations from this IP, please try again later.'
);

// Purchase order rate limiter
const purchaseOrderLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // 20 purchase order operations per window
    'Too many purchase order operations from this IP, please try again later.'
);

// Inventory operations rate limiter
const inventoryLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    30, // 30 inventory operations per window
    'Too many inventory operations from this IP, please try again later.'
);

// Bulk operations rate limiter
const bulkOperationsLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    10, // 10 bulk operations per hour
    'Too many bulk operations from this IP, please try again later.'
);

// Search rate limiter
const searchLimiter = createRateLimit(
    1 * 60 * 1000, // 1 minute
    60, // 60 search requests per minute
    'Too many search requests from this IP, please try again later.'
);

// Report generation rate limiter
const reportLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    20, // 20 report generations per hour
    'Too many report generation requests from this IP, please try again later.'
);

// Dynamic rate limiter based on user role
const createDynamicLimiter = (baseLimit, roleMultipliers = {}) => {
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: (req) => {
            const user = req.user;
            if (!user) return baseLimit;

            const multiplier = roleMultipliers[user.role] || 1;
            return Math.floor(baseLimit * multiplier);
        },
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        keyGenerator: (req) => {
            // Include user ID in key for user-specific limiting
            return req.user ? `${req.ip}-${req.user._id}` : req.ip;
        }
    });
};

// User-specific rate limiter
const userLimiter = createDynamicLimiter(100, {
    admin: 2, // Admins get 2x limit
    manager: 1.5, // Managers get 1.5x limit
    employee: 1, // Employees get base limit
    viewer: 0.5 // Viewers get 0.5x limit
});

module.exports = {
    createRateLimit,
    generalLimiter,
    strictLimiter,
    authLimiter,
    passwordResetLimiter,
    productLimiter,
    purchaseOrderLimiter,
    inventoryLimiter,
    bulkOperationsLimiter,
    searchLimiter,
    reportLimiter,
    createDynamicLimiter,
    userLimiter
};
