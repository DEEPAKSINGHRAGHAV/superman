const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
    // Movement Information
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    movementType: {
        type: String,
        enum: ['purchase', 'sale', 'adjustment', 'return', 'damage', 'transfer', 'expired'],
        required: [true, 'Movement type is required'],
        index: true
    },

    // Quantity Information
    quantity: {
        type: Number,
        required: [true, 'Quantity is required']
    },
    previousStock: {
        type: Number,
        required: [true, 'Previous stock is required'],
        min: [0, 'Previous stock cannot be negative']
    },
    newStock: {
        type: Number,
        required: [true, 'New stock is required'],
        min: [0, 'New stock cannot be negative']
    },

    // Reference Information
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    referenceNumber: {
        type: String,
        trim: true
    },
    referenceType: {
        type: String,
        enum: ['purchase_order', 'sale', 'adjustment', 'return', 'transfer'],
        index: true
    },

    // Additional Information
    reason: {
        type: String,
        trim: true,
        maxlength: [200, 'Reason cannot exceed 200 characters']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },

    // Financial Information (for tracking cost changes)
    unitCost: {
        type: Number,
        min: [0, 'Unit cost cannot be negative']
    },
    totalCost: {
        type: Number,
        min: [0, 'Total cost cannot be negative']
    },

    // Batch Information
    batchNumber: {
        type: String,
        trim: true
    },
    expiryDate: {
        type: Date
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by is required']
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for movement direction
stockMovementSchema.virtual('direction').get(function () {
    return this.quantity >= 0 ? 'in' : 'out';
});

// Virtual for absolute quantity
stockMovementSchema.virtual('absoluteQuantity').get(function () {
    return Math.abs(this.quantity);
});

// Virtual for formatted date
stockMovementSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Indexes for better query performance
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ movementType: 1 });
stockMovementSchema.index({ referenceId: 1, referenceType: 1 });
stockMovementSchema.index({ createdBy: 1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ batchNumber: 1 });
stockMovementSchema.index({ expiryDate: 1 });

// Compound indexes for common queries
stockMovementSchema.index({ product: 1, movementType: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1, movementType: 1 });

// Pre-save middleware
stockMovementSchema.pre('save', function (next) {
    // Validate stock movement logic
    if (this.newStock !== (this.previousStock + this.quantity)) {
        return next(new Error('Stock calculation mismatch'));
    }

    // Set reference type based on movement type
    if (!this.referenceType) {
        const typeMapping = {
            'purchase': 'purchase_order',
            'sale': 'sale',
            'adjustment': 'adjustment',
            'return': 'return',
            'damage': 'adjustment',
            'transfer': 'transfer',
            'expired': 'adjustment'
        };
        this.referenceType = typeMapping[this.movementType] || 'adjustment';
    }

    // Calculate total cost if unit cost is provided
    if (this.unitCost && !this.totalCost) {
        this.totalCost = Math.abs(this.quantity) * this.unitCost;
    }

    next();
});

// Static method to find movements by product
stockMovementSchema.statics.findByProduct = function (productId, limit = 50) {
    return this.find({ product: productId })
        .populate('product', 'name sku')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to find movements by type
stockMovementSchema.statics.findByType = function (movementType, limit = 100) {
    return this.find({ movementType })
        .populate('product', 'name sku category')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Static method to get movement summary for a product
stockMovementSchema.statics.getProductSummary = function (productId, startDate, endDate) {
    const matchQuery = { product: productId };

    if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: matchQuery },
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
};

// Static method to get daily movement summary
stockMovementSchema.statics.getDailySummary = function (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.aggregate([
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
};

// Static method to find expiring products
stockMovementSchema.statics.findExpiringProducts = function (daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.find({
        expiryDate: { $lte: futureDate, $gte: new Date() },
        movementType: 'purchase'
    })
        .populate('product', 'name sku category currentStock')
        .sort({ expiryDate: 1 });
};

// Instance method to get movement description
stockMovementSchema.methods.getDescription = function () {
    const direction = this.direction === 'in' ? 'added to' : 'removed from';
    return `${this.movementType} - ${this.absoluteQuantity} units ${direction} stock`;
};

// Instance method to get formatted movement
stockMovementSchema.methods.getFormatted = function () {
    return {
        id: this._id,
        product: this.product,
        type: this.movementType,
        quantity: this.quantity,
        previousStock: this.previousStock,
        newStock: this.newStock,
        direction: this.direction,
        reason: this.reason,
        notes: this.notes,
        createdAt: this.createdAt,
        formattedDate: this.formattedDate,
        createdBy: this.createdBy
    };
};

module.exports = mongoose.model('StockMovement', stockMovementSchema);
