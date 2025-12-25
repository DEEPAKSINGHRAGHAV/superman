const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');
const { customerAnalyticsLimiter, customerLimiter } = require('../middleware/rateLimiter');
const { customerValidation } = require('../middleware/validators');
const {
    MAX_PAGE_SIZE,
    DEFAULT_PAGE_SIZE,
    DEFAULT_BILLS_PAGE_SIZE,
    MAX_SEARCH_LENGTH
} = require('../constants/customerConstants');

// @desc    Get all customers with pagination
// @route   GET /api/v1/customers
// @access  Private (requires read_customers permission)
router.get('/',
    protect,
    requirePermission('read_customers'),
    customerLimiter,
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { search, phone, isActive } = req.query;

        // Build filter object
        const filter = {};

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        // Search by name, phone, or customer number
        // CRITICAL: Escape regex special characters to prevent ReDoS attacks
        if (search) {
            // Limit search length to prevent DoS
            const searchTerm = search.trim().substring(0, MAX_SEARCH_LENGTH);
            
            // Escape special regex characters for security
            const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            filter.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { phone: { $regex: escapedSearch, $options: 'i' } },
                { customerNumber: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        // Filter by phone if provided
        if (phone) {
            filter.phone = phone;
        }

        // Execute query with pagination
        const [customers, total] = await Promise.all([
            Customer.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Customer.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: customers.length,
            total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: customers
        });
    })
);

// @desc    Get customer analytics with bills, revenue, profit, top items
// @route   GET /api/v1/customers/:id/analytics
// @access  Private (requires read_customers permission)
router.get('/:id/analytics',
    protect,
    requirePermission('read_customers'),
    customerAnalyticsLimiter,
    validateRequest(customerValidation.id),
    asyncHandler(async (req, res) => {

        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Optimize bill filter - prefer direct customer ID lookup
        const billFilter = customer.phone
            ? {
                $or: [
                    { customer: customer._id },
                    { customerPhone: customer.phone }
                ]
            }
            : { customer: customer._id };

        // Validate and sanitize pagination parameters
        // Use DEFAULT_BILLS_PAGE_SIZE (50) for bills pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit) || DEFAULT_BILLS_PAGE_SIZE));
        const skip = (page - 1) * limit;

        // Parallelize all database operations for better performance
        const [bills, totalBills, analytics, topItems, paymentMethodBreakdown, monthlyTrend] = await Promise.all([
            // Get paginated bills
            Bill.find(billFilter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('cashier', 'name email')
                .lean(),
            // Count total bills
            Bill.countDocuments(billFilter),
            // Calculate analytics using aggregation
            Bill.aggregate([
                { $match: billFilter },
                {
                    $group: {
                        _id: null,
                        totalBills: { $sum: 1 },
                        totalRevenue: { $sum: '$totalAmount' },
                        totalCost: { $sum: '$totalCost' },
                        totalProfit: { $sum: '$profit' },
                        totalItems: { $sum: { $sum: '$items.quantity' } },
                        averageBillValue: { $avg: '$totalAmount' },
                        averageProfitMargin: { $avg: '$profitMargin' },
                        firstPurchaseDate: { $min: '$createdAt' },
                        lastPurchaseDate: { $max: '$createdAt' }
                    }
                }
            ]),
            // Get top 10 most bought items
            // OPTIMIZATION: Limit to recent 2000 bills before unwind to improve performance
            // This prevents processing thousands of old bills for customers with long history
            Bill.aggregate([
                { $match: billFilter },
                { $sort: { createdAt: -1 } },
                { $limit: 2000 }, // Process only recent 2000 bills for top items
                { $unwind: '$items' },
                {
                    $group: {
                        _id: {
                            product: '$items.product',
                            productName: '$items.productName',
                            productSku: '$items.productSku'
                        },
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: '$items.totalPrice' },
                        totalCost: { $sum: { $multiply: ['$items.costPrice', '$items.quantity'] } },
                        timesPurchased: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        product: '$_id.product',
                        productName: '$_id.productName',
                        productSku: '$_id.productSku',
                        totalQuantity: 1,
                        totalRevenue: 1,
                        totalCost: 1,
                        totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
                        timesPurchased: 1
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }
            ]),
            // Get payment method breakdown
            Bill.aggregate([
                { $match: billFilter },
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        paymentMethod: '$_id',
                        count: 1,
                        totalAmount: 1
                    }
                },
                { $sort: { totalAmount: -1 } }
            ]),
            // Get monthly revenue trend (last 12 months)
            Bill.aggregate([
                { $match: billFilter },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        revenue: { $sum: '$totalAmount' },
                        profit: { $sum: '$profit' },
                        bills: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 }
            ])
        ]);

        const analyticsData = analytics[0] || {
            totalBills: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalItems: 0,
            averageBillValue: 0,
            averageProfitMargin: 0,
            firstPurchaseDate: null,
            lastPurchaseDate: null
        };

        // Calculate profit margin
        const profitMargin = analyticsData.totalRevenue > 0
            ? ((analyticsData.totalProfit / analyticsData.totalRevenue) * 100).toFixed(2)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                customer: {
                    _id: customer._id,
                    customerNumber: customer.customerNumber,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.address,
                    notes: customer.notes,
                    isActive: customer.isActive,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt
                },
                analytics: {
                    ...analyticsData,
                    profitMargin: parseFloat(profitMargin)
                },
                topItems,
                paymentMethodBreakdown,
                monthlyTrend: monthlyTrend.map(item => ({
                    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                    revenue: item.revenue,
                    profit: item.profit,
                    bills: item.bills
                })),
                bills: {
                    data: bills,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(totalBills / limit),
                        totalBills,
                        hasNext: skip + bills.length < totalBills,
                        hasPrev: page > 1,
                        limit: limit
                    }
                }
            }
        });
    })
);

