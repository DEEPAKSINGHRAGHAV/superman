const { body, param, query } = require('express-validator');

// Product validation rules
const productValidation = {
    create: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Product name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Product name must be between 2 and 100 characters'),

        body('sku')
            .trim()
            .notEmpty()
            .withMessage('SKU is required')
            .isLength({ min: 3, max: 20 })
            .withMessage('SKU must be between 3 and 20 characters')
            .matches(/^[A-Z0-9-_]+$/)
            .withMessage('SKU can only contain uppercase letters, numbers, hyphens, and underscores'),

        body('barcode')
            .optional()
            .trim()
            .isLength({ min: 8, max: 20 })
            .withMessage('Barcode must be between 8 and 20 characters')
            .matches(/^[0-9]+$/)
            .withMessage('Barcode must contain only numbers'),

        body('mrp')
            .isFloat({ min: 0 })
            .withMessage('MRP must be a positive number'),

        body('costPrice')
            .isFloat({ min: 0 })
            .withMessage('Cost price must be a positive number'),

        body('sellingPrice')
            .isFloat({ min: 0 })
            .withMessage('Selling price must be a positive number')
            .custom((value, { req }) => {
                if (value < req.body.costPrice) {
                    throw new Error('Selling price cannot be less than cost price');
                }
                return true;
            }),

        body('currentStock')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Current stock must be a non-negative integer'),

        body('minStockLevel')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Minimum stock level must be a non-negative integer'),

        body('maxStockLevel')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Maximum stock level must be a non-negative integer'),

        body('category')
            .notEmpty()
            .withMessage('Category is required')
            .isIn(['grocery', 'snacks', 'personal-care', 'dairy', 'fruits-vegetables', 'meat-seafood', 'bakery', 'beverages', 'household', 'electronics', 'other'])
            .withMessage('Invalid category'),

        body('unit')
            .optional()
            .isIn(['pcs', 'kg', 'liter', 'gram', 'ml', 'box', 'pack'])
            .withMessage('Invalid unit'),

        body('brand')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Brand name cannot exceed 50 characters')
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid product ID'),

        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Product name must be between 2 and 100 characters'),

        body('sku')
            .optional()
            .trim()
            .isLength({ min: 3, max: 20 })
            .withMessage('SKU must be between 3 and 20 characters')
            .matches(/^[A-Z0-9-_]+$/)
            .withMessage('SKU can only contain uppercase letters, numbers, hyphens, and underscores'),

        body('barcode')
            .optional()
            .trim()
            .isLength({ min: 8, max: 20 })
            .withMessage('Barcode must be between 8 and 20 characters')
            .matches(/^[0-9]+$/)
            .withMessage('Barcode must contain only numbers'),

        body('mrp')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('MRP must be a positive number'),

        body('costPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Cost price must be a positive number'),

        body('sellingPrice')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Selling price must be a positive number'),

        body('category')
            .optional()
            .isIn(['grocery', 'dairy', 'fruits-vegetables', 'meat-seafood', 'bakery', 'beverages', 'snacks', 'personal-care', 'household', 'electronics', 'other'])
            .withMessage('Invalid category')
    ],

    stockUpdate: [
        param('id').isMongoId().withMessage('Invalid product ID'),

        body('quantity')
            .isInt()
            .withMessage('Quantity must be an integer'),

        body('movementType')
            .isIn(['purchase', 'sale', 'adjustment', 'return', 'damage', 'transfer'])
            .withMessage('Invalid movement type'),

        body('reason')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Reason cannot exceed 200 characters')
    ]
};

// Supplier validation rules
const supplierValidation = {
    create: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Supplier name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Supplier name must be between 2 and 100 characters'),

        body('code')
            .trim()
            .notEmpty()
            .withMessage('Supplier code is required')
            .isLength({ min: 2, max: 20 })
            .withMessage('Supplier code must be between 2 and 20 characters')
            .matches(/^[A-Z0-9-_]+$/)
            .withMessage('Supplier code can only contain uppercase letters, numbers, hyphens, and underscores'),

        body('email')
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('phone')
            .optional()
            .matches(/^[\+]?[1-9][\d]{0,15}$/)
            .withMessage('Please provide a valid phone number'),

        body('gstNumber')
            .optional()
            .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
            .withMessage('Please provide a valid GST number'),

        body('panNumber')
            .optional()
            .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
            .withMessage('Please provide a valid PAN number'),

        body('creditLimit')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Credit limit must be a positive number'),

        body('paymentTerms')
            .optional()
            .isInt({ min: 0, max: 365 })
            .withMessage('Payment terms must be between 0 and 365 days')
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid supplier ID'),

        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Supplier name must be between 2 and 100 characters'),

        body('email')
            .optional()
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail()
    ]
};

// Purchase Order validation rules
const purchaseOrderValidation = {
    create: [
        body('supplier')
            .isMongoId()
            .withMessage('Invalid supplier ID'),

        body('items')
            .isArray({ min: 1 })
            .withMessage('At least one item is required'),

        body('items.*.product')
            .isMongoId()
            .withMessage('Invalid product ID'),

        body('items.*.quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be a positive integer'),

        body('items.*.costPrice')
            .isFloat({ min: 0 })
            .withMessage('Cost price must be a positive number'),

        body('items.*.expiryDate')
            .optional()
            .isISO8601()
            .withMessage('Expiry date must be a valid date')
            .custom((value) => {
                if (value && new Date(value) < new Date()) {
                    throw new Error('Expiry date cannot be in the past');
                }
                return true;
            }),

        body('expectedDeliveryDate')
            .optional()
            .isISO8601()
            .withMessage('Expected delivery date must be a valid date')
            .custom((value) => {
                if (new Date(value) < new Date()) {
                    throw new Error('Expected delivery date cannot be in the past');
                }
                return true;
            }),

        body('notes')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Notes cannot exceed 500 characters')
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid purchase order ID'),

        body('status')
            .optional()
            .isIn(['pending', 'approved', 'ordered', 'received', 'cancelled'])
            .withMessage('Invalid status')
    ],

    approve: [
        param('id').isMongoId().withMessage('Invalid purchase order ID')
    ]
};

