const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [2, 'Product name must be at least 2 characters long'],
        maxlength: [100, 'Product name cannot exceed 100 characters'],
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    sku: {
        type: String,
        unique: true,
        required: [true, 'SKU is required'],
        trim: true,
        uppercase: true
    },
    barcode: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },

    // Pricing Information
    mrp: {
        type: Number,
        required: [true, 'MRP is required'],
        min: [0, 'MRP cannot be negative']
    },
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

    // Inventory
    currentStock: {
        type: Number,
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    minStockLevel: {
        type: Number,
        default: 0,
        min: [0, 'Minimum stock level cannot be negative']
    },
    maxStockLevel: {
        type: Number,
        default: 1000,
        min: [0, 'Maximum stock level cannot be negative']
    },

    // Category & Classification
    category: {
        type: String,
        required: [true, 'Category is required'],
        index: true,
        trim: true,
        lowercase: true,
        // Note: Category should match slug from Category model
        // Enum removed to allow dynamic categories from database
    },
    subcategory: {
        type: String,
        trim: true
    },
    brand: {
        type: String,
        trim: true
    },

    // Additional Fields
    unit: {
        type: String,
        default: 'pcs',
        enum: ['pcs', 'kg', 'liter', 'gram', 'ml', 'box', 'pack']
    },
    weight: {
        type: Number,
        min: [0, 'Weight cannot be negative']
    },
    dimensions: {
        length: {
            type: Number,
            min: [0, 'Length cannot be negative']
        },
        width: {
            type: Number,
            min: [0, 'Width cannot be negative']
        },
        height: {
            type: Number,
            min: [0, 'Height cannot be negative']
        }
    },

    // Status & Tracking
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    expiryDate: {
        type: Date
    },
    batchNumber: {
        type: String,
        trim: true
    },

    // Legacy fields for compatibility
    images: [{
        type: String,
        validate: {
            validator: function (v) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Please provide a valid image URL'
        }
    }],
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    featured: {
        type: Boolean,
        default: false
    },
    rating: {
        average: {
            type: Number,
            min: 0,
            max: 5,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for product availability
productSchema.virtual('isAvailable').get(function () {
    return this.currentStock > 0 && this.isActive;
});

// Virtual for low stock alert
productSchema.virtual('isLowStock').get(function () {
    return this.currentStock <= this.minStockLevel;
});

// Virtual for formatted prices
productSchema.virtual('formattedMRP').get(function () {
    return this.mrp ? `₹${this.mrp.toFixed(2)}` : '₹0.00';
});

productSchema.virtual('formattedCostPrice').get(function () {
    return this.costPrice ? `₹${this.costPrice.toFixed(2)}` : '₹0.00';
});

productSchema.virtual('formattedSellingPrice').get(function () {
    return this.sellingPrice ? `₹${this.sellingPrice.toFixed(2)}` : '₹0.00';
});

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function () {
    if (!this.sellingPrice || !this.costPrice || this.sellingPrice === 0) {
        return '0.00';
    }
    return ((this.sellingPrice - this.costPrice) / this.sellingPrice * 100).toFixed(2);
});

// Virtual for total inventory value
productSchema.virtual('inventoryValue').get(function () {
    return (this.currentStock || 0) * (this.costPrice || 0);
});

// Virtual to populate batches
productSchema.virtual('batches', {
    ref: 'InventoryBatch',
    localField: '_id',
    foreignField: 'product',
    match: { status: 'active', currentQuantity: { $gt: 0 } }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' }); // Text search
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ currentStock: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ featured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware
productSchema.pre('save', function (next) {
    // Ensure tags are unique and lowercase
    if (this.tags) {
        this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase()))];
    }

    // Ensure SKU is uppercase
    if (this.sku) {
        this.sku = this.sku.toUpperCase();
    }

    // Ensure selling price is not less than cost price
    if (this.sellingPrice < this.costPrice) {
        return next(new Error('Selling price cannot be less than cost price'));
    }

    next();
});

// Static method to find featured products
productSchema.statics.findFeatured = function () {
    return this.find({ featured: true, isActive: true });
};

// Static method to find products by category
productSchema.statics.findByCategory = function (category) {
    return this.find({ category: category, isActive: true });
};

// Static method to find low stock products
productSchema.statics.findLowStock = function () {
    return this.find({
        $expr: { $lte: ['$currentStock', '$minStockLevel'] },
        isActive: true
    });
};

// Static method to search products
productSchema.statics.searchProducts = function (query) {
    return this.find({
        $text: { $search: query },
        isActive: true
    }, {
        score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } });
};

// Static method to get all categories
productSchema.statics.getCategories = function () {
    return this.distinct('category', { isActive: true });
};

// Static method to get inventory summary
productSchema.statics.getInventorySummary = function () {
    return this.aggregate([
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
                }
            }
        }
    ]);
};

// Static method to get product with batch information
productSchema.statics.findWithBatches = function (productId) {
    return this.findById(productId).populate({
        path: 'batches',
        options: { sort: { purchaseDate: 1 } }, // FIFO order
        populate: { path: 'supplier', select: 'name code' }
    });
};

// Instance method to update stock (atomic operation)
productSchema.methods.updateStock = function (quantity, reason = 'adjustment') {
    const previousStock = this.currentStock;
    const newStock = Math.max(0, previousStock + quantity);

    if (newStock < 0) {
        throw new Error('Insufficient stock');
    }

    this.currentStock = newStock;
    return this.save();
};

// Instance method to add rating
productSchema.methods.addRating = function (newRating) {
    const totalRating = this.rating.average * this.rating.count + newRating;
    this.rating.count += 1;
    this.rating.average = totalRating / this.rating.count;
    return this.save();
};

module.exports = mongoose.model('Product', productSchema);
