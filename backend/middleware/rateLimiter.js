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

// General API rate limiter - Industry standard: 1000 requests per 15 minutes
const generalLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per window (increased from 100)
    'Too many requests from this IP, please try again later.'
);

// Strict rate limiter for sensitive operations - Industry standard: 20 requests per 15 minutes
const strictLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    20, // 20 requests per window (increased from 5)
    'Too many requests for this sensitive operation, please try again later.'
);

// Authentication rate limiter - Industry standard: 10 login attempts per 15 minutes
const authLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 login attempts per window (increased from 5)
    'Too many login attempts from this IP, please try again later.',
    true // Skip successful requests
);

// Password reset rate limiter - Industry standard: 5 password reset attempts per hour
const passwordResetLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    5, // 5 password reset attempts per hour (increased from 3)
    'Too many password reset attempts from this IP, please try again later.'
);

// Product operations rate limiter - Industry standard: 200 operations per 15 minutes
const productLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    200, // 200 product operations per window (increased from 50)
    'Too many product operations from this IP, please try again later.'
);

// Purchase order rate limiter - Industry standard: 100 operations per 15 minutes
const purchaseOrderLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 purchase order operations per window (increased from 20)
    'Too many purchase order operations from this IP, please try again later.'
);

// Inventory operations rate limiter - Industry standard: 150 operations per 15 minutes
const inventoryLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    150, // 150 inventory operations per window (increased from 30)
    'Too many inventory operations from this IP, please try again later.'
);

// Bulk operations rate limiter - Industry standard: 50 operations per hour
const bulkOperationsLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    50, // 50 bulk operations per hour (increased from 10)
    'Too many bulk operations from this IP, please try again later.'
);

// Search rate limiter - Industry standard: 300 requests per minute
const searchLimiter = createRateLimit(
    1 * 60 * 1000, // 1 minute
    300, // 300 search requests per minute (increased from 60)
    'Too many search requests from this IP, please try again later.'
);

// Report generation rate limiter - Industry standard: 100 reports per hour
const reportLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    100, // 100 report generations per hour (increased from 20)
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

// User-specific rate limiter - Industry standard base limit increased
const userLimiter = createDynamicLimiter(500, { // Increased base limit from 100 to 500
    admin: 3, // Admins get 3x limit (1500 requests per 15 min)
    manager: 2, // Managers get 2x limit (1000 requests per 15 min)
    employee: 1, // Employees get base limit (500 requests per 15 min)
    viewer: 0.5 // Viewers get 0.5x limit (250 requests per 15 min)
});

// API key rate limiter for external integrations
const apiKeyLimiter = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    2000, // 2000 requests per window for API keys
    'Too many API requests from this key, please try again later.'
);

// File upload rate limiter
const fileUploadLimiter = createRateLimit(
    60 * 60 * 1000, // 1 hour
    100, // 100 file uploads per hour
    'Too many file uploads from this IP, please try again later.'
);

// Database query rate limiter
const databaseQueryLimiter = createRateLimit(
    1 * 60 * 1000, // 1 minute
    500, // 500 database queries per minute
    'Too many database queries from this IP, please try again later.'
);

// Webhook rate limiter
const webhookLimiter = createRateLimit(
    1 * 60 * 1000, // 1 minute
    1000, // 1000 webhook requests per minute
    'Too many webhook requests from this IP, please try again later.'
);

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
    userLimiter,
    apiKeyLimiter,
    fileUploadLimiter,
    databaseQueryLimiter,
    webhookLimiter
};
