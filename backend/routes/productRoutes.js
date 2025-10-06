const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Product = require('../models/Product');
const InventoryService = require('../services/inventoryService');
const PricingService = require('../services/pricingService');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { validateRequest, validatePagination, validateDateRange } = require('../middleware/validation');
const { productValidation, queryValidation } = require('../middleware/validators');
const { productLimiter, searchLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting - temporarily disabled for testing
// router.use(productLimiter);

// @desc    Get all products with pagination and filters
// @route   GET /api/v1/products
// @access  Private (requires read_products permission)
router.get('/',
    protect,
    requirePermission('read_products'),
    validatePagination,
    validateDateRange('createdAt', 'updatedAt'),
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { category, search, isActive, lowStock, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (lowStock === 'true') {
            filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: products
        });
    })
);

// @desc    Search products
// @route   GET /api/v1/products/search
// @access  Private (requires read_products permission)
router.get('/search',
    protect,
    requirePermission('read_products'),
    // searchLimiter, // temporarily disabled for testing
    validateRequest(queryValidation.search),
    asyncHandler(async (req, res) => {
        const { search, limit = 20 } = req.query;

        const products = await Product.find({
            $text: { $search: search },
            isActive: true
        }, {
            score: { $meta: 'textScore' }
        })
            .sort({ score: { $meta: 'textScore' } })
            .limit(parseInt(limit))
            .select('name sku barcode category currentStock sellingPrice');

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    })
);

// @desc    Get all categories
// @route   GET /api/v1/products/categories
// @access  Private (requires read_products permission)
router.get('/categories',
    protect,
    requirePermission('read_products'),
    asyncHandler(async (req, res) => {
        const categories = await Product.getCategories();

        res.status(200).json({
            success: true,
            data: categories
        });
    })
);

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Private (requires read_inventory permission)
router.get('/low-stock',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const products = await InventoryService.getLowStockAlerts();

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    })
);

// @desc    Get inventory summary
// @route   GET /api/v1/products/inventory-summary
// @access  Private (requires read_inventory permission)
router.get('/inventory-summary',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const summary = await InventoryService.getInventorySummary();

        res.status(200).json({
            success: true,
            data: summary
        });
    })
);

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private (requires read_products permission)
router.get('/:id',
    protect,
    requirePermission('read_products'),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    })
);

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (requires write_products permission)
router.post('/',
    protect,
    requirePermission('write_products'),
    validateRequest(productValidation.create),
    asyncHandler(async (req, res) => {
        try {
            console.log('Creating product with data:', JSON.stringify(req.body, null, 2));

            // Set createdBy to current user
            req.body.createdBy = req.user._id;

            const product = await Product.create(req.body);

            console.log('Product created successfully:', product._id);

            res.status(201).json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    })
);

// @desc    Bulk create products
// @route   POST /api/v1/products/bulk
// @access  Private (requires write_products permission)
router.post('/bulk',
    protect,
    requirePermission('write_products'),
    asyncHandler(async (req, res) => {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Products array is required and cannot be empty'
            });
        }

        // Set createdBy for all products
        products.forEach(product => {
            product.createdBy = req.user._id;
        });

        const createdProducts = await Product.insertMany(products, { ordered: false });

        res.status(201).json({
            success: true,
            count: createdProducts.length,
            data: createdProducts
        });
    })
);

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (requires write_products permission)
router.put('/:id',
    protect,
    requirePermission('write_products'),
    validateRequest(productValidation.update),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    })
);

// @desc    Update product stock
// @route   PATCH /api/v1/products/:id/stock
// @access  Private (requires write_inventory permission)
router.patch('/:id/stock',
    protect,
    requirePermission('write_inventory'),
    validateRequest(productValidation.stockUpdate),
    asyncHandler(async (req, res) => {
        const { quantity, movementType, reason, notes } = req.body;

        const result = await InventoryService.updateStock(
            req.params.id,
            quantity,
            movementType,
            {
                reason,
                notes,
                createdBy: req.user._id
            }
        );

        res.status(200).json({
            success: true,
            message: 'Stock updated successfully',
            data: {
                product: result.product,
                stockMovement: result.stockMovement
            }
        });
    })
);

// @desc    Get product stock history
// @route   GET /api/v1/products/:id/stock-history
// @access  Private (requires read_inventory permission)
router.get('/:id/stock-history',
    protect,
    requirePermission('read_inventory'),
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { movementType, startDate, endDate } = req.query;

        const result = await InventoryService.getProductStockHistory(
            req.params.id,
            {
                limit,
                skip,
                movementType,
                startDate,
                endDate
            }
        );

        res.status(200).json({
            success: true,
            data: result.movements,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(result.total / limit),
                hasNext: page < Math.ceil(result.total / limit),
                hasPrev: page > 1,
                limit,
                total: result.total
            }
        });
    })
);

// @desc    Soft delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (requires delete_products permission)
router.delete('/:id',
    protect,
    requirePermission('delete_products'),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deactivated successfully'
        });
    })
);

// @desc    Hard delete product
// @route   DELETE /api/v1/products/:id/force
// @access  Private (requires admin role)
router.delete('/:id/force',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product permanently deleted'
        });
    })
);

module.exports = router;