const InventoryBatch = require('../models/InventoryBatch');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const mongoose = require('mongoose');

/**
 * Service to automatically check and update expired batches
 */
class ExpiryCheckService {
    /**
     * Check all batches and mark expired ones
     * This should be run periodically (e.g., daily via cron job)
     */
    static async checkAndUpdateExpiredBatches() {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get today's date at start of day (00:00:00) for accurate comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find all active batches that have expired (expiry date is before today)
            const expiredBatches = await InventoryBatch.find({
                status: 'active',
                expiryDate: { $lt: today },
                currentQuantity: { $gt: 0 }
            }).session(session);

            const results = {
                totalChecked: expiredBatches.length,
                batchesUpdated: [],
                errors: []
            };

            for (const batch of expiredBatches) {
                try {
                    const quantityToRemove = batch.currentQuantity;
                    const oldStatus = batch.status;

                    // Update batch status to expired
                    batch.status = 'expired';
                    batch.currentQuantity = 0;
                    await batch.save({ session });

                    // Update product stock
                    await Product.findByIdAndUpdate(
                        batch.product,
                        { $inc: { currentStock: -quantityToRemove } },
                        { session }
                    );

                    // Create stock movement record
                    await StockMovement.create([{
                        product: batch.product,
                        movementType: 'expired',
                        quantity: -quantityToRemove,
                        previousStock: quantityToRemove,
                        newStock: 0,
                        referenceNumber: `EXPIRED-${batch.batchNumber}`,
                        referenceType: 'adjustment',
                        reason: 'Automatic expiry - batch expired',
                        notes: `Batch ${batch.batchNumber} automatically marked as expired. Expiry date: ${batch.expiryDate.toDateString()}`,
                        unitCost: batch.costPrice,
                        totalCost: quantityToRemove * batch.costPrice,
                        batchNumber: batch.batchNumber,
                        expiryDate: batch.expiryDate,
                        createdBy: batch.createdBy
                    }], { session });

                    results.batchesUpdated.push({
                        batchId: batch._id,
                        batchNumber: batch.batchNumber,
                        productId: batch.product,
                        quantityRemoved: quantityToRemove,
                        expiryDate: batch.expiryDate
                    });

                    console.log(`Batch ${batch.batchNumber} marked as expired. ${quantityToRemove} units removed from inventory.`);
                } catch (error) {
                    console.error(`Error updating batch ${batch.batchNumber}:`, error);
                    results.errors.push({
                        batchId: batch._id,
                        batchNumber: batch.batchNumber,
                        error: error.message
                    });
                }
            }

            await session.commitTransaction();

            return {
                success: true,
                timestamp: new Date(),
                ...results
            };

        } catch (error) {
            await session.abortTransaction();
            console.error('Error in expiry check service:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        } finally {
            session.endSession();
        }
    }

    /**
     * Get batches expiring soon (for warnings)
     * @param {number} daysAhead - Number of days to look ahead
     */
    static async getBatchesExpiringSoon(daysAhead = 7) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        futureDate.setHours(23, 59, 59, 999);

        const batches = await InventoryBatch.find({
            status: 'active',
            currentQuantity: { $gt: 0 },
            expiryDate: {
                $gte: today,
                $lte: futureDate
            }
        })
            .populate('product', 'name sku barcode')
            .populate('supplier', 'name')
            .sort({ expiryDate: 1 })
            .lean();

        return batches.map(batch => ({
            ...batch,
            daysUntilExpiry: Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24)),
            valueAtRisk: batch.currentQuantity * batch.costPrice
        }));
    }

    /**
     * Check if a specific batch is expired
     * @param {string} batchId - Batch ID
     */
    static async checkBatchExpiry(batchId) {
        const batch = await InventoryBatch.findById(batchId);

        if (!batch) {
            throw new Error('Batch not found');
        }

        if (!batch.expiryDate) {
            return {
                isExpired: false,
                status: batch.status,
                message: 'No expiry date set for this batch'
            };
        }

        const isExpired = new Date() > new Date(batch.expiryDate);
        const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

        return {
            isExpired,
            daysUntilExpiry,
            status: batch.status,
            expiryDate: batch.expiryDate,
            currentQuantity: batch.currentQuantity,
            needsUpdate: isExpired && batch.status === 'active' && batch.currentQuantity > 0
        };
    }

    /**
     * Get expiry statistics
     */
    static async getExpiryStatistics() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [expiredStats, expiringSoonStats, totalActiveStats] = await Promise.all([
            // Already expired but not marked
            InventoryBatch.aggregate([
                {
                    $match: {
                        status: 'active',
                        expiryDate: { $lt: today },
                        currentQuantity: { $gt: 0 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBatches: { $sum: 1 },
                        totalQuantity: { $sum: '$currentQuantity' },
                        totalValue: { $sum: { $multiply: ['$currentQuantity', '$costPrice'] } }
                    }
                }
            ]),
            // Expiring in next 30 days
            InventoryBatch.aggregate([
                {
                    $match: {
                        status: 'active',
                        currentQuantity: { $gt: 0 },
                        expiryDate: {
                            $gte: today,
                            $lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBatches: { $sum: 1 },
                        totalQuantity: { $sum: '$currentQuantity' },
                        totalValue: { $sum: { $multiply: ['$currentQuantity', '$costPrice'] } }
                    }
                }
            ]),
            // All active batches
            InventoryBatch.aggregate([
                {
                    $match: {
                        status: 'active',
                        currentQuantity: { $gt: 0 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBatches: { $sum: 1 },
                        totalQuantity: { $sum: '$currentQuantity' },
                        totalValue: { $sum: { $multiply: ['$currentQuantity', '$costPrice'] } }
                    }
                }
            ])
        ]);

        return {
            expired: expiredStats[0] || { totalBatches: 0, totalQuantity: 0, totalValue: 0 },
            expiringSoon: expiringSoonStats[0] || { totalBatches: 0, totalQuantity: 0, totalValue: 0 },
            totalActive: totalActiveStats[0] || { totalBatches: 0, totalQuantity: 0, totalValue: 0 }
        };
    }
}

module.exports = ExpiryCheckService;

