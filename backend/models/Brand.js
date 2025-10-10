const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Brand name is required'],
        trim: true,
        unique: true,
        minlength: [2, 'Brand name must be at least 2 characters long'],
        maxlength: [100, 'Brand name cannot exceed 100 characters'],
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    logo: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v) return true; // Optional field
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v);
            },
            message: 'Please provide a valid logo URL'
        }
    },
    website: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v) return true; // Optional field
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Please provide a valid website URL'
        }
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    contactPhone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },

    // Business Information
    country: {
        type: String,
        trim: true,
        maxlength: [50, 'Country name cannot exceed 50 characters']
    },
    foundedYear: {
        type: Number,
        min: [1800, 'Founded year must be after 1800'],
        max: [new Date().getFullYear(), 'Founded year cannot be in the future']
    },
    category: {
        type: String,
        trim: true,
        lowercase: true,
        // Note: Should ideally be a reference to Category model
        // Kept as string for flexibility with legacy data
    },

    // Status & Tracking
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isVerified: {
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

    // Statistics
    productCount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalSales: {
        type: Number,
        default: 0,
        min: 0
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for brand status
brandSchema.virtual('status').get(function () {
    if (!this.isActive) return 'inactive';
    if (this.isVerified) return 'verified';
    return 'active';
});

// Virtual for formatted rating
brandSchema.virtual('formattedRating').get(function () {
    return this.rating.average ? `${this.rating.average.toFixed(1)} (${this.rating.count} reviews)` : 'No ratings';
});

// Virtual for brand age
brandSchema.virtual('age').get(function () {
    if (!this.foundedYear) return null;
    return new Date().getFullYear() - this.foundedYear;
});

// Indexes for better query performance
brandSchema.index({ name: 'text', description: 'text' }); // Text search
brandSchema.index({ name: 1 }, { unique: true });
brandSchema.index({ category: 1, isActive: 1 });
brandSchema.index({ isActive: 1, isVerified: 1 });
brandSchema.index({ 'rating.average': -1 });
brandSchema.index({ productCount: -1 });
brandSchema.index({ totalSales: -1 });
brandSchema.index({ createdAt: -1 });

// Pre-save middleware
brandSchema.pre('save', function (next) {
    // Ensure name is title case
    if (this.name) {
        this.name = this.name.replace(/\b\w/g, l => l.toUpperCase());
    }

    // Ensure website has protocol
    if (this.website && !this.website.startsWith('http')) {
        this.website = 'https://' + this.website;
    }

    next();
});

// Pre-update middleware to track who updated
brandSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
    if (this.getUpdate) {
        this.getUpdate().updatedBy = this.getQuery()._id || this.getQuery().id;
    }
    next();
});

// Static method to find active brands
brandSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find verified brands
brandSchema.statics.findVerified = function () {
    return this.find({ isActive: true, isVerified: true }).sort({ name: 1 });
};

// Static method to find brands by category
brandSchema.statics.findByCategory = function (category) {
    return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to search brands
brandSchema.statics.searchBrands = function (query) {
    return this.find({
        $text: { $search: query },
        isActive: true
    }, {
        score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } });
};

// Static method to get brand statistics
brandSchema.statics.getBrandStats = function () {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalBrands: { $sum: 1 },
                verifiedBrands: {
                    $sum: { $cond: ['$isVerified', 1, 0] }
                },
                totalProducts: { $sum: '$productCount' },
                averageRating: { $avg: '$rating.average' }
            }
        }
    ]);
};

// Static method to get top brands by sales
brandSchema.statics.getTopBrands = function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ totalSales: -1 })
        .limit(limit)
        .select('name logo totalSales productCount rating');
};

// Instance method to update product count
brandSchema.methods.updateProductCount = function () {
    return mongoose.model('Product').countDocuments({ 
        brand: this.name, 
        isActive: true 
    }).then(count => {
        this.productCount = count;
        return this.save();
    });
};

// Instance method to add rating
brandSchema.methods.addRating = function (newRating) {
    const totalRating = this.rating.average * this.rating.count + newRating;
    this.rating.count += 1;
    this.rating.average = totalRating / this.rating.count;
    return this.save();
};

// Instance method to update sales
brandSchema.methods.updateSales = function (amount) {
    this.totalSales += amount;
    return this.save();
};

module.exports = mongoose.model('Brand', brandSchema);