// User validation rules
const userValidation = {
    register: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Name is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),

        body('email')
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

        body('role')
            .optional()
            .isIn(['admin', 'manager', 'employee', 'viewer'])
            .withMessage('Invalid role')
    ],

    login: [
        body('email')
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid user ID'),

        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),

        body('role')
            .optional()
            .isIn(['admin', 'manager', 'employee', 'viewer'])
            .withMessage('Invalid role')
    ]
};

// Stock Movement validation rules
const stockMovementValidation = {
    create: [
        body('product')
            .isMongoId()
            .withMessage('Invalid product ID'),

        body('movementType')
            .isIn(['purchase', 'sale', 'adjustment', 'return', 'damage', 'transfer', 'expired'])
            .withMessage('Invalid movement type'),

        body('quantity')
            .isInt()
            .withMessage('Quantity must be an integer')
            .custom((value) => {
                if (value === 0) {
                    throw new Error('Quantity cannot be zero');
                }
                return true;
            }),

        body('reason')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Reason cannot exceed 200 characters'),

        body('notes')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Notes cannot exceed 500 characters')
    ]
};

// Common query validation rules
const queryValidation = {
    pagination: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],

    dateRange: [
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be a valid ISO 8601 date'),

        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be a valid ISO 8601 date')
    ],

    search: [
        query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Search query must be between 1 and 100 characters')
    ]
};

// Brand validation rules
const brandValidation = {
    create: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Brand name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Brand name must be between 2 and 100 characters'),

        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),

        body('logo')
            .optional({ checkFalsy: true })
            .isURL()
            .withMessage('Logo must be a valid URL'),

        body('website')
            .optional({ checkFalsy: true })
            .isURL()
            .withMessage('Website must be a valid URL'),

        body('contactEmail')
            .optional({ checkFalsy: true })
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('contactPhone')
            .optional()
            .matches(/^[\+]?[1-9][\d]{0,15}$/)
            .withMessage('Please provide a valid phone number'),

        body('country')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Country name cannot exceed 50 characters'),

        body('foundedYear')
            .optional()
            .isInt({ min: 1800, max: new Date().getFullYear() })
            .withMessage('Founded year must be between 1800 and current year'),

        body('category')
            .optional()
            .isIn(['food-beverage', 'personal-care', 'household', 'electronics', 'clothing', 'automotive', 'pharmaceutical', 'other'])
            .withMessage('Invalid brand category')
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid brand ID'),

        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Brand name must be between 2 and 100 characters'),

        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),

        body('logo')
            .optional({ checkFalsy: true })
            .isURL()
            .withMessage('Logo must be a valid URL'),

        body('website')
            .optional({ checkFalsy: true })
            .isURL()
            .withMessage('Website must be a valid URL'),

        body('contactEmail')
            .optional({ checkFalsy: true })
            .isEmail()
            .withMessage('Please provide a valid email address')
            .normalizeEmail(),

        body('contactPhone')
            .optional()
            .matches(/^[\+]?[1-9][\d]{0,15}$/)
            .withMessage('Please provide a valid phone number'),

        body('category')
            .optional()
            .isIn(['food-beverage', 'personal-care', 'household', 'electronics', 'clothing', 'automotive', 'pharmaceutical', 'other'])
            .withMessage('Invalid brand category')
    ]
};

// Category validation rules
const categoryValidation = {
    create: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Category name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Category name must be between 2 and 100 characters'),

        body('slug')
            .optional()
            .trim()
            .matches(/^[a-z0-9-]+$/)
            .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),

        body('icon')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Icon name cannot exceed 50 characters'),

        body('color')
            .optional()
            .matches(/^#[0-9A-F]{6}$/i)
            .withMessage('Color must be a valid hex color code'),

        body('image')
            .optional()
            .isURL()
            .withMessage('Image must be a valid URL'),

        body('parentCategory')
            .optional()
            .isMongoId()
            .withMessage('Invalid parent category ID'),

        body('sortOrder')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Sort order must be a non-negative integer'),

        body('metaTitle')
            .optional()
            .trim()
            .isLength({ max: 60 })
            .withMessage('Meta title cannot exceed 60 characters'),

        body('metaDescription')
            .optional()
            .trim()
            .isLength({ max: 160 })
            .withMessage('Meta description cannot exceed 160 characters'),

        body('keywords')
            .optional()
            .isArray()
            .withMessage('Keywords must be an array')
    ],

    update: [
        param('id').isMongoId().withMessage('Invalid category ID'),

        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Category name must be between 2 and 100 characters'),

        body('slug')
            .optional()
            .trim()
            .matches(/^[a-z0-9-]+$/)
            .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

        body('description')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Description cannot exceed 500 characters'),

        body('icon')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Icon name cannot exceed 50 characters'),

        body('color')
            .optional()
            .matches(/^#[0-9A-F]{6}$/i)
            .withMessage('Color must be a valid hex color code'),

        body('image')
            .optional()
            .isURL()
            .withMessage('Image must be a valid URL'),

        body('parentCategory')
            .optional()
            .isMongoId()
            .withMessage('Invalid parent category ID'),

        body('sortOrder')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Sort order must be a non-negative integer')
    ]
};

module.exports = {
    productValidation,
    supplierValidation,
    purchaseOrderValidation,
    userValidation,
    stockMovementValidation,
    brandValidation,
    categoryValidation,
    queryValidation
};
