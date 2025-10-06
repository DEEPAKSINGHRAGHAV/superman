const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const mongoose = require('mongoose');

class InventoryService {
    /**
     * Update stock for a product with atomic transaction
     * @param {string} productId - Product ID
     * @param {number} quantity - Quantity change (positive for increase, negative for decrease)
     * @param {string} movementType - Type of movement
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Updated product and stock movement record
     */
    static async updateStock(productId, quantity, movementType, options = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                reason = '',
                notes = '',
                referenceId = null,
                referenceNumber = '',
                location = '',
                unitCost = null,
                batchNumber = '',
                expiryDate = null,
                createdBy
            } = options;

            // Validate required fields
            if (!createdBy) {
                throw new Error('createdBy is required for stock movements');
            }

            // Get product with current stock
            const product = await Product.findById(productId).session(session);
            if (!product) {
                throw new Error('Product not found');
            }

            if (!product.isActive) {
                throw new Error('Cannot update stock for inactive product');
            }

            const previousStock = product.currentStock;
            const newStock = previousStock + quantity;

            // Validate stock level
            if (newStock < 0) {
                throw new Error('Insufficient stock for this operation');
            }

            // Update product stock
            await Product.findByIdAndUpdate(
                productId,
                { currentStock: newStock },
                { session }
            );

            // Create stock movement record
            const stockMovement = await StockMovement.create([{
                product: productId,
                movementType,
                quantity,
                previousStock,
                newStock,
                referenceId,
                referenceNumber,
                reason,
                notes,
                location,
                unitCost,
                totalCost: unitCost ? Math.abs(quantity) * unitCost : null,
                batchNumber,
                expiryDate,
                createdBy
            }], { session });

            await session.commitTransaction();

            return {
                product: await Product.findById(productId).populate('createdBy', 'name email'),
                stockMovement: stockMovement[0]
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process purchase order receipt
     * @param {string} purchaseOrderId - Purchase Order ID
     * @param {Array} receivedItems - Items received
     * @param {string} createdBy - User ID who processed the receipt
     * @returns {Promise<Object>} Processing result
     */
    static async processPurchaseReceipt(purchaseOrderId, receivedItems, createdBy) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const results = [];

            for (const item of receivedItems) {
                const {
                    productId,
                    quantity,
                    costPrice,
                    batchNumber = '',
                    expiryDate = null,
                    notes = ''
                } = item;

                const result = await this.updateStock(
                    productId,
                    quantity,
                    'purchase',
                    {
                        reason: 'Purchase order receipt',
                        notes,
                        referenceId: purchaseOrderId,
                        referenceNumber: `PO-${purchaseOrderId}`,
                        unitCost: costPrice,
                        batchNumber,
                        expiryDate,
                        createdBy
                    }
                );

                results.push(result);
            }

            await session.commitTransaction();
            return results;

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process sale/consumption
     * @param {Array} saleItems - Items sold/consumed
     * @param {string} createdBy - User ID
     * @param {string} referenceNumber - Reference number (invoice, etc.)
     * @returns {Promise<Array>} Processing results
     */
    static async processSale(saleItems, createdBy, referenceNumber = '') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const results = [];

            for (const item of saleItems) {
                const {
                    productId,
                    quantity,
                    notes = ''
                } = item;

                const result = await this.updateStock(
                    productId,
                    -quantity, // Negative for sale
                    'sale',
                    {
                        reason: 'Sale/Consumption',
                        notes,
                        referenceNumber,
                        createdBy
                    }
                );

                results.push(result);
            }

            await session.commitTransaction();
            return results;

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Process stock adjustment
     * @param {Array} adjustments - Stock adjustments
     * @param {string} createdBy - User ID
     * @param {string} reason - Reason for adjustment
     * @returns {Promise<Array>} Processing results
     */
    static async processStockAdjustment(adjustments, createdBy, reason = 'Manual adjustment') {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const results = [];

            for (const adjustment of adjustments) {
                const {
                    productId,
                    quantity,
                    notes = ''
                } = adjustment;

                const result = await this.updateStock(
                    productId,
                    quantity,
                    'adjustment',
                    {
                        reason,
                        notes,
                        createdBy
                    }
                );

                results.push(result);
            }

            await session.commitTransaction();
            return results;

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get low stock alerts
     * @returns {Promise<Array>} Products with low stock
     */
    static async getLowStockAlerts() {
        return await Product.find({
            $expr: { $lte: ['$currentStock', '$minStockLevel'] },
            isActive: true
        })
            .select('name sku currentStock minStockLevel maxStockLevel category')
            .sort({ currentStock: 1 });
    }

    /**
     * Get expiring products
     * @param {number} daysAhead - Days ahead to check for expiry
     * @returns {Promise<Array>} Products expiring soon
     */
    static async getExpiringProducts(daysAhead = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return await Product.find({
            expiryDate: { $lte: futureDate, $gte: new Date() },
            isActive: true
        })
            .select('name sku expiryDate currentStock category')
            .sort({ expiryDate: 1 });
    }

    /**
     * Get inventory summary
     * @returns {Promise<Object>} Inventory summary
     */
    static async getInventorySummary() {
        const summary = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$currentStock' },
                    totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
                    lowStockCount: {
                        $sum: {
                            $cond: [
                                { $lte: ['$currentStock', '$minStockLevel'] },
                                1,
                                0
                            ]
                        }
                    },
                    outOfStockCount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$currentStock', 0] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        return summary[0] || {
            totalProducts: 0,
            totalStock: 0,
            totalValue: 0,
            lowStockCount: 0,
            outOfStockCount: 0
        };
    }

    /**
     * Get stock movement history for a product
     * @param {string} productId - Product ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Stock movement history
     */
    static async getProductStockHistory(productId, options = {}) {
        const {
            limit = 50,
            skip = 0,
            movementType = null,
            startDate = null,
            endDate = null
        } = options;

        const matchQuery = { product: new mongoose.Types.ObjectId(productId) };

        if (movementType) {
            matchQuery.movementType = movementType;
        }

        if (startDate || endDate) {
            matchQuery.createdAt = {};
            if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
            if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
        }

        const [movements, total] = await Promise.all([
            StockMovement.find(matchQuery)
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            StockMovement.countDocuments(matchQuery)
        ]);

        return {
            movements,
            total,
            hasMore: skip + limit < total
        };
    }

    /**
     * Get daily stock movements summary
     * @param {Date} date - Date to get summary for
     * @returns {Promise<Object>} Daily summary
     */
    static async getDailyStockSummary(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const summary = await StockMovement.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: '$movementType',
                    totalQuantity: { $sum: '$quantity' },
                    totalCost: { $sum: '$totalCost' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: null,
                    movements: {
                        $push: {
                            type: '$_id',
                            totalQuantity: '$totalQuantity',
                            totalCost: '$totalCost',
                            count: '$count'
                        }
                    },
                    totalMovements: { $sum: '$count' },
                    netQuantity: { $sum: '$totalQuantity' }
                }
            }
        ]);

        return summary[0] || {
            movements: [],
            totalMovements: 0,
            netQuantity: 0
        };
    }

    /**
     * Get category-wise inventory summary
     * @returns {Promise<Array>} Category summary
     */
    static async getCategoryWiseSummary() {
        return await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$currentStock' },
                    totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
                    lowStockCount: {
                        $sum: {
                            $cond: [
                                { $lte: ['$currentStock', '$minStockLevel'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { totalValue: -1 } }
        ]);
    }
}

module.exports = InventoryService;
