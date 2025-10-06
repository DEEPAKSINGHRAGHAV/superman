const express = require('express');
const router = express.Router();
const StockMovement = require('../models/StockMovement');
const InventoryService = require('../services/inventoryService');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination, validateDateRange } = require('../middleware/validation');
const { stockMovementValidation } = require('../middleware/validators');
const { inventoryLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting - temporarily disabled for testing
// router.use(inventoryLimiter);

// @desc    Get stock movements with pagination and filters
// @route   GET /api/v1/inventory/movements
// @access  Private (requires read_inventory permission)
router.get('/movements',
    protect,
    requirePermission('read_inventory'),
    validatePagination,
    validateDateRange('startDate', 'endDate'),
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { product, movementType, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        if (product) {
            filter.product = product;
        }

        if (movementType) {
            filter.movementType = movementType;
        }

        // Add date filters if provided
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = startDate;
            if (endDate) filter.createdAt.$lte = endDate;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const [movements, total] = await Promise.all([
            StockMovement.find(filter)
                .populate('product', 'name sku category')
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            StockMovement.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: movements.length,
            total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: movements
        });
    })
);

// @desc    Get stock movement by ID
// @route   GET /api/v1/inventory/movements/:id
// @access  Private (requires read_inventory permission)
router.get('/movements/:id',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const movement = await StockMovement.findById(req.params.id)
            .populate('product', 'name sku category')
            .populate('createdBy', 'name email');

        if (!movement) {
            return res.status(404).json({
                success: false,
                message: 'Stock movement not found'
            });
        }

        res.status(200).json({
            success: true,
            data: movement
        });
    })
);

// @desc    Get daily stock summary
// @route   GET /api/v1/inventory/daily-summary
// @access  Private (requires read_inventory permission)
router.get('/daily-summary',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        const summary = await InventoryService.getDailyStockSummary(targetDate);

        res.status(200).json({
            success: true,
            data: summary
        });
    })
);

// @desc    Get category-wise inventory summary
// @route   GET /api/v1/inventory/category-summary
// @access  Private (requires read_inventory permission)
router.get('/category-summary',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const summary = await InventoryService.getCategoryWiseSummary();

        res.status(200).json({
            success: true,
            data: summary
        });
    })
);

// @desc    Get low stock alerts
// @route   GET /api/v1/inventory/low-stock
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

// @desc    Get expiring products
// @route   GET /api/v1/inventory/expiring
// @access  Private (requires read_inventory permission)
router.get('/expiring',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const { daysAhead = 30 } = req.query;
        const products = await InventoryService.getExpiringProducts(parseInt(daysAhead));

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    })
);

// @desc    Get product stock history
// @route   GET /api/v1/inventory/products/:productId/history
// @access  Private (requires read_inventory permission)
router.get('/products/:productId/history',
    protect,
    requirePermission('read_inventory'),
    validatePagination,
    asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { page, limit, skip } = req.pagination;
        const { movementType, startDate, endDate } = req.query;

        const result = await InventoryService.getProductStockHistory(
            productId,
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

// @desc    Create stock movement
// @route   POST /api/v1/inventory/movements
// @access  Private (requires write_inventory permission)
router.post('/movements',
    protect,
    requirePermission('write_inventory'),
    validateRequest(stockMovementValidation.create),
    asyncHandler(async (req, res) => {
        const { product, movementType, quantity, reason, notes, unitCost } = req.body;

        const result = await InventoryService.updateStock(
            product,
            quantity,
            movementType,
            {
                reason,
                notes,
                unitCost,
                createdBy: req.user._id
            }
        );

        res.status(201).json({
            success: true,
            message: 'Stock movement created successfully',
            data: {
                product: result.product,
                stockMovement: result.stockMovement
            }
        });
    })
);

// @desc    Process stock adjustment
// @route   POST /api/v1/inventory/adjustments
// @access  Private (requires adjust_inventory permission)
router.post('/adjustments',
    protect,
    requirePermission('adjust_inventory'),
    asyncHandler(async (req, res) => {
        const { adjustments, reason = 'Manual stock adjustment' } = req.body;

        if (!Array.isArray(adjustments) || adjustments.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Adjustments array is required and cannot be empty'
            });
        }

        // Validate each adjustment
        for (const adjustment of adjustments) {
            if (!adjustment.productId || typeof adjustment.quantity !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'Each adjustment must have productId and quantity'
                });
            }
        }

        const results = await InventoryService.processStockAdjustment(
            adjustments,
            req.user._id,
            reason
        );

        res.status(201).json({
            success: true,
            message: 'Stock adjustments processed successfully',
            data: results
        });
    })
);

// @desc    Process sale/consumption
// @route   POST /api/v1/inventory/sales
// @access  Private (requires write_inventory permission)
router.post('/sales',
    protect,
    requirePermission('write_inventory'),
    asyncHandler(async (req, res) => {
        const { saleItems, referenceNumber = '' } = req.body;

        if (!Array.isArray(saleItems) || saleItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sale items array is required and cannot be empty'
            });
        }

        // Validate each sale item
        for (const item of saleItems) {
            if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Each sale item must have productId and positive quantity'
                });
            }
        }

        const results = await InventoryService.processSale(
            saleItems,
            req.user._id,
            referenceNumber
        );

        res.status(201).json({
            success: true,
            message: 'Sales processed successfully',
            data: results
        });
    })
);

// @desc    Get inventory analytics
// @route   GET /api/v1/inventory/analytics
// @access  Private (requires read_reports permission)
router.get('/analytics',
    protect,
    requirePermission('read_reports'),
    asyncHandler(async (req, res) => {
        const { period = '30' } = req.query;
        const days = parseInt(period);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [
            inventorySummary,
            categorySummary,
            lowStockCount,
            expiringCount
        ] = await Promise.all([
            InventoryService.getInventorySummary(),
            InventoryService.getCategoryWiseSummary(),
            InventoryService.getLowStockAlerts(),
            InventoryService.getExpiringProducts(30)
        ]);

        const analytics = {
            inventorySummary,
            categorySummary,
            alerts: {
                lowStock: lowStockCount.length,
                expiring: expiringCount.length
            },
            period: `${days} days`,
            generatedAt: new Date()
        };

        res.status(200).json({
            success: true,
            data: analytics
        });
    })
);

module.exports = router;
