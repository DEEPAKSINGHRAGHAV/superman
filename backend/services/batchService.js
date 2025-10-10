const InventoryBatch = require('../models/InventoryBatch');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const mongoose = require('mongoose');

class BatchService {
    /**
     * Create a new inventory batch
     * @param {Object} batchData - Batch data
     * @returns {Promise<Object>} Created batch
     */
    static async createBatch(batchData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                productId,
                quantity,
                costPrice,
                sellingPrice,
                mrp,
                purchaseOrderId = null,
                supplierId = null,
                expiryDate = null,
                manufactureDate = null,
                notes = '',
                createdBy
            } = batchData;

            // Validate product exists
            const product = await Product.findById(productId).session(session);
            if (!product) {
                throw new Error('Product not found');
            }

            // Generate batch number
            const batchNumber = await InventoryBatch.generateBatchNumber(productId);

            // Create batch
            const batch = await InventoryBatch.create([{
                product: productId,
                batchNumber,
                costPrice,
                sellingPrice,
                mrp: mrp || product.mrp,
                initialQuantity: quantity,
                currentQuantity: quantity,
                purchaseOrder: purchaseOrderId,
                supplier: supplierId,
                expiryDate,
                manufactureDate,
                notes,
                createdBy
            }], { session });

            // Update product's current stock
            await Product.findByIdAndUpdate(
                productId,
                {
                    $inc: { currentStock: quantity },
                    // Update product's default prices to latest batch prices
                    costPrice: costPrice,
                    sellingPrice: sellingPrice
                },
                { session }
            );

            // Create stock movement record
            await StockMovement.create([{
                product: productId,
                movementType: 'purchase',
                quantity: quantity,
                previousStock: product.currentStock,
                newStock: product.currentStock + quantity,
                referenceId: purchaseOrderId,
                referenceNumber: `BATCH-${batchNumber}`,
                referenceType: 'purchase_order',
                reason: 'New batch created',
                notes: `Batch ${batchNumber}`,
                unitCost: costPrice,
                totalCost: quantity * costPrice,
                batchNumber: batchNumber,
                expiryDate: expiryDate,
                createdBy
            }], { session });

            await session.commitTransaction();

            return batch[0];

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get all batches for a product with pricing information
     * @param {string} productId - Product ID or barcode
     * @returns {Promise<Array>} List of batches with pricing
     */
    static async getBatchesByProduct(productId) {
        let product;

        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
            product = await Product.findById(productId);
        }

        // If not found, try to find by barcode or SKU
        if (!product) {
            product = await Product.findOne({
                $or: [
                    { barcode: productId },
                    { sku: productId }
                ]
            });
        }

        if (!product) {
            throw new Error('Product not found');
        }

        productId = product._id;