// @desc    Get customer by ID
// @route   GET /api/v1/customers/:id
// @access  Private (requires read_customers permission)
router.get('/:id',
    protect,
    requirePermission('read_customers'),
    customerLimiter,
    validateRequest(customerValidation.id),
    asyncHandler(async (req, res) => {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    })
);

// @desc    Find or create customer by phone
// @route   POST /api/v1/customers/find-or-create
// @access  Private (requires write_customers permission)
router.post('/find-or-create',
    protect,
    requirePermission('write_customers'),
    customerLimiter,
    validateRequest(customerValidation.findOrCreate),
    asyncHandler(async (req, res) => {
        const { phone, name, email, address, notes } = req.body;

        // Phone is optional, but if provided, must be valid
        if (!phone || !phone.trim()) {
            return res.status(200).json({
                success: true,
                message: 'No phone number provided',
                data: null
            });
        }

        // Find or create customer
        const customer = await Customer.findOrCreateByPhone(phone, {
            name,
            email,
            address,
            notes
        });

        if (!customer) {
            return res.status(200).json({
                success: true,
                message: 'No customer found',
                data: null
            });
        }

        res.status(200).json({
            success: true,
            message: customer.customerNumber.startsWith('CUST') && customer.createdAt > new Date(Date.now() - 5000)
                ? 'New customer created'
                : 'Customer found',
            data: customer
        });
    })
);

// @desc    Get customer by phone number
// @route   GET /api/v1/customers/phone/:phone
// @access  Private (requires read_customers permission)
router.get('/phone/:phone',
    protect,
    requirePermission('read_customers'),
    customerLimiter,
    validateRequest(customerValidation.phone),
    asyncHandler(async (req, res) => {
        const { phone } = req.params;
        
        // Normalize phone number
        const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        
        const customer = await Customer.findOne({ phone: normalizedPhone });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: customer
        });
    })
);

// @desc    Create new customer
// @route   POST /api/v1/customers
// @access  Private (requires write_customers permission)
router.post('/',
    protect,
    requirePermission('write_customers'),
    customerLimiter,
    validateRequest(customerValidation.create),
    asyncHandler(async (req, res) => {
        const { phone, name, email, address, notes } = req.body;

        // Phone and name are optional, but if phone is provided, it must be valid
        let normalizedPhone = null;
        if (phone && phone.trim()) {
            normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
            
            // Remove country code prefix if present (+91 or 91)
            if (normalizedPhone.startsWith('+91')) {
                normalizedPhone = normalizedPhone.substring(3);
            } else if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
                normalizedPhone = normalizedPhone.substring(2);
            }
            
            // Validate phone number (must be exactly 10 digits starting with 6-9)
            if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 10-digit Indian phone number'
                });
            }
            
            // Check if customer with phone already exists
            const existingCustomer = await Customer.findOne({ phone: normalizedPhone });
            if (existingCustomer) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer with this phone number already exists',
                    data: existingCustomer
                });
            }
        }

        // Generate customer number and create
        const customerNumber = await Customer.generateCustomerNumber();
        
        const customer = await Customer.create({
            customerNumber,
            phone: normalizedPhone,
            name: name && name.trim() ? name.trim() : 'Walk-in Customer',
            email,
            address,
            notes,
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: 'Customer created successfully',
            data: customer
        });
    })
);

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
// @access  Private (requires write_customers permission)
router.put('/:id',
    protect,
    requirePermission('write_customers'),
    customerLimiter,
    validateRequest([...customerValidation.id, ...customerValidation.update]),
    asyncHandler(async (req, res) => {
        const { name, email, address, notes, isActive } = req.body;

        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Update fields
        if (name !== undefined) customer.name = name;
        if (email !== undefined) customer.email = email;
        if (address !== undefined) customer.address = address;
        if (notes !== undefined) customer.notes = notes;
        if (isActive !== undefined) customer.isActive = isActive;

        await customer.save();

        res.status(200).json({
            success: true,
            message: 'Customer updated successfully',
            data: customer
        });
    })
);

// @desc    Delete customer (soft delete by setting isActive to false)
// @route   DELETE /api/v1/customers/:id
// @access  Private (requires write_customers permission)
router.delete('/:id',
    protect,
    requirePermission('write_customers'),
    customerLimiter,
    validateRequest(customerValidation.id),
    asyncHandler(async (req, res) => {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Soft delete
        customer.isActive = false;
        await customer.save();

        res.status(200).json({
            success: true,
            message: 'Customer deactivated successfully',
            data: customer
        });
    })
);

module.exports = router;

