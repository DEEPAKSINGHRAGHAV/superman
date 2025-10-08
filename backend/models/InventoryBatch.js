const mongoose = require('mongoose');

const inventoryBatchSchema = new mongoose.Schema({
    // Product Reference
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required'],
        index: true
    },

    // Batch Identification
    batchNumber: {
        type: String,
        required: [true, 'Batch number is required'],
        trim: true,
        index: true
    },

    // Pricing Information (specific to this batch)
    costPrice: {
        type: Number,
        required: [true, 'Cost price is required'],
        min: [0, 'Cost price cannot be negative']
    },
    sellingPrice: {
        type: Number,
        required: [true, 'Selling price is required'],
        min: [0, 'Selling price cannot be negative']
    },
    mrp: {
        type: Number,
        min: [0, 'MRP cannot be negative']
    },

    // Quantity Information
    initialQuantity: {
        type: Number,
        required: [true, 'Initial quantity is required'],
        min: [1, 'Initial quantity must be at least 1']
    },
    currentQuantity: {
        type: Number,
        required: [true, 'Current quantity is required'],
        min: [0, 'Current quantity cannot be negative']
    },
    reservedQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Reserved quantity cannot be negative']
    },

    // Available quantity (virtual calculated field)
    // availableQuantity = currentQuantity - reservedQuantity

    // Purchase Information
    purchaseOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder'
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    purchaseDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Expiry Information
    expiryDate: {
        type: Date,
        index: true
    },
    manufactureDate: {
        type: Date
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'depleted', 'expired', 'damaged', 'returned'],
        default: 'active',
        index: true
    },

    // Additional Information
    location: {
        type: String,
        trim: true,
        maxlength: [100, 'Location cannot exceed 100 characters']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for available quantity
inventoryBatchSchema.virtual('availableQuantity').get(function () {
    return Math.max(0, this.currentQuantity - this.reservedQuantity);
});

// Virtual for is depleted
inventoryBatchSchema.virtual('isDepleted').get(function () {
    return this.currentQuantity === 0;
});

// Virtual for is expired
inventoryBatchSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});