        const batchQuery = {
            product: productId,
            status: 'active',
            currentQuantity: { $gt: 0 },
            // Exclude expired batches
            $or: [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: { $gt: new Date() } }
            ]
        };

        const batches = await InventoryBatch.find(batchQuery)
            .sort({ purchaseDate: 1 }) // FIFO order
            .populate('supplier', 'name code')
            .populate('purchaseOrder', 'orderNumber')
            .lean();

        // Calculate summary
        const summary = {
            productId: product._id,
            productName: product.name,
            productSku: product.sku,
            barcode: product.barcode,
            totalBatches: batches.length,
            totalQuantity: batches.reduce((sum, b) => sum + b.currentQuantity, 0),
            priceRange: {
                minCostPrice: Math.min(...batches.map(b => b.costPrice)),
                maxCostPrice: Math.max(...batches.map(b => b.costPrice)),
                minSellingPrice: Math.min(...batches.map(b => b.sellingPrice)),
                maxSellingPrice: Math.max(...batches.map(b => b.sellingPrice))
            },
            batches: batches.map(batch => ({
                ...batch,
                availableQuantity: batch.currentQuantity - (batch.reservedQuantity || 0),
                daysUntilExpiry: batch.expiryDate
                    ? Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                    : null,
                isExpired: batch.expiryDate && new Date() > new Date(batch.expiryDate)
            }))
        };

        return summary;
    }

    /**
     * Process sale using FIFO (First-In-First-Out) method
     * @param {string} productId - Product ID
     * @param {number} quantityToSell - Quantity to sell
     * @param {string} createdBy - User ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Sale processing result
     */
    static async processSaleFIFO(productId, quantityToSell, createdBy, options = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { referenceNumber = '', notes = '' } = options;

            // Get active batches in FIFO order (oldest first), excluding expired batches
            const batches = await InventoryBatch.find({
                product: productId,
                status: 'active',
                currentQuantity: { $gt: 0 },
                // Exclude expired batches
                $or: [
                    { expiryDate: { $exists: false } },
                    { expiryDate: null },
                    { expiryDate: { $gt: new Date() } }
                ]
            })
                .sort({ purchaseDate: 1, createdAt: 1 })
                .session(session);

            if (batches.length === 0) {
                throw new Error('No active non-expired batches available for this product');
            }

            // Calculate total available quantity
            const totalAvailable = batches.reduce((sum, batch) =>
                sum + (batch.currentQuantity - batch.reservedQuantity), 0
            );

            if (totalAvailable < quantityToSell) {
                throw new Error(
                    `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantityToSell}`
                );
            }

            let remainingQuantity = quantityToSell;
            const batchesUsed = [];
            let totalCost = 0;
            let totalRevenue = 0;

            // Process batches in FIFO order
            for (const batch of batches) {
                if (remainingQuantity === 0) break;

                const availableInBatch = batch.currentQuantity - batch.reservedQuantity;
                if (availableInBatch === 0) continue;

                const quantityFromBatch = Math.min(remainingQuantity, availableInBatch);

                // Reduce batch quantity
                batch.currentQuantity -= quantityFromBatch;
                if (batch.currentQuantity === 0) {
                    batch.status = 'depleted';
                }
                await batch.save({ session });

                // Track batch usage
                batchesUsed.push({
                    batchId: batch._id,
                    batchNumber: batch.batchNumber,
                    quantity: quantityFromBatch,
                    costPrice: batch.costPrice,
                    sellingPrice: batch.sellingPrice,
                    totalCost: quantityFromBatch * batch.costPrice,
                    totalRevenue: quantityFromBatch * batch.sellingPrice
                });

                totalCost += quantityFromBatch * batch.costPrice;
                totalRevenue += quantityFromBatch * batch.sellingPrice;
                remainingQuantity -= quantityFromBatch;

                // Create stock movement for this batch
                await StockMovement.create([{
                    product: productId,
                    movementType: 'sale',
                    quantity: -quantityFromBatch,
                    previousStock: batch.currentQuantity + quantityFromBatch,
                    newStock: batch.currentQuantity,
                    referenceNumber: referenceNumber || `SALE-${Date.now()}`,
                    referenceType: 'sale',
                    reason: 'Sale from batch',
                    notes: `Batch ${batch.batchNumber}${notes ? ': ' + notes : ''}`,
                    unitCost: batch.costPrice,
                    totalCost: quantityFromBatch * batch.costPrice,
                    batchNumber: batch.batchNumber,
                    createdBy
                }], { session });
            }

            // Update product's total stock
            const product = await Product.findById(productId).session(session);
            await Product.findByIdAndUpdate(
                productId,
                { $inc: { currentStock: -quantityToSell } },
                { session }
            );

            await session.commitTransaction();

            return {
                success: true,
                quantitySold: quantityToSell,
                batchesUsed,
                totalCost,
                totalRevenue,
                profit: totalRevenue - totalCost,
                profitMargin: ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(2),
                averageCostPrice: totalCost / quantityToSell,
                averageSellingPrice: totalRevenue / quantityToSell
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get batch details by batch number or ID
     * @param {string} identifier - Batch number or ID
     * @returns {Promise<Object>} Batch details
     */
    static async getBatchDetails(identifier) {
        let batch;

        // Try to find by ID first
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            batch = await InventoryBatch.findById(identifier)
                .populate('product', 'name sku barcode category')
                .populate('supplier', 'name code email phone')
                .populate('purchaseOrder', 'orderNumber orderDate totalAmount')
                .populate('createdBy', 'name email');
        }

        // If not found, try by batch number
        if (!batch) {
            batch = await InventoryBatch.findOne({ batchNumber: identifier })
                .populate('product', 'name sku barcode category')
                .populate('supplier', 'name code email phone')
                .populate('purchaseOrder', 'orderNumber orderDate totalAmount')
                .populate('createdBy', 'name email');
        }

        if (!batch) {
            throw new Error('Batch not found');
        }

        // Get stock movements for this batch
        const movements = await StockMovement.find({
            batchNumber: batch.batchNumber
        })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(50);

        return {
            batch: batch.toObject({ virtuals: true }),
            movements
        };
    }

    /**
     * Get batches expiring soon
     * @param {number} daysAhead - Number of days to look ahead
     * @returns {Promise<Array>} Expiring batches
     */
    static async getExpiringBatches(daysAhead = 30) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const batches = await InventoryBatch.find({
            status: 'active',
            currentQuantity: { $gt: 0 },
            expiryDate: {
                $gte: today,
                $lte: futureDate
            }
        })
            .sort({ expiryDate: 1 })
            .populate('product', 'name sku barcode category')
            .populate('supplier', 'name')
            .lean();

        return batches.map(batch => ({
            ...batch,
            daysUntilExpiry: Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24)),
            isExpiringSoon: Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24)) <= 7,
            valueAtRisk: batch.currentQuantity * batch.costPrice
        }));
    }

    /**
     * Mark batch as expired/damaged
     * @param {string} batchId - Batch ID
     * @param {string} newStatus - New status ('expired', 'damaged', 'returned')
     * @param {string} createdBy - User ID
     * @param {string} reason - Reason for status change
     * @returns {Promise<Object>} Updated batch
     */
    static async updateBatchStatus(batchId, newStatus, createdBy, reason = '') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const batch = await InventoryBatch.findById(batchId).session(session);
            if (!batch) {
                throw new Error('Batch not found');
            }

            const quantityToAdjust = batch.currentQuantity;
            const oldStatus = batch.status;

            // Update batch status
            batch.status = newStatus;
            const originalQuantity = batch.currentQuantity;

            // If marking as expired/damaged, reduce quantity to 0
            if (['expired', 'damaged'].includes(newStatus)) {
                batch.currentQuantity = 0;
            }

            await batch.save({ session });

            // Update product stock if quantity changed
            if (originalQuantity > 0 && ['expired', 'damaged'].includes(newStatus)) {
                const product = await Product.findById(batch.product).session(session);

                await Product.findByIdAndUpdate(
                    batch.product,
                    { $inc: { currentStock: -quantityToAdjust } },
                    { session }
                );

                // Create stock movement
                await StockMovement.create([{
                    product: batch.product,
                    movementType: newStatus === 'expired' ? 'expired' : 'damage',
                    quantity: -quantityToAdjust,
                    previousStock: product.currentStock,
                    newStock: product.currentStock - quantityToAdjust,
                    referenceNumber: `${newStatus.toUpperCase()}-${batch.batchNumber}`,
                    referenceType: 'adjustment',
                    reason: reason || `Batch marked as ${newStatus}`,
                    notes: `Batch ${batch.batchNumber} - Status changed from ${oldStatus} to ${newStatus}`,
                    unitCost: batch.costPrice,
                    totalCost: quantityToAdjust * batch.costPrice,
                    batchNumber: batch.batchNumber,
                    createdBy
                }], { session });
            }

            await session.commitTransaction();

            return batch;

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get inventory valuation report
     * @returns {Promise<Object>} Valuation report
     */
    static async getInventoryValuation() {
        const valuation = await InventoryBatch.aggregate([
            {
                $match: {
                    status: 'active',
                    currentQuantity: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: '$product',
                    totalBatches: { $sum: 1 },
                    totalQuantity: { $sum: '$currentQuantity' },
                    totalCostValue: {
                        $sum: { $multiply: ['$currentQuantity', '$costPrice'] }
                    },
                    totalSellingValue: {
                        $sum: { $multiply: ['$currentQuantity', '$sellingPrice'] }
                    },
                    batches: {
                        $push: {
                            batchNumber: '$batchNumber',
                            quantity: '$currentQuantity',
                            costPrice: '$costPrice',
                            sellingPrice: '$sellingPrice',
                            purchaseDate: '$purchaseDate',
                            expiryDate: '$expiryDate'
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: '$productInfo'
            },
            {
                $project: {
                    productId: '$_id',
                    productName: '$productInfo.name',
                    productSku: '$productInfo.sku',
                    barcode: '$productInfo.barcode',
                    category: '$productInfo.category',
                    totalBatches: 1,
                    totalQuantity: 1,
                    totalCostValue: 1,
                    totalSellingValue: 1,
                    potentialProfit: {
                        $subtract: ['$totalSellingValue', '$totalCostValue']
                    },
                    profitMargin: {
                        $multiply: [
                            {
                                $divide: [
                                    { $subtract: ['$totalSellingValue', '$totalCostValue'] },
                                    '$totalSellingValue'
                                ]
                            },
                            100
                        ]
                    },
                    weightedAvgCostPrice: {
                        $divide: ['$totalCostValue', '$totalQuantity']
                    },
                    weightedAvgSellingPrice: {
                        $divide: ['$totalSellingValue', '$totalQuantity']
                    },
                    batches: 1
                }
            },
            {
                $sort: { totalCostValue: -1 }
            }
        ]);

        // Calculate overall summary
        const summary = {
            totalProducts: valuation.length,
            totalBatches: valuation.reduce((sum, item) => sum + item.totalBatches, 0),
            totalQuantity: valuation.reduce((sum, item) => sum + item.totalQuantity, 0),
            totalCostValue: valuation.reduce((sum, item) => sum + item.totalCostValue, 0),
            totalSellingValue: valuation.reduce((sum, item) => sum + item.totalSellingValue, 0),
            totalPotentialProfit: valuation.reduce((sum, item) => sum + item.potentialProfit, 0)
        };

        return {
            summary,
            products: valuation
        };
    }

    /**
     * Adjust batch quantity
     * @param {string} batchId - Batch ID
     * @param {number} adjustmentQuantity - Quantity to adjust (positive or negative)
     * @param {string} createdBy - User ID
     * @param {string} reason - Reason for adjustment
     * @returns {Promise<Object>} Updated batch
     */
    static async adjustBatchQuantity(batchId, adjustmentQuantity, createdBy, reason = 'Manual adjustment') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const batch = await InventoryBatch.findById(batchId).session(session);
            if (!batch) {
                throw new Error('Batch not found');
            }

            const newQuantity = batch.currentQuantity + adjustmentQuantity;
            if (newQuantity < 0) {
                throw new Error('Adjustment would result in negative quantity');
            }

            const previousQuantity = batch.currentQuantity;
            batch.currentQuantity = newQuantity;

            if (newQuantity === 0) {
                batch.status = 'depleted';
            } else if (batch.status === 'depleted' && newQuantity > 0) {
                batch.status = 'active';
            }

            await batch.save({ session });

            // Update product stock
            const product = await Product.findById(batch.product).session(session);
            await Product.findByIdAndUpdate(
                batch.product,
                { $inc: { currentStock: adjustmentQuantity } },
                { session }
            );

            // Create stock movement
            await StockMovement.create([{
                product: batch.product,
                movementType: 'adjustment',
                quantity: adjustmentQuantity,
                previousStock: product.currentStock,
                newStock: product.currentStock + adjustmentQuantity,
                referenceNumber: `ADJ-${batch.batchNumber}`,
                referenceType: 'adjustment',
                reason,
                notes: `Batch ${batch.batchNumber} quantity adjusted from ${previousQuantity} to ${newQuantity}`,
                unitCost: batch.costPrice,
                totalCost: Math.abs(adjustmentQuantity) * batch.costPrice,
                batchNumber: batch.batchNumber,
                createdBy
            }], { session });

            await session.commitTransaction();

            return batch;

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = BatchService;
