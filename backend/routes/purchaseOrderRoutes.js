const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryService = require('../services/inventoryService');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination, validateDateRange } = require('../middleware/validation');
const { purchaseOrderValidation } = require('../middleware/validators');
const { purchaseOrderLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting - temporarily disabled for testing
// router.use(purchaseOrderLimiter);

// @desc    Get all purchase orders with pagination and filters
// @route   GET /api/v1/purchase-orders
// @access  Private (requires read_purchase_orders permission)
router.get('/',
    protect,
    requirePermission('read_purchase_orders'),
    validatePagination,
    validateDateRange('orderDate', 'expectedDeliveryDate'),
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { status, supplier, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (supplier) {
            filter.supplier = supplier;
        }

        // Add date filters if provided
        if (req.query.orderDate || req.query.expectedDeliveryDate) {
            if (req.query.orderDate) {
                filter.orderDate = req.query.orderDate;
            }
            if (req.query.expectedDeliveryDate) {
                filter.expectedDeliveryDate = req.query.expectedDeliveryDate;
            }
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const [purchaseOrders, total] = await Promise.all([
            PurchaseOrder.find(filter)
                .populate('supplier', 'name code email')
                .populate('createdBy', 'name email')
                .populate('approvedBy', 'name email')
                .populate('items.product', 'name sku category')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            PurchaseOrder.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: purchaseOrders
        });
    })
);

// @desc    Get single purchase order
// @route   GET /api/v1/purchase-orders/:id
// @access  Private (requires read_purchase_orders permission)
router.get('/:id',
    protect,
    requirePermission('read_purchase_orders'),
    asyncHandler(async (req, res) => {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id)
            .populate('supplier', 'name code email phone address')
            .populate('createdBy', 'name email')
            .populate('approvedBy', 'name email')
            .populate('items.product', 'name sku category currentStock');

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: purchaseOrder
        });
    })
);

// @desc    Get purchase order statistics
// @route   GET /api/v1/purchase-orders/statistics
// @access  Private (requires read_purchase_orders permission)
router.get('/statistics',
    protect,
    requirePermission('read_purchase_orders'),
    asyncHandler(async (req, res) => {
        const statistics = await PurchaseOrder.getStatistics();

        res.status(200).json({
            success: true,
            data: statistics[0] || {
                statusBreakdown: [],
                totalOrders: 0,
                totalValue: 0
            }
        });
    })
);

// @desc    Get pending purchase orders
// @route   GET /api/v1/purchase-orders/pending
// @access  Private (requires read_purchase_orders permission)
router.get('/pending',
    protect,
    requirePermission('read_purchase_orders'),
    asyncHandler(async (req, res) => {
        const purchaseOrders = await PurchaseOrder.findPending();

        res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            data: purchaseOrders
        });
    })
);

// @desc    Get overdue purchase orders
// @route   GET /api/v1/purchase-orders/overdue
// @access  Private (requires read_purchase_orders permission)
router.get('/overdue',
    protect,
    requirePermission('read_purchase_orders'),
    asyncHandler(async (req, res) => {
        const purchaseOrders = await PurchaseOrder.findOverdue();

        res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            data: purchaseOrders
        });
    })
);

// @desc    Get monthly purchase orders
// @route   GET /api/v1/purchase-orders/monthly/:year/:month
// @access  Private (requires read_purchase_orders permission)
router.get('/monthly/:year/:month',
    protect,
    requirePermission('read_purchase_orders'),
    asyncHandler(async (req, res) => {
        const { year, month } = req.params;
        const purchaseOrders = await PurchaseOrder.getMonthlyOrders(parseInt(year), parseInt(month));

        res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            data: purchaseOrders
        });
    })
);

// @desc    Create new purchase order
// @route   POST /api/v1/purchase-orders
// @access  Private (requires write_purchase_orders permission)
router.post('/',
    protect,
    requirePermission('write_purchase_orders'),
    validateRequest(purchaseOrderValidation.create),
    asyncHandler(async (req, res) => {
        // Set createdBy to current user
        req.body.createdBy = req.user._id;

        const purchaseOrder = await PurchaseOrder.create(req.body);

        // Populate the created purchase order
        await purchaseOrder.populate([
            { path: 'supplier', select: 'name code email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'items.product', select: 'name sku category' }
        ]);

        res.status(201).json({
            success: true,
            data: purchaseOrder
        });
    })
);

// @desc    Update purchase order
// @route   PUT /api/v1/purchase-orders/:id
// @access  Private (requires write_purchase_orders permission)
router.put('/:id',
    protect,
    requirePermission('write_purchase_orders'),
    validateRequest(purchaseOrderValidation.update),
    asyncHandler(async (req, res) => {
        const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        )
            .populate('supplier', 'name code email')
            .populate('createdBy', 'name email')
            .populate('items.product', 'name sku category');

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: purchaseOrder
        });
    })
);

// @desc    Approve purchase order
// @route   PATCH /api/v1/purchase-orders/:id/approve
// @access  Private (requires approve_purchase_orders permission)
router.patch('/:id/approve',
    protect,
    requirePermission('approve_purchase_orders'),
    validateRequest(purchaseOrderValidation.approve),
    asyncHandler(async (req, res) => {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        await purchaseOrder.approve(req.user._id);

        // Populate the approved purchase order
        await purchaseOrder.populate([
            { path: 'supplier', select: 'name code email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'approvedBy', select: 'name email' },
            { path: 'items.product', select: 'name sku category' }
        ]);

        res.status(200).json({
            success: true,
            message: 'Purchase order approved successfully',
            data: purchaseOrder
        });
    })
);

// @desc    Mark purchase order as received
// @route   PATCH /api/v1/purchase-orders/:id/receive
// @access  Private (requires write_purchase_orders permission)
router.patch('/:id/receive',
    protect,
    requirePermission('write_purchase_orders'),
    asyncHandler(async (req, res) => {
        const { receivedItems } = req.body;

        if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Received items array is required'
            });
        }

        const purchaseOrder = await PurchaseOrder.findById(req.params.id);
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        // Process the received items through inventory service
        const results = await InventoryService.processPurchaseReceipt(
            req.params.id,
            receivedItems,
            req.user._id
        );

        // Mark purchase order as received
        await purchaseOrder.markAsReceived();

        res.status(200).json({
            success: true,
            message: 'Purchase order received successfully',
            data: {
                purchaseOrder,
                stockMovements: results
            }
        });
    })
);

// @desc    Cancel purchase order
// @route   PATCH /api/v1/purchase-orders/:id/cancel
// @access  Private (requires write_purchase_orders permission)
router.patch('/:id/cancel',
    protect,
    requirePermission('write_purchase_orders'),
    asyncHandler(async (req, res) => {
        const { reason } = req.body;

        const purchaseOrder = await PurchaseOrder.findById(req.params.id);
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        await purchaseOrder.cancel(reason);

        res.status(200).json({
            success: true,
            message: 'Purchase order cancelled successfully',
            data: purchaseOrder
        });
    })
);

// @desc    Delete purchase order
// @route   DELETE /api/v1/purchase-orders/:id
// @access  Private (requires write_purchase_orders permission)
router.delete('/:id',
    protect,
    requirePermission('write_purchase_orders'),
    asyncHandler(async (req, res) => {
        const purchaseOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Purchase order deleted successfully'
        });
    })
);

module.exports = router;
