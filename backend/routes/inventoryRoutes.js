const express = require('express');
const router = express.Router();
const StockMovement = require('../models/StockMovement');
const Bill = require('../models/Bill');
const InventoryService = require('../services/inventoryService');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission } = require('../middleware/auth');
const { validateRequest, validatePagination, validateDateRange } = require('../middleware/validation');
const { stockMovementValidation } = require('../middleware/validators');
const { inventoryLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting - Industry standard limits
router.use(inventoryLimiter);

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
        const {
            saleItems,
            referenceNumber = '',
            receiptData = null // Complete receipt data from frontend
        } = req.body;

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

        // Process the sale (updates inventory)
        const results = await InventoryService.processSale(
            saleItems,
            req.user._id,
            referenceNumber
        );

        // Save the complete receipt/bill data as it was shown to the customer
        if (receiptData) {
            try {
                // Calculate total cost from sale results (FIFO batch costs)
                const totalCost = results.reduce((sum, result) => sum + (result.totalCost || 0), 0);

                // Use actual billed amount as revenue (what customer was charged)
                const actualRevenue = receiptData.total || receiptData.subtotal || 0;

                // Calculate profit: actual revenue - actual cost
                const profit = actualRevenue - totalCost;
                const profitMargin = actualRevenue > 0 ? parseFloat(((profit / actualRevenue) * 100).toFixed(2)) : 0;

                // Map receipt items to bill items format
                // Note: results array corresponds to saleItems array in same order
                const billItems = receiptData.items.map((item, index) => {
                    const saleResult = results[index] || {};

                    return {
                        product: item.product._id || item.product,
                        productName: item.product.name || '',
                        productSku: item.product.sku || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice, // Exact price shown at billing
                        totalPrice: item.totalPrice, // Exact total shown at billing
                        costPrice: saleResult.averageCostPrice || item.costPrice || 0,
                        batchNumber: saleResult.batchesUsed?.[0]?.batchNumber || null
                    };
                });

                const bill = await Bill.create({
                    billNumber: receiptData.billNumber || referenceNumber,
                    items: billItems,
                    subtotal: receiptData.subtotal || 0,
                    taxAmount: receiptData.tax || 0,
                    discountAmount: receiptData.discountAmount || 0,
                    totalAmount: receiptData.total || receiptData.subtotal || 0,
                    totalCost: totalCost,
                    profit: profit,
                    profitMargin: profitMargin,
                    paymentMethod: receiptData.paymentMethod || 'Cash',
                    amountReceived: receiptData.amountReceived || receiptData.total || 0,
                    change: receiptData.change || 0,
                    cashier: req.user._id,
                    cashierName: req.user.name || 'Unknown',
                    referenceNumber: referenceNumber,
                    notes: receiptData.notes || ''
                });

                res.status(201).json({
                    success: true,
                    message: 'Sales processed successfully',
                    data: results,
                    bill: bill
                });
            } catch (billError) {
                // If bill saving fails, still return success for sale processing
                // but log the error
                console.error('Failed to save bill:', billError);
                res.status(201).json({
                    success: true,
                    message: 'Sales processed successfully, but bill record failed to save',
                    data: results,
                    warning: 'Bill record not saved'
                });
            }
        } else {
            res.status(201).json({
                success: true,
                message: 'Sales processed successfully',
                data: results
            });
        }
    })
);

// @desc    Get sales history grouped by bill number
// @route   GET /api/v1/inventory/sales-history
// @access  Private (requires read_inventory permission)
router.get('/sales-history',
    protect,
    requirePermission('read_inventory'),
    validatePagination,
    validateDateRange('startDate', 'endDate'),
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { startDate, endDate, billNumber } = req.query;

        // Build filter for bills
        const filter = {};

        // Filter by bill number if provided
        if (billNumber) {
            filter.billNumber = { $regex: billNumber, $options: 'i' };
        }

        // Add date filters - default to current day if no dates provided
        // Note: validation middleware may have already converted dates to Date objects
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                // Use date directly if it's already a Date object, otherwise parse it
                filter.createdAt.$gte = startDate instanceof Date ? startDate : new Date(startDate);
            }
            if (endDate) {
                // Use date directly if it's already a Date object, otherwise parse it
                const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
                // Ensure end date is set to end of day (validation middleware should have done this, but ensure it)
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        } else {
            // Default to current day if no date filters provided
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            filter.createdAt = {
                $gte: today,
                $lte: endOfToday
            };
        }

        // Get total count for pagination
        const total = await Bill.countDocuments(filter);

        // Calculate summary for all matching bills (not just current page)
        const summaryBills = await Bill.find(filter)
            .select('subtotal totalAmount profit')
            .lean();

        const summary = {
            totalBills: total,
            totalRevenue: summaryBills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0),
            totalProfit: summaryBills.reduce((sum, bill) => sum + (bill.profit || 0), 0)
        };

        // Fetch bills with pagination
        const bills = await Bill.find(filter)
            .populate('cashier', 'name email')
            .populate('items.product', 'name sku category mrp')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Format bills for response (preserve exact data as shown at billing time)
        const formattedBills = bills.map(bill => {
            // Calculate total items
            const totalItems = bill.items.reduce((sum, item) => sum + item.quantity, 0);

            return {
                billNumber: bill.billNumber,
                date: bill.createdAt,
                cashier: bill.cashier || { name: bill.cashierName || 'Unknown' },
                items: bill.items.map(item => ({
                    product: item.product || {
                        _id: item.product,
                        name: item.productName,
                        sku: item.productSku
                    },
                    quantity: item.quantity,
                    sellingPrice: item.unitPrice, // Exact price shown at billing
                    costPrice: item.costPrice,
                    total: item.totalPrice, // Exact total shown at billing
                    batchNumber: item.batchNumber
                })),
                totalItems: totalItems,
                subtotal: bill.subtotal, // Exact subtotal shown at billing
                tax: bill.taxAmount,
                total: bill.totalAmount, // Exact total shown at billing
                totalCost: bill.totalCost,
                profit: bill.profit,
                profitMargin: bill.profitMargin,
                paymentMethod: bill.paymentMethod,
                amountReceived: bill.amountReceived,
                change: bill.change
            };
        });

        res.status(200).json({
            success: true,
            count: formattedBills.length,
            total,
            summary,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: formattedBills
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
