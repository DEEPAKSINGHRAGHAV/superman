const { validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages
        });
    }

    next();
};

// Custom validation middleware
const validateRequest = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for validation errors
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }));

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorMessages
            });
        }

        next();
    };
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
    // Remove any potential XSS attempts
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    };

    // Recursively sanitize object
    const sanitizeObject = (obj) => {
        if (obj === null || obj === undefined) return obj;

        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => sanitizeObject(item));
        }

        if (typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitizeObject(obj[key]);
                }
            }
            return sanitized;
        }

        return obj;
    };

    // Sanitize request body, query, and params
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    if (req.params) {
        req.params = sanitizeObject(req.params);
    }

    next();
};

// Validate ObjectId format
const validateObjectId = (paramName = 'id') => {
    return (req, res, next) => {
        const mongoose = require('mongoose');
        const id = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format`
            });
        }

        next();
    };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validate page
    if (page < 1) {
        return res.status(400).json({
            success: false,
            message: 'Page number must be greater than 0'
        });
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            message: 'Limit must be between 1 and 100'
        });
    }

    // Set pagination parameters
    req.pagination = {
        page,
        limit,
        skip: (page - 1) * limit
    };

    next();
};

// Validate date range
const validateDateRange = (startDateParam = 'startDate', endDateParam = 'endDate') => {
    return (req, res, next) => {
        const startDate = req.query[startDateParam];
        const endDate = req.query[endDateParam];

        if (startDate) {
            const parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid ${startDateParam} format. Use YYYY-MM-DD format.`
                });
            }
            req.query[startDateParam] = parsedStartDate;
        }

        if (endDate) {
            const parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid ${endDateParam} format. Use YYYY-MM-DD format.`
                });
            }
            // Set end date to end of day
            parsedEndDate.setHours(23, 59, 59, 999);
            req.query[endDateParam] = parsedEndDate;
        }

        // Validate date range
        if (startDate && endDate && parsedStartDate > parsedEndDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date cannot be greater than end date'
            });
        }

        next();
    };
};

// Validate file upload
const validateFileUpload = (options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        required = false
    } = options;

    return (req, res, next) => {
        if (!req.file && required) {
            return res.status(400).json({
                success: false,
                message: 'File is required'
            });
        }

        if (req.file) {
            // Check file size
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: `File size must be less than ${maxSize / (1024 * 1024)}MB`
                });
            }

            // Check file type
            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
                });
            }
        }

        next();
    };
};

module.exports = {
    handleValidationErrors,
    validateRequest,
    sanitizeInput,
    validateObjectId,
    validatePagination,
    validateDateRange,
    validateFileUpload
};
