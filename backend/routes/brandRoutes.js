const express = require('express');
const router = express.Router();
const { protect, authorize, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { brandValidation } = require('../middleware/validators');
const Brand = require('../models/Brand');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get brand statistics
// @route   GET /api/brands/stats/overview
// @access  Private (Admin/Manager)
router.get('/stats/overview',
    protect,
    requirePermission('read_reports'),
    asyncHandler(async (req, res) => {
        const stats = await Brand.getBrandStats();

        const topBrands = await Brand.getTopBrands(5);

        const categoryStats = await Brand.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalProducts: { $sum: '$productCount' },
                    averageRating: { $avg: '$rating.average' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalBrands: 0,
                    verifiedBrands: 0,
                    totalProducts: 0,
                    averageRating: 0
                },
                topBrands,
                categoryStats
            }
        });
    })
);

// @desc    Search brands
// @route   GET /api/brands/search/:query
// @access  Public
router.get('/search/:query', asyncHandler(async (req, res) => {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const brands = await Brand.searchBrands(query)
        .limit(parseInt(limit))
        .select('name logo category isVerified rating productCount');

    res.json({
        success: true,
        count: brands.length,
        data: brands
    });
}));

// @desc    Get brands by category
// @route   GET /api/brands/category/:category
// @access  Public
router.get('/category/:category', asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const brands = await Brand.findByCategory(category)
        .limit(parseInt(limit))
        .select('name logo description rating productCount isVerified');

    res.json({
        success: true,
        count: brands.length,
        data: brands
    });
}));

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search,
        category,
        isActive,
        isVerified,
        sortBy = 'name',
        sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};

    if (isActive !== undefined && isActive !== 'all') {
        query.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
        query.isVerified = isVerified === 'true';
    }

    if (category) {
        query.category = category;
    }

    if (search) {
        query.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const brands = await Brand.find(query)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Brand.countDocuments(query);

    res.json({
        success: true,
        count: brands.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: brands
    });
}));

// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const brand = await Brand.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

    if (!brand) {
        return res.status(404).json({
            success: false,
            message: 'Brand not found'
        });
    }

    // Get products for this brand
    const products = await Product.find({
        brand: brand.name,
        isActive: true
    }).select('name sku currentStock sellingPrice').limit(10);

    res.json({
        success: true,
        data: {
            ...brand.toObject(),
            recentProducts: products
        }
    });
}));

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private (Admin/Manager)
router.post('/',
    protect,
    requirePermission('manage_settings'),
    validateRequest(brandValidation.create),
    asyncHandler(async (req, res) => {
        // Check if brand already exists
        const existingBrand = await Brand.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
        });

        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Brand with this name already exists'
            });
        }

        const brand = await Brand.create({
            ...req.body,
            createdBy: req.user._id
        });

        await brand.populate('createdBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: brand
        });
    })
);

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private (Admin/Manager)
router.put('/:id',
    protect,
    requirePermission('manage_settings'),
    validateRequest(brandValidation.update),
    asyncHandler(async (req, res) => {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        // Check if name is being changed and if it conflicts
        if (req.body.name && req.body.name !== brand.name) {
            const existingBrand = await Brand.findOne({
                name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingBrand) {
                return res.status(400).json({
                    success: false,
                    message: 'Brand with this name already exists'
                });
            }
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        res.json({
            success: true,
            message: 'Brand updated successfully',
            data: updatedBrand
        });
    })
);

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private (Admin only)
router.delete('/:id',
    protect,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        // Check if brand has products
        const productCount = await Product.countDocuments({
            brand: brand.name,
            isActive: true
        });

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete brand. It has ${productCount} active products. Please reassign or deactivate products first.`
            });
        }

        await Brand.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    })
);

// @desc    Toggle brand status
// @route   PATCH /api/brands/:id/toggle-status
// @access  Private (Admin/Manager)
router.patch('/:id/toggle-status',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        brand.isActive = !brand.isActive;
        brand.updatedBy = req.user._id;
        await brand.save();

        res.json({
            success: true,
            message: `Brand ${brand.isActive ? 'activated' : 'deactivated'} successfully`,
            data: brand
        });
    })
);

// @desc    Verify brand
// @route   PATCH /api/brands/:id/verify
// @access  Private (Admin only)
router.patch('/:id/verify',
    protect,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        brand.isVerified = !brand.isVerified;
        brand.updatedBy = req.user._id;
        await brand.save();

        res.json({
            success: true,
            message: `Brand ${brand.isVerified ? 'verified' : 'unverified'} successfully`,
            data: brand
        });
    })
);

// @desc    Update brand product count
// @route   PATCH /api/brands/:id/update-product-count
// @access  Private (Admin/Manager)
router.patch('/:id/update-product-count',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const brand = await Brand.findById(req.params.id);

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        await brand.updateProductCount();

        res.json({
            success: true,
            message: 'Product count updated successfully',
            data: brand
        });
    })
);

module.exports = router;
