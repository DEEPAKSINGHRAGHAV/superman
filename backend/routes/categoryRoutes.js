const express = require('express');
const router = express.Router();
const { protect, authorize, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { categoryValidation } = require('../middleware/validators');
const Category = require('../models/Category');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get category statistics
// @route   GET /api/categories/stats/overview
// @access  Private (Admin/Manager)
router.get('/stats/overview',
    protect,
    requirePermission('read_reports'),
    asyncHandler(async (req, res) => {
        const stats = await Category.getCategoryStats();

        const featuredCategories = await Category.findFeatured();

        const topCategories = await Category.aggregate([
            { $match: { isActive: true } },
            { $sort: { productCount: -1 } },
            { $limit: 10 },
            { $project: { name: 1, productCount: 1, subcategoryCount: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: stats[0] || {
                    totalCategories: 0,
                    mainCategories: 0,
                    subcategories: 0,
                    totalProducts: 0,
                    featuredCategories: 0
                },
                featuredCategories,
                topCategories
            }
        });
    })
);

// @desc    Get category tree
// @route   GET /api/categories/tree
// @access  Public
router.get('/tree', asyncHandler(async (req, res) => {
    const tree = await Category.getCategoryTree();

    res.json({
        success: true,
        count: tree.length,
        data: tree
    });
}));

// @desc    Get main categories
// @route   GET /api/categories/main
// @access  Public
router.get('/main', asyncHandler(async (req, res) => {
    const categories = await Category.findMainCategories();

    res.json({
        success: true,
        count: categories.length,
        data: categories
    });
}));

// @desc    Search categories
// @route   GET /api/categories/search/:query
// @access  Public
router.get('/search/:query', asyncHandler(async (req, res) => {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const categories = await Category.searchCategories(query)
        .limit(parseInt(limit))
        .select('name slug description icon color productCount level');

    res.json({
        success: true,
        count: categories.length,
        data: categories
    });
}));

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search,
        level,
        parentCategory,
        isActive = true,
        isFeatured,
        sortBy = 'sortOrder',
        sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};

    if (isActive !== 'all') {
        query.isActive = isActive === 'true';
    }

    if (isFeatured !== undefined) {
        query.isFeatured = isFeatured === 'true';
    }

    if (level !== undefined) {
        query.level = parseInt(level);
    }

    if (parentCategory) {
        if (parentCategory === 'null') {
            query.parentCategory = null;
        } else {
            query.parentCategory = parentCategory;
        }
    }

    if (search) {
        query.name = { $regex: search, $options: 'i' }; // Case-insensitive partial match
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const categories = await Category.find(query)
        .populate('parentCategory', 'name slug')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Category.countDocuments(query);

    res.json({
        success: true,
        count: categories.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: categories
    });
}));