// Virtual for days until expiry
inventoryBatchSchema.virtual('daysUntilExpiry').get(function () {
    if (!this.expiryDate) return null;

    const today = new Date();
    const expiry = new Date(this.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
});

// Virtual for profit margin
inventoryBatchSchema.virtual('profitMargin').get(function () {
    if (!this.sellingPrice || !this.costPrice || this.sellingPrice === 0) {
        return 0;
    }
    return ((this.sellingPrice - this.costPrice) / this.sellingPrice * 100);
});

// Virtual for batch value (cost value)
inventoryBatchSchema.virtual('batchValue').get(function () {
    return this.currentQuantity * this.costPrice;
});

// Virtual for potential revenue
inventoryBatchSchema.virtual('potentialRevenue').get(function () {
    return this.currentQuantity * this.sellingPrice;
});

// Indexes for better query performance
inventoryBatchSchema.index({ product: 1, status: 1 });
inventoryBatchSchema.index({ product: 1, purchaseDate: 1 }); // For FIFO
inventoryBatchSchema.index({ batchNumber: 1 });
inventoryBatchSchema.index({ expiryDate: 1 });
inventoryBatchSchema.index({ status: 1, expiryDate: 1 });
inventoryBatchSchema.index({ purchaseOrder: 1 });
inventoryBatchSchema.index({ supplier: 1 });
inventoryBatchSchema.index({ createdAt: -1 });

// Compound index for finding available batches (FIFO)
inventoryBatchSchema.index({
    product: 1,
    status: 1,
    purchaseDate: 1
});

// Pre-save middleware
inventoryBatchSchema.pre('save', function (next) {
    // Auto-update status based on quantity
    if (this.currentQuantity === 0 && this.status === 'active') {
        this.status = 'depleted';
    }

    // Auto-update status based on expiry
    if (this.expiryDate && new Date() > this.expiryDate && this.status === 'active') {
        this.status = 'expired';
    }

    // Validate reserved quantity
    if (this.reservedQuantity > this.currentQuantity) {
        return next(new Error('Reserved quantity cannot exceed current quantity'));
    }

    // Validate selling price vs cost price
    if (this.sellingPrice < this.costPrice) {
        console.warn(`Warning: Batch ${this.batchNumber} selling price is less than cost price`);
    }

    next();
});

// Static method to generate batch number
inventoryBatchSchema.statics.generateBatchNumber = async function (productId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Count batches for this product today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await this.countDocuments({
        product: productId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const sequence = (count + 1).toString().padStart(3, '0');
    return `BATCH${year}${month}${day}${sequence}`;
};

// Static method to find active batches for a product (FIFO order)
inventoryBatchSchema.statics.findActiveByProduct = function (productId) {
    return this.find({
        product: productId,
        status: 'active',
        currentQuantity: { $gt: 0 }
    })
        .sort({ purchaseDate: 1, createdAt: 1 }) // FIFO - oldest first
        .populate('supplier', 'name code')
        .populate('purchaseOrder', 'orderNumber');
};

// Static method to find batches expiring soon
inventoryBatchSchema.statics.findExpiringSoon = function (daysAhead = 30) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.find({
        status: 'active',
        currentQuantity: { $gt: 0 },
        expiryDate: {
            $gte: today,
            $lte: futureDate
        }
    })
        .sort({ expiryDate: 1 })
        .populate('product', 'name sku barcode')
        .populate('supplier', 'name');
};

// Static method to get batch summary for a product
inventoryBatchSchema.statics.getProductBatchSummary = function (productId) {
    return this.aggregate([
        {
            $match: {
                product: new mongoose.Types.ObjectId(productId),
                status: 'active'
            }
        },
        {
            $group: {
                _id: null,
                totalBatches: { $sum: 1 },
                totalQuantity: { $sum: '$currentQuantity' },
                totalValue: { $sum: { $multiply: ['$currentQuantity', '$costPrice'] } },
                averageCostPrice: { $avg: '$costPrice' },
                minCostPrice: { $min: '$costPrice' },
                maxCostPrice: { $max: '$costPrice' },
                averageSellingPrice: { $avg: '$sellingPrice' },
                oldestBatchDate: { $min: '$purchaseDate' },
                newestBatchDate: { $max: '$purchaseDate' }
            }
        }
    ]);
};

// Static method to get inventory valuation by batch
inventoryBatchSchema.statics.getInventoryValuation = function () {
    return this.aggregate([
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
                totalCostValue: { $sum: { $multiply: ['$currentQuantity', '$costPrice'] } },
                totalSellingValue: { $sum: { $multiply: ['$currentQuantity', '$sellingPrice'] } },
                weightedAvgCostPrice: {
                    $sum: {
                        $divide: [
                            { $multiply: ['$currentQuantity', '$costPrice'] },
                            { $sum: '$currentQuantity' }
                        ]
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
                totalBatches: 1,
                totalQuantity: 1,
                totalCostValue: 1,
                totalSellingValue: 1,
                weightedAvgCostPrice: 1,
                potentialProfit: { $subtract: ['$totalSellingValue', '$totalCostValue'] }
            }
        },
        {
            $sort: { totalCostValue: -1 }
        }
    ]);
};

// Instance method to reduce quantity (for sales)
inventoryBatchSchema.methods.reduceQuantity = function (quantity) {
    if (quantity > this.availableQuantity) {
        throw new Error(`Insufficient quantity in batch. Available: ${this.availableQuantity}, Requested: ${quantity}`);
    }

    this.currentQuantity -= quantity;

    if (this.currentQuantity === 0) {
        this.status = 'depleted';
    }

    return this.save();
};

// Instance method to reserve quantity
inventoryBatchSchema.methods.reserveQuantity = function (quantity) {
    if (quantity > this.availableQuantity) {
        throw new Error(`Cannot reserve ${quantity} units. Only ${this.availableQuantity} available`);
    }

    this.reservedQuantity += quantity;
    return this.save();
};

// Instance method to release reserved quantity
inventoryBatchSchema.methods.releaseReservedQuantity = function (quantity) {
    if (quantity > this.reservedQuantity) {
        throw new Error(`Cannot release ${quantity} units. Only ${this.reservedQuantity} reserved`);
    }

    this.reservedQuantity -= quantity;
    return this.save();
};

// Instance method to get batch info
inventoryBatchSchema.methods.getBatchInfo = function () {
    return {
        id: this._id,
        batchNumber: this.batchNumber,
        product: this.product,
        costPrice: this.costPrice,
        sellingPrice: this.sellingPrice,
        currentQuantity: this.currentQuantity,
        availableQuantity: this.availableQuantity,
        reservedQuantity: this.reservedQuantity,
        purchaseDate: this.purchaseDate,
        expiryDate: this.expiryDate,
        daysUntilExpiry: this.daysUntilExpiry,
        status: this.status,
        isExpired: this.isExpired,
        profitMargin: this.profitMargin,
        batchValue: this.batchValue
    };
};

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
