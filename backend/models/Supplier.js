const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Supplier name is required'],
        trim: true,
        minlength: [2, 'Supplier name must be at least 2 characters long'],
        maxlength: [100, 'Supplier name cannot exceed 100 characters'],
        index: true
    },
    code: {
        type: String,
        unique: true,
        required: [true, 'Supplier code is required'],
        trim: true,
        uppercase: true
    },

    // Contact Information
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    alternatePhone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    address: {
        street: {
            type: String,
            trim: true,
            maxlength: [200, 'Street address cannot exceed 200 characters']
        },
        city: {
            type: String,
            trim: true,
            maxlength: [50, 'City name cannot exceed 50 characters']
        },
        state: {
            type: String,
            trim: true,
            maxlength: [50, 'State name cannot exceed 50 characters']
        },
        pincode: {
            type: String,
            trim: true,
            match: [/^\d{6}$/, 'Pincode must be 6 digits']
        },
        country: {
            type: String,
            default: 'India',
            trim: true
        }
    },

    // Business Information
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true,
        match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number']
    },
    panNumber: {
        type: String,
        trim: true,
        uppercase: true,
        match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
    },
    creditLimit: {
        type: Number,
        default: 0,
        min: [0, 'Credit limit cannot be negative']
    },
    paymentTerms: {
        type: Number,
        default: 30,
        min: [0, 'Payment terms cannot be negative'],
        max: [365, 'Payment terms cannot exceed 365 days']
    },

    // Status & Rating
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        default: 3
    },
    totalOrders: {
        type: Number,
        default: 0,
        min: [0, 'Total orders cannot be negative']
    },
    totalAmount: {
        type: Number,
        default: 0,
        min: [0, 'Total amount cannot be negative']
    },

    // Additional Information
    contactPerson: {
        name: {
            type: String,
            trim: true
        },
        designation: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true
        }
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full address
supplierSchema.virtual('fullAddress').get(function () {
    const addr = this.address;
    if (!addr.street) return '';

    return [
        addr.street,
        addr.city,
        addr.state,
        addr.pincode,
        addr.country
    ].filter(Boolean).join(', ');
});

// Virtual for supplier summary
supplierSchema.virtual('summary').get(function () {
    return {
        id: this._id,
        name: this.name,
        code: this.code,
        email: this.email,
        phone: this.phone,
        isActive: this.isActive,
        rating: this.rating,
        totalOrders: this.totalOrders
    };
});

// Indexes for better query performance
supplierSchema.index({ code: 1 }, { unique: true });
supplierSchema.index({ email: 1 });
supplierSchema.index({ phone: 1 });
supplierSchema.index({ 'address.city': 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ rating: -1 });
supplierSchema.index({ createdAt: -1 });

// Pre-save middleware
supplierSchema.pre('save', function (next) {
    // Ensure code is uppercase
    if (this.code) {
        this.code = this.code.toUpperCase();
    }

    // Ensure GST and PAN numbers are uppercase
    if (this.gstNumber) {
        this.gstNumber = this.gstNumber.toUpperCase();
    }
    if (this.panNumber) {
        this.panNumber = this.panNumber.toUpperCase();
    }

    next();
});

// Static method to find active suppliers
supplierSchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to find suppliers by city
supplierSchema.statics.findByCity = function (city) {
    return this.find({
        'address.city': new RegExp(city, 'i'),
        isActive: true
    });
};

// Static method to get top suppliers by rating
supplierSchema.statics.getTopRated = function (limit = 10) {
    return this.find({ isActive: true })
        .sort({ rating: -1, totalOrders: -1 })
        .limit(limit);
};

// Static method to get supplier statistics
supplierSchema.statics.getStatistics = function () {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalSuppliers: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                totalOrders: { $sum: '$totalOrders' },
                totalAmount: { $sum: '$totalAmount' },
                topSupplier: {
                    $max: {
                        name: '$name',
                        rating: '$rating',
                        totalOrders: '$totalOrders'
                    }
                }
            }
        }
    ]);
};

// Instance method to update supplier statistics
supplierSchema.methods.updateStats = function (orderAmount) {
    this.totalOrders += 1;
    this.totalAmount += orderAmount;
    return this.save();
};

// Instance method to update rating
supplierSchema.methods.updateRating = function (newRating) {
    // Simple average calculation - in production, you might want more sophisticated rating logic
    this.rating = ((this.rating + newRating) / 2).toFixed(1);
    return this.save();
};

module.exports = mongoose.model('Supplier', supplierSchema);
