const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
    // Order Information
    orderNumber: {
        type: String,
        unique: true,
        trim: true,
        uppercase: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: [true, 'Supplier is required']
    },

    // Items
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product is required']
        },
        quantity: {
            type: Number,
            required: [true, 'Quantity is required'],
            min: [1, 'Quantity must be at least 1']
        },
        costPrice: {
            type: Number,
            required: [true, 'Cost price is required'],
            min: [0, 'Cost price cannot be negative']
        },
        sellingPrice: {
            type: Number,
            min: [0, 'Selling price cannot be negative']
        },
        mrp: {
            type: Number,
            min: [0, 'MRP cannot be negative']
        },
        totalAmount: {
            type: Number,
            required: [true, 'Total amount is required'],
            min: [0, 'Total amount cannot be negative']
        },
        expiryDate: {
            type: Date
        }
    }],

    // Financial Information
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal cannot be negative']
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: [0, 'Tax amount cannot be negative']
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: [0, 'Discount amount cannot be negative']
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: [0, 'Total amount cannot be negative']
    },

    // Status & Dates
    status: {
        type: String,
        enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
        default: 'pending',
        index: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date
    },
    actualDeliveryDate: {
        type: Date
    },

    // Additional Information
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'credit', 'cheque', 'online', 'other'],
        default: 'credit'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'paid'],
        default: 'pending'
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by is required']
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for order summary
purchaseOrderSchema.virtual('orderSummary').get(function () {
    return {
        orderNumber: this.orderNumber,
        supplier: this.supplier,
        totalItems: this.items.length,
        totalAmount: this.totalAmount,
        status: this.status,
        orderDate: this.orderDate
    };
});

// Virtual for days until expected delivery
purchaseOrderSchema.virtual('daysUntilDelivery').get(function () {
    if (!this.expectedDeliveryDate) return null;

    const today = new Date();
    const deliveryDate = new Date(this.expectedDeliveryDate);
    const diffTime = deliveryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
});

// Indexes for better query performance
purchaseOrderSchema.index({ orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ supplier: 1, status: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ createdBy: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Pre-save middleware
purchaseOrderSchema.pre('save', function (next) {
    // Generate order number if not provided
    if (!this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `PO${year}${month}${day}${random}`;
    }

    // Calculate totals
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
    this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;

    // Update status timestamps
    if (this.isModified('status')) {
        if (this.status === 'approved' && !this.approvedAt) {
            this.approvedAt = new Date();
        }
        if (this.status === 'received' && !this.actualDeliveryDate) {
            this.actualDeliveryDate = new Date();
        }
    }

    next();
});

// Static method to find orders by status
purchaseOrderSchema.statics.findByStatus = function (status) {
    return this.find({ status }).populate('supplier', 'name code email').populate('items.product', 'name sku');
};

// Static method to find pending orders
purchaseOrderSchema.statics.findPending = function () {
    return this.findByStatus('pending');
};

// Static method to find overdue orders
purchaseOrderSchema.statics.findOverdue = function () {
    const today = new Date();
    return this.find({
        status: { $in: ['ordered', 'approved'] },
        expectedDeliveryDate: { $lt: today }
    }).populate('supplier', 'name code email');
};

// Static method to get order statistics
purchaseOrderSchema.statics.getStatistics = function () {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                averageAmount: { $avg: '$totalAmount' }
            }
        },
        {
            $group: {
                _id: null,
                statusBreakdown: {
                    $push: {
                        status: '$_id',
                        count: '$count',
                        totalAmount: '$totalAmount',
                        averageAmount: '$averageAmount'
                    }
                },
                totalOrders: { $sum: '$count' },
                totalValue: { $sum: '$totalAmount' }
            }
        }
    ]);
};

// Static method to get monthly orders
purchaseOrderSchema.statics.getMonthlyOrders = function (year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return this.find({
        orderDate: { $gte: startDate, $lte: endDate }
    }).populate('supplier', 'name code');
};

// Instance method to approve order
purchaseOrderSchema.methods.approve = function (approvedBy) {
    if (this.status !== 'pending') {
        throw new Error('Only pending orders can be approved');
    }

    this.status = 'approved';
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();

    return this.save();
};

// Instance method to mark as received
purchaseOrderSchema.methods.markAsReceived = function () {
    if (this.status !== 'approved' && this.status !== 'ordered') {
        throw new Error('Order must be approved or ordered before marking as received');
    }

    this.status = 'received';
    this.actualDeliveryDate = new Date();

    return this.save();
};

// Instance method to cancel order
purchaseOrderSchema.methods.cancel = function (reason) {
    if (this.status === 'received') {
        throw new Error('Cannot cancel received orders');
    }

    this.status = 'cancelled';
    if (reason) {
        this.notes = (this.notes || '') + `\nCancellation reason: ${reason}`;
    }

    return this.save();
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
