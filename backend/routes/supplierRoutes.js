const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination } = require('../middleware/validation');
const { supplierValidation } = require('../middleware/validators');

// @desc    Get all suppliers with pagination and filters
// @route   GET /api/v1/suppliers
// @access  Private (requires read_suppliers permission)
router.get('/',
    protect,
    requirePermission('read_suppliers'),
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { search, isActive, city, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (city) {
            filter['address.city'] = { $regex: city, $options: 'i' };
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const [suppliers, total] = await Promise.all([
            Supplier.find(filter)
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Supplier.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: suppliers.length,
            total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: suppliers
        });
    })
);

// @desc    Get supplier statistics
// @route   GET /api/v1/suppliers/statistics
// @access  Private (requires read_suppliers permission)
router.get('/statistics',
    protect,
    requirePermission('read_suppliers'),
    asyncHandler(async (req, res) => {
        const statistics = await Supplier.getStatistics();

        res.status(200).json({
            success: true,
            data: statistics[0] || {
                totalSuppliers: 0,
                averageRating: 0,
                totalOrders: 0,
                totalAmount: 0,
                topSupplier: null
            }
        });
    })
);

// @desc    Get top rated suppliers
// @route   GET /api/v1/suppliers/top-rated
// @access  Private (requires read_suppliers permission)
router.get('/top-rated',
    protect,
    requirePermission('read_suppliers'),
    asyncHandler(async (req, res) => {
        const { limit = 10 } = req.query;
        const suppliers = await Supplier.getTopRated(parseInt(limit));

        res.status(200).json({
            success: true,
            count: suppliers.length,
            data: suppliers
        });
    })
);

// @desc    Get suppliers by city
// @route   GET /api/v1/suppliers/by-city/:city
// @access  Private (requires read_suppliers permission)
router.get('/by-city/:city',
    protect,
    requirePermission('read_suppliers'),
    asyncHandler(async (req, res) => {
        const { city } = req.params;
        const suppliers = await Supplier.findByCity(city);

        res.status(200).json({
            success: true,
            count: suppliers.length,
            data: suppliers
        });
    })
);

// @desc    Get single supplier
// @route   GET /api/v1/suppliers/:id
// @access  Private (requires read_suppliers permission)
router.get('/:id',
    protect,
    requirePermission('read_suppliers'),
    asyncHandler(async (req, res) => {
        const supplier = await Supplier.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            success: true,
            data: supplier
        });
    })
);

// @desc    Create new supplier
// @route   POST /api/v1/suppliers
// @access  Private (requires write_suppliers permission)
router.post('/',
    protect,
    requirePermission('write_suppliers'),
    validateRequest(supplierValidation.create),
    asyncHandler(async (req, res) => {
        // Set createdBy to current user
        req.body.createdBy = req.user._id;

        const supplier = await Supplier.create(req.body);

        res.status(201).json({
            success: true,
            data: supplier
        });
    })
);

// @desc    Update supplier
// @route   PUT /api/v1/suppliers/:id
// @access  Private (requires write_suppliers permission)
router.put('/:id',
    protect,
    requirePermission('write_suppliers'),
    validateRequest(supplierValidation.update),
    asyncHandler(async (req, res) => {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            success: true,
            data: supplier
        });
    })
);

// @desc    Update supplier rating
// @route   PATCH /api/v1/suppliers/:id/rating
// @access  Private (requires write_suppliers permission)
router.patch('/:id/rating',
    protect,
    requirePermission('write_suppliers'),
    asyncHandler(async (req, res) => {
        const { rating } = req.body;

        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a number between 1 and 5'
            });
        }

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        await supplier.updateRating(rating);

        res.status(200).json({
            success: true,
            message: 'Supplier rating updated successfully',
            data: supplier
        });
    })
);

// @desc    Update supplier statistics
// @route   PATCH /api/v1/suppliers/:id/stats
// @access  Private (requires write_suppliers permission)
router.patch('/:id/stats',
    protect,
    requirePermission('write_suppliers'),
    asyncHandler(async (req, res) => {
        const { orderAmount } = req.body;

        if (typeof orderAmount !== 'number' || orderAmount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Order amount must be a positive number'
            });
        }

        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        await supplier.updateStats(orderAmount);

        res.status(200).json({
            success: true,
            message: 'Supplier statistics updated successfully',
            data: supplier
        });
    })
);

// @desc    Soft delete supplier
// @route   DELETE /api/v1/suppliers/:id
// @access  Private (requires delete_suppliers permission)
router.delete('/:id',
    protect,
    requirePermission('delete_suppliers'),
    asyncHandler(async (req, res) => {
        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Supplier deactivated successfully'
        });
    })
);

// @desc    Hard delete supplier
// @route   DELETE /api/v1/suppliers/:id/force
// @access  Private (requires admin role)
router.delete('/:id/force',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Supplier permanently deleted'
        });
    })
);

module.exports = router;
