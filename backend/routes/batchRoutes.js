const express = require('express');
const router = express.Router();
const BatchService = require('../services/batchService');
const InventoryBatch = require('../models/InventoryBatch');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @route   GET /api/batches
 * @desc    Get all batches with filters
 * @access  Private
 */
router.get('/', protect, asyncHandler(async (req, res) => {
    const {
        status,
        product,
        expiringInDays,
        page = 1,
        limit = 50
    } = req.query;

    const query = {};

    if (status) {
        query.status = status;
    }

    if (product) {
        query.product = product;
    }

    // Find batches expiring within specified days
    if (expiringInDays) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(expiringInDays));
        query.expiryDate = {
            $gte: new Date(),
            $lte: futureDate
        };
        query.status = 'active';
        query.currentQuantity = { $gt: 0 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [batches, total] = await Promise.all([
        InventoryBatch.find(query)
            .populate('product', 'name sku barcode category')
            .populate('supplier', 'name code')
            .populate('purchaseOrder', 'orderNumber')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        InventoryBatch.countDocuments(query)
    ]);

    // Add computed fields
    const batchesWithDetails = batches.map(batch => ({
        ...batch,
        availableQuantity: batch.currentQuantity - (batch.reservedQuantity || 0),
        daysUntilExpiry: batch.expiryDate
            ? Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
        isExpired: batch.expiryDate && new Date() > new Date(batch.expiryDate),
        batchValue: batch.currentQuantity * batch.costPrice,
        profitMargin: ((batch.sellingPrice - batch.costPrice) / batch.sellingPrice * 100).toFixed(2)
    }));

    res.status(200).json({
        success: true,
        count: batches.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        data: batchesWithDetails
    });
}));

/**
 * @route   GET /api/batches/product/:productId
 * @desc    Get all batches for a specific product (supports product ID or barcode)
 * @access  Private
 */
router.get('/product/:productId', protect, asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const batchSummary = await BatchService.getBatchesByProduct(productId);

    res.status(200).json({
        success: true,
        data: batchSummary
    });
}));

/**
 * @route   GET /api/batches/expiring
 * @desc    Get batches expiring soon
 * @access  Private
 */
router.get('/expiring', protect, asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    const expiringBatches = await BatchService.getExpiringBatches(parseInt(days));

    res.status(200).json({
        success: true,
        count: expiringBatches.length,
        data: expiringBatches
    });
}));

/**
 * @route   GET /api/batches/valuation
 * @desc    Get inventory valuation report
 * @access  Private (Admin/Manager only)
 */
router.get('/valuation', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const valuation = await BatchService.getInventoryValuation();

    res.status(200).json({
        success: true,
        data: valuation
    });
}));

/**
 * @route   GET /api/batches/:id
 * @desc    Get batch details by ID or batch number
 * @access  Private
 */
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const batchDetails = await BatchService.getBatchDetails(id);

    res.status(200).json({
        success: true,
        data: batchDetails
    });
}));

/**
 * @route   POST /api/batches
 * @desc    Create a new batch
 * @access  Private (Admin/Manager only)
 */
router.post('/', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const {
        productId,
        quantity,
        costPrice,
        sellingPrice,
        mrp,
        purchaseOrderId,
        supplierId,
        expiryDate,
        manufactureDate,
        location,
        notes
    } = req.body;

    // Validation
    if (!productId || !quantity || !costPrice || !sellingPrice) {
        return res.status(400).json({
            success: false,
            message: 'Product ID, quantity, cost price, and selling price are required'
        });
    }

    if (quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Quantity must be greater than 0'
        });
    }

    if (costPrice < 0 || sellingPrice < 0) {
        return res.status(400).json({
            success: false,
            message: 'Prices cannot be negative'
        });
    }

    const batch = await BatchService.createBatch({
        productId,
        quantity,
        costPrice,
        sellingPrice,
        mrp,
        purchaseOrderId,
        supplierId,
        expiryDate,
        manufactureDate,
        location,
        notes,
        createdBy: req.user._id
    });

    res.status(201).json({
        success: true,
        message: 'Batch created successfully',
        data: batch
    });
}));

/**
 * @route   POST /api/batches/sale
 * @desc    Process sale using FIFO method
 * @access  Private
 */
router.post('/sale', protect, asyncHandler(async (req, res) => {
    const {
        productId,
        quantity,
        referenceNumber,
        notes
    } = req.body;

    // Validation
    if (!productId || !quantity) {
        return res.status(400).json({
            success: false,
            message: 'Product ID and quantity are required'
        });
    }

    if (quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Quantity must be greater than 0'
        });
    }

    const result = await BatchService.processSaleFIFO(
        productId,
        quantity,
        req.user._id,
        { referenceNumber, notes }
    );

    res.status(200).json({
        success: true,
        message: 'Sale processed successfully using FIFO method',
        data: result
    });
}));

/**
 * @route   PATCH /api/batches/:id/status
 * @desc    Update batch status (expired, damaged, returned)
 * @access  Private (Admin/Manager only)
 */
router.patch('/:id/status', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    // Validation
    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    if (!['expired', 'damaged', 'returned', 'active'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be one of: expired, damaged, returned, active'
        });
    }

    const batch = await BatchService.updateBatchStatus(
        id,
        status,
        req.user._id,
        reason
    );

    res.status(200).json({
        success: true,
        message: `Batch status updated to ${status}`,
        data: batch
    });
}));

/**
 * @route   PATCH /api/batches/:id/adjust
 * @desc    Adjust batch quantity
 * @access  Private (Admin/Manager only)
 */
router.patch('/:id/adjust', protect, authorize('admin', 'manager'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    // Validation
    if (quantity === undefined || quantity === null) {
        return res.status(400).json({
            success: false,
            message: 'Quantity adjustment is required'
        });
    }

    if (quantity === 0) {
        return res.status(400).json({
            success: false,
            message: 'Quantity adjustment cannot be zero'
        });
    }

    const batch = await BatchService.adjustBatchQuantity(
        id,
        quantity,
        req.user._id,
        reason || 'Manual adjustment'
    );

    res.status(200).json({
        success: true,
        message: 'Batch quantity adjusted successfully',
        data: batch
    });
}));

/**
 * @route   DELETE /api/batches/:id
 * @desc    Delete a batch (soft delete - mark as inactive)
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const batch = await InventoryBatch.findById(id);

    if (!batch) {
        return res.status(404).json({
            success: false,
            message: 'Batch not found'
        });
    }

    // Only allow deletion if batch is depleted or has zero quantity
    if (batch.currentQuantity > 0) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete batch with remaining quantity. Adjust quantity to zero first.'
        });
    }

    batch.status = 'depleted';
    await batch.save();

    res.status(200).json({
        success: true,
        message: 'Batch marked as depleted',
        data: batch
    });
}));

module.exports = router;
