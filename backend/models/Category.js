const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true,
        minlength: [2, 'Category name must be at least 2 characters long'],
        maxlength: [100, 'Category name cannot exceed 100 characters'],
        index: true
    },
    slug: {
        type: String,
        required: [true, 'Category slug is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    icon: {
        type: String,
        trim: true,
        default: 'category'
    },
    color: {
        type: String,
        trim: true,
        default: '#3B82F6',
        match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code']
    },
    image: {
        type: String,
        trim: true,
        validate: {
            validator: function (v) {
                if (!v) return true; // Optional field
                return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
            },
            message: 'Please provide a valid image URL'
        }
    },

    // Hierarchy
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    path: {
        type: String,
        trim: true
    },

    // Status & Display
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    sortOrder: {
        type: Number,
        default: 0
    },

    // Statistics
    productCount: {
        type: Number,
        default: 0,
        min: 0
    },
    subcategoryCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // SEO
    metaTitle: {
        type: String,
        trim: true,
        maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [{
        type: String,
        trim: true,
        lowercase: true
    }],

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

// Virtual for category status
categorySchema.virtual('status').get(function () {
    return this.isActive ? 'active' : 'inactive';
});

// Virtual for full category path
categorySchema.virtual('fullPath').get(function () {
    return this.path || this.name;
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentCategory',
    justOne: false
});

// Indexes for better query performance
categorySchema.index({ name: 'text', description: 'text' }); // Text search
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ level: 1, isActive: 1 });
categorySchema.index({ isActive: 1, isFeatured: 1 });
categorySchema.index({ sortOrder: 1 });
categorySchema.index({ productCount: -1 });
categorySchema.index({ createdAt: -1 });

// Pre-save middleware
categorySchema.pre('save', function (next) {
    // Generate slug if not provided
    if (!this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    // Set level based on parent category
    if (this.parentCategory) {
        this.level = 1; // Subcategory level
    } else {
        this.level = 0; // Main category level
    }

    // Generate path
    this.generatePath();

    // Ensure name is title case
    if (this.name) {
        this.name = this.name.replace(/\b\w/g, l => l.toUpperCase());
    }

    next();
});

// Pre-update middleware to track who updated
categorySchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
    if (this.getUpdate) {
        this.getUpdate().updatedBy = this.getQuery()._id || this.getQuery().id;
    }
    next();
});

// Method to generate category path
categorySchema.methods.generatePath = function () {
    if (this.parentCategory) {
        // For subcategories, we'll build the path when we have the parent
        return this.name;
    } else {
        this.path = this.name;
        return this.name;
    }
};

// Static method to find active categories
categorySchema.statics.findActive = function () {
    return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find main categories (no parent)
categorySchema.statics.findMainCategories = function () {
    return this.find({ 
        isActive: true, 
        parentCategory: null 
    }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find subcategories
categorySchema.statics.findSubcategories = function (parentId) {
    return this.find({ 
        isActive: true, 
        parentCategory: parentId 
    }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find featured categories
categorySchema.statics.findFeatured = function () {
    return this.find({ 
        isActive: true, 
        isFeatured: true 
    }).sort({ sortOrder: 1, name: 1 });
};

// Static method to search categories
categorySchema.statics.searchCategories = function (query) {
    return this.find({
        $text: { $search: query },
        isActive: true
    }, {
        score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } });
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = function () {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: 'parentCategory',
                as: 'subcategories'
            }
        },
        {
            $match: { parentCategory: null }
        },
        {
            $sort: { sortOrder: 1, name: 1 }
        }
    ]);
};

// Static method to get category statistics
categorySchema.statics.getCategoryStats = function () {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalCategories: { $sum: 1 },
                mainCategories: {
                    $sum: { $cond: [{ $eq: ['$parentCategory', null] }, 1, 0] }
                },
                subcategories: {
                    $sum: { $cond: [{ $ne: ['$parentCategory', null] }, 1, 0] }
                },
                totalProducts: { $sum: '$productCount' },
                featuredCategories: {
                    $sum: { $cond: ['$isFeatured', 1, 0] }
                }
            }
        }
    ]);
};

// Instance method to update product count
categorySchema.methods.updateProductCount = function () {
    return mongoose.model('Product').countDocuments({ 
        category: this.slug, 
        isActive: true 
    }).then(count => {
        this.productCount = count;
        return this.save();
    });
};

// Instance method to update subcategory count
categorySchema.methods.updateSubcategoryCount = function () {
    return this.constructor.countDocuments({ 
        parentCategory: this._id, 
        isActive: true 
    }).then(count => {
        this.subcategoryCount = count;
        return this.save();
    });
};

// Instance method to get all subcategories recursively
categorySchema.methods.getAllSubcategories = function () {
    return this.constructor.find({
        $or: [
            { parentCategory: this._id },
            { path: { $regex: `^${this.name} >` } }
        ],
        isActive: true
    }).sort({ sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('Category', categorySchema);
