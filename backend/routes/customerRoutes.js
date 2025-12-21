const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');

// @desc    Get all customers with pagination
// @route   GET /api/v1/customers
// @access  Private (requires read_customers permission)
router.get('/',
    protect,
    requirePermission('read_customers'),
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
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { customerNumber: { $regex: search, $options: 'i' } }
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

// @desc    Get customer by ID
// @route   GET /api/v1/customers/:id
// @access  Private (requires read_customers permission)
router.get('/:id',
    protect,
    requirePermission('read_customers'),
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

