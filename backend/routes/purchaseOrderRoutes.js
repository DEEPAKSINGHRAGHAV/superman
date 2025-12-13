const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const BatchService = require('../services/batchService');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination, validateDateRange } = require('../middleware/validation');
const { purchaseOrderValidation } = require('../middleware/validators');
const { purchaseOrderLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting - Industry standard limits
router.use(purchaseOrderLimiter);

// Helper function to clean up batches on failure
async function cleanupFailedBatches(purchaseOrder, createdBatches) {
    // 1. Rollback PO status to original
    await PurchaseOrder.findByIdAndUpdate(
        purchaseOrder._id,
        { $set: { status: purchaseOrder.status } }
    );

    // 2. Delete any batches that were created for this PO
    if (createdBatches.length > 0) {
        const batchIds = createdBatches.map(b => b._id);
        
        // Get batches to rollback stock
        const batchesToDelete = await InventoryBatch.find({
            _id: { $in: batchIds }
        });

        // Rollback product stock for each batch
        for (const batch of batchesToDelete) {
            await Product.findByIdAndUpdate(
                batch.product,
                { 
                    $inc: { currentStock: -batch.currentQuantity }
                }
            );
        }

        // Delete stock movements for these batches
        const batchNumbers = batchesToDelete.map(b => b.batchNumber);
        await StockMovement.deleteMany({
            referenceId: purchaseOrder._id,
            referenceType: 'purchase_order',
            batchNumber: { $in: batchNumbers }
        });

        // Delete the batches
        await InventoryBatch.deleteMany({
            _id: { $in: batchIds }
        });
    }
}

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
        const { status, supplier, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (supplier) {
            filter.supplier = supplier;
        }

        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } }
            ];
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
        // First check if the order exists and its status
        const existingOrder = await PurchaseOrder.findById(req.params.id);
        
        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }

        // Prevent updates to received orders
        if (existingOrder.status === 'received') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update a received purchase order'
            });
        }

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

// @desc    Mark purchase order as received (creates inventory batches)
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

        // OPTIMISTIC LOCKING: Atomically update status ONLY if it's 'approved' or 'ordered'
        // This prevents duplicate receives - if status is already 'received', update returns null
        const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
            {
                _id: req.params.id,
                status: { $in: ['approved', 'ordered'] } // Only update if in these states
            },
            {
                $set: {
                    status: 'received',
                    actualDeliveryDate: new Date()
                }
            },
            {
                new: false, // Return original document
                runValidators: false // Skip validators for performance
            }
        ).populate('supplier');

        // If no document was found or updated, check why
        if (!purchaseOrder) {
            // Check if it exists at all
            const exists = await PurchaseOrder.findById(req.params.id);
            if (!exists) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase order not found'
                });
            }

            // It exists but query didn't match - must be already received or wrong state
            const currentPO = exists;
            if (currentPO.status === 'received') {
                return res.status(400).json({
                    success: false,
                    message: 'This purchase order has already been received. Duplicate receives are not allowed.'
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Purchase order must be approved or ordered before it can be received'
            });
        }

        // Now that we have the lock, create batches
        // If we fail here, the PO is already marked as 'received', so no duplicates possible
        const createdBatches = [];

        try {
            for (const receivedItem of receivedItems) {
                const { productId, quantity, costPrice, sellingPrice, expiryDate, manufactureDate, notes } = receivedItem;

                // Find the item in the purchase order
                const poItem = purchaseOrder.items.find(item =>
                    item.product.toString() === productId.toString()
                );

                if (!poItem) {
                    // Rollback everything if validation fails
                    await cleanupFailedBatches(purchaseOrder, createdBatches);

                    return res.status(400).json({
                        success: false,
                        message: `Product ${productId} not found in purchase order`
                    });
                }

                // Create a batch for this received item (no session needed)
                const batch = await BatchService.createBatch({
                    productId,
                    quantity,
                    costPrice: costPrice || poItem.costPrice,
                    sellingPrice: sellingPrice || poItem.sellingPrice || poItem.costPrice * 1.2,
                    purchaseOrderId: purchaseOrder._id,
                    supplierId: purchaseOrder.supplier._id,
                    expiryDate: expiryDate || poItem.expiryDate,
                    manufactureDate,
                    notes: notes || `Received from PO ${purchaseOrder.orderNumber}`,
                    createdBy: req.user._id
                });

                createdBatches.push(batch);
            }

            // Refetch the purchase order to get the updated version
            const updatedPurchaseOrder = await PurchaseOrder.findById(req.params.id)
                .populate('createdBy', 'name email')
                .populate('items.product', 'name sku category');

            res.status(200).json({
                success: true,
                message: `Purchase order received successfully. ${createdBatches.length} batch(es) created.`,
                data: {
                    purchaseOrder: updatedPurchaseOrder,
                    batches: createdBatches,
                    batchCount: createdBatches.length
                }
            });

        } catch (error) {
            // If batch creation fails, rollback everything
            try {
                await cleanupFailedBatches(purchaseOrder, createdBatches);
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError);
                // Continue to throw original error even if rollback fails
            }
            
            // Re-throw the original error to be handled by asyncHandler
            throw error;
        }
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