// @desc    Get subcategories
// @route   GET /api/categories/:parentId/subcategories
// @access  Public
router.get('/:parentId/subcategories', asyncHandler(async (req, res) => {
    const { parentId } = req.params;

    const subcategories = await Category.findSubcategories(parentId);

    res.json({
        success: true,
        count: subcategories.length,
        data: subcategories
    });
}));

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id)
        .populate('parentCategory', 'name slug')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

    if (!category) {
        return res.status(404).json({
            success: false,
            message: 'Category not found'
        });
    }

    // Get subcategories if this is a main category
    let subcategories = [];
    if (!category.parentCategory) {
        subcategories = await Category.findSubcategories(category._id);
    }

    // Get products for this category
    const products = await Product.find({
        category: category.slug,
        isActive: true
    }).select('name sku currentStock sellingPrice brand').limit(10);

    res.json({
        success: true,
        data: {
            ...category.toObject(),
            subcategories,
            recentProducts: products
        }
    });
}));

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin/Manager)
router.post('/',
    protect,
    requirePermission('manage_settings'),
    validateRequest(categoryValidation.create),
    asyncHandler(async (req, res) => {
        // Check if category already exists
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }

        // Check if slug already exists
        const existingSlug = await Category.findOne({
            slug: req.body.slug || req.body.name.toLowerCase().replace(/\s+/g, '-')
        });

        if (existingSlug) {
            return res.status(400).json({
                success: false,
                message: 'Category with this slug already exists'
            });
        }

        // Validate parent category if provided
        if (req.body.parentCategory) {
            const parentCategory = await Category.findById(req.body.parentCategory);
            if (!parentCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent category not found'
                });
            }
            if (parentCategory.level >= 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot create subcategory beyond level 2'
                });
            }
        }

        const category = await Category.create({
            ...req.body,
            createdBy: req.user._id
        });

        await category.populate('parentCategory', 'name slug');
        await category.populate('createdBy', 'name email');

        // Update parent category's subcategory count
        if (category.parentCategory) {
            await category.parentCategory.updateSubcategoryCount();
        }

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    })
);

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin/Manager)
router.put('/:id',
    protect,
    requirePermission('manage_settings'),
    validateRequest(categoryValidation.update),
    asyncHandler(async (req, res) => {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if name is being changed and if it conflicts
        if (req.body.name && req.body.name !== category.name) {
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }
        }

        // Check if slug is being changed and if it conflicts
        if (req.body.slug && req.body.slug !== category.slug) {
            const existingSlug = await Category.findOne({
                slug: req.body.slug,
                _id: { $ne: req.params.id }
            });

            if (existingSlug) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this slug already exists'
                });
            }
        }

        // Validate parent category if being changed
        if (req.body.parentCategory !== undefined) {
            if (req.body.parentCategory) {
                const parentCategory = await Category.findById(req.body.parentCategory);
                if (!parentCategory) {
                    return res.status(400).json({
                        success: false,
                        message: 'Parent category not found'
                    });
                }
                if (parentCategory.level >= 2) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot set parent beyond level 2'
                    });
                }
                // Prevent setting self as parent
                if (req.body.parentCategory === req.params.id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Category cannot be its own parent'
                    });
                }
            }
        }

        const oldParentId = category.parentCategory;

        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                updatedBy: req.user._id
            },
            { new: true, runValidators: true }
        ).populate('parentCategory', 'name slug')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        // Update subcategory counts for old and new parents
        if (oldParentId && oldParentId.toString() !== updatedCategory.parentCategory?._id?.toString()) {
            const oldParent = await Category.findById(oldParentId);
            if (oldParent) {
                await oldParent.updateSubcategoryCount();
            }
        }

        if (updatedCategory.parentCategory) {
            await updatedCategory.parentCategory.updateSubcategoryCount();
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: updatedCategory
        });
    })
);

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
router.delete('/:id',
    protect,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if category has products
        const productCount = await Product.countDocuments({
            category: category.slug,
            isActive: true
        });

        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. It has ${productCount} active products. Please reassign or deactivate products first.`
            });
        }

        // Check if category has subcategories
        const subcategoryCount = await Category.countDocuments({
            parentCategory: category._id,
            isActive: true
        });

        if (subcategoryCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. It has ${subcategoryCount} active subcategories. Please delete or reassign subcategories first.`
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        // Update parent category's subcategory count
        if (category.parentCategory) {
            const parentCategory = await Category.findById(category.parentCategory);
            if (parentCategory) {
                await parentCategory.updateSubcategoryCount();
            }
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    })
);

// @desc    Toggle category status
// @route   PATCH /api/categories/:id/toggle-status
// @access  Private (Admin/Manager)
router.patch('/:id/toggle-status',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        category.isActive = !category.isActive;
        category.updatedBy = req.user._id;
        await category.save();

        res.json({
            success: true,
            message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
            data: category
        });
    })
);

// @desc    Toggle category featured status
// @route   PATCH /api/categories/:id/toggle-featured
// @access  Private (Admin/Manager)
router.patch('/:id/toggle-featured',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        category.isFeatured = !category.isFeatured;
        category.updatedBy = req.user._id;
        await category.save();

        res.json({
            success: true,
            message: `Category ${category.isFeatured ? 'featured' : 'unfeatured'} successfully`,
            data: category
        });
    })
);

// @desc    Update category product count
// @route   PATCH /api/categories/:id/update-product-count
// @access  Private (Admin/Manager)
router.patch('/:id/update-product-count',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await category.updateProductCount();

        res.json({
            success: true,
            message: 'Product count updated successfully',
            data: category
        });
    })
);

// @desc    Reorder categories
// @route   PATCH /api/categories/reorder
// @access  Private (Admin/Manager)
router.patch('/reorder',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        const { categories } = req.body;

        if (!Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                message: 'Categories must be an array'
            });
        }

        const updatePromises = categories.map((cat, index) =>
            Category.findByIdAndUpdate(cat.id, { sortOrder: index })
        );

        await Promise.all(updatePromises);

        res.json({
            success: true,
            message: 'Categories reordered successfully'
        });
    })
);

module.exports = router;
