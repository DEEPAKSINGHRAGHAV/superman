const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    productSku: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    costPrice: {
        type: Number,
        default: 0
    },
    batchNumber: {
        type: String
    }
}, { _id: false });

const billSchema = new mongoose.Schema({
    // Bill Information
    billNumber: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        uppercase: true,
        index: true
    },

    // Items sold
    items: [billItemSchema],

    // Financial Information
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    totalCost: {
        type: Number,
        default: 0,
        min: 0
    },
    profit: {
        type: Number,
        default: 0
    },
    profitMargin: {
        type: Number,
        default: 0
    },

    // Payment Information
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash', 'UPI', 'Card', 'Wallet'],
        default: 'Cash'
    },
    amountReceived: {
        type: Number,
        required: true,
        min: 0
    },
    change: {
        type: Number,
        default: 0,
        min: 0
    },

    // Customer Information
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        index: true
    },
    customerNumber: {
        type: String,
        index: true
    },
    customerName: {
        type: String
    },
    customerPhone: {
        type: String,
        index: true
    },

    // Metadata
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cashierName: {
        type: String,
        required: true
    },
    referenceNumber: {
        type: String,
        index: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
billSchema.index({ billNumber: 1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ cashier: 1, createdAt: -1 });
billSchema.index({ customer: 1, createdAt: -1 });
billSchema.index({ customerPhone: 1, createdAt: -1 });
// Compound index for optimized customer analytics queries (supports $or queries)
billSchema.index({ customer: 1, customerPhone: 1, createdAt: -1 });
billSchema.index({ referenceNumber: 1 });
billSchema.index({ 'items.product': 1 });
billSchema.index({ profit: 1 }); // For profit analytics
billSchema.index({ createdAt: -1, profit: 1 }); // For profit trends

// Virtual for formatted date
billSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Pre-save middleware to calculate profit (ensures profit is always stored)
billSchema.pre('save', function (next) {
    // Calculate total cost if not set or if items exist
    if ((this.totalCost === 0 || !this.totalCost) && this.items.length > 0) {
        this.totalCost = this.items.reduce((sum, item) => {
            return sum + ((item.costPrice || 0) * item.quantity);
        }, 0);
    }

    // Always calculate profit: revenue - cost
    // Use totalAmount (actual billed amount) as revenue
    this.profit = (this.totalAmount || 0) - (this.totalCost || 0);

    // Always calculate profit margin
    if (this.totalAmount > 0) {
        this.profitMargin = parseFloat(((this.profit / this.totalAmount) * 100).toFixed(2));
    } else {
        this.profitMargin = 0;
    }

    next();
});

// Static method to find bills by date range
billSchema.statics.findByDateRange = function (startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }
    return this.find(filter).sort({ createdAt: -1 });
};

// Static method to get daily sales summary
billSchema.statics.getDailySummary = function (date) {
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
                _id: null,
                totalBills: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                totalCost: { $sum: '$totalCost' },
                totalProfit: { $sum: '$profit' },
                totalItems: { $sum: { $sum: '$items.quantity' } },
                averageProfit: { $avg: '$profit' },
                averageProfitMargin: { $avg: '$profitMargin' }
            }
        }
    ]);
};

// Static method to get profit analytics for a date range
billSchema.statics.getProfitAnalytics = function (startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    return this.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                totalBills: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                totalCost: { $sum: '$totalCost' },
                totalProfit: { $sum: '$profit' },
                averageProfit: { $avg: '$profit' },
                averageProfitMargin: { $avg: '$profitMargin' },
                minProfit: { $min: '$profit' },
                maxProfit: { $max: '$profit' },
                totalItems: { $sum: { $sum: '$items.quantity' } }
            }
        },
        {
            $addFields: {
                overallProfitMargin: {
                    $cond: [
                        { $gt: ['$totalRevenue', 0] },
                        { $multiply: [{ $divide: ['$totalProfit', '$totalRevenue'] }, 100] },
                        0
                    ]
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Bill', billSchema);

