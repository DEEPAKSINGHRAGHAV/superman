const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Product = require('../models/Product');
const InventoryService = require('../services/inventoryService');
const PricingService = require('../services/pricingService');
const BarcodeService = require('../services/barcodeService');
const asyncHandler = require('../middleware/asyncHandler');
const { protect, requirePermission, requireAnyPermission } = require('../middleware/auth');
const { validateRequest, validatePagination, validateDateRange } = require('../middleware/validation');
const { productValidation, queryValidation } = require('../middleware/validators');
const { productLimiter, searchLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting for performance and security
router.use(productLimiter);

// @desc    Get all products with pagination and filters
// @route   GET /api/v1/products
// @access  Private (requires read_products permission)
router.get('/',
    protect,
    requirePermission('read_products'),
    validatePagination,
    validateDateRange('createdAt', 'updatedAt'),
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { category, search, isActive, lowStock, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        // Build filter object
        const filter = {};

        if (category) {
            filter.category = category;
        }

        if (search) {
            // Escape special regex characters for safety
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            filter.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { sku: { $regex: escapedSearch, $options: 'i' } },
                { barcode: { $regex: escapedSearch, $options: 'i' } },
                { brand: { $regex: escapedSearch, $options: 'i' } },
                { description: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        if (lowStock === 'true') {
            filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter)
        ]);

        // Ensure all products have required fields with default values
        const sanitizedProducts = products.map(product => ({
            ...product,
            rating: product.rating || { average: 0, count: 0 },
            images: product.images || [],
            tags: product.tags || [],
            featured: product.featured || false,
            currentStock: product.currentStock || 0,
            minStockLevel: product.minStockLevel || 0,
            maxStockLevel: product.maxStockLevel || 1000,
            sellingPrice: product.sellingPrice || 0,
            costPrice: product.costPrice || 0,
            mrp: product.mrp || 0,
            name: product.name || 'Unnamed Product',
            sku: product.sku || 'N/A'
        }));

        res.status(200).json({
            success: true,
            count: sanitizedProducts.length,
            total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit
            },
            data: sanitizedProducts
        });
    })
);

// @desc    Search products (Fuzzy search with partial matching and typo tolerance)
// @route   GET /api/v1/products/search
// @access  Private (requires read_products permission)
router.get('/search',
    protect,
    requirePermission('read_products'),
    searchLimiter, // Re-enabled for production
    validateRequest(queryValidation.search),
    asyncHandler(async (req, res) => {
        const { search, limit = 20 } = req.query;

        console.log('Backend search endpoint called with:', { search, limit });

        if (!search || typeof search !== 'string') {
            console.log('Backend search: Invalid search query');
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        // Split search query into tokens (words)
        const searchTokens = search.toLowerCase().trim().split(/\s+/).filter(token => token.length > 0);

        if (searchTokens.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        // Build fuzzy search conditions for each token
        const fuzzyConditions = searchTokens.map(token => {
            // Escape special regex characters for exact match
            const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Create fuzzy patterns
            const patterns = [];

            // 1. Exact partial match (highest priority)
            patterns.push(escapedToken);

            // 2. Fuzzy match with character flexibility (allows typos)
            if (token.length >= 3) {
                const fuzzyPattern = token.split('').map((char, index) => {
                    return index === 0 ? char : `.?${char}`;
                }).join('');
                patterns.push(fuzzyPattern);
            }

            // 3. Very fuzzy match (character-by-character)
            if (token.length >= 4) {
                const veryFuzzyPattern = token.split('').join('.*');
                patterns.push(veryFuzzyPattern);
            }

            // Combine all patterns
            const combinedPattern = patterns.join('|');

            // Search across multiple fields
            return {
                $or: [
                    { name: { $regex: combinedPattern, $options: 'i' } },
                    { sku: { $regex: combinedPattern, $options: 'i' } },
                    { barcode: { $regex: combinedPattern, $options: 'i' } },
                    { brand: { $regex: combinedPattern, $options: 'i' } },
                    { category: { $regex: combinedPattern, $options: 'i' } },
                    { description: { $regex: combinedPattern, $options: 'i' } }
                ]
            };
        });

        // Combine all token conditions (all tokens must match somewhere)
        const query = {
            $and: fuzzyConditions,
            isActive: true
        };

        // Find products
        let products = await Product.find(query)
            .limit(parseInt(limit) * 2) // Get more results for scoring
            .select('name sku barcode category brand description currentStock costPrice sellingPrice mrp')
            .lean();

        // Score and rank results based on match quality
        const scoredProducts = products.map(product => {
            let score = 0;
            const searchLower = search.toLowerCase();
            const nameLower = (product.name || '').toLowerCase();
            const skuLower = (product.sku || '').toLowerCase();
            const brandLower = (product.brand || '').toLowerCase();

            // Exact match (highest score)
            if (nameLower === searchLower) score += 1000;
            if (skuLower === searchLower) score += 900;

            // Starts with (high score)
            if (nameLower.startsWith(searchLower)) score += 500;
            if (skuLower.startsWith(searchLower)) score += 450;
            if (brandLower.startsWith(searchLower)) score += 400;

            // Contains all search tokens
            searchTokens.forEach(token => {
                if (nameLower.includes(token)) score += 100;
                if (skuLower.includes(token)) score += 80;
                if (brandLower.includes(token)) score += 60;
            });

            // Word boundary matches (complete word match)
            searchTokens.forEach(token => {
                const wordRegex = new RegExp(`\\b${token}\\b`, 'i');
                if (wordRegex.test(product.name)) score += 150;
                if (wordRegex.test(product.brand)) score += 100;
            });

            // Proximity bonus (tokens close together)
            const allText = `${product.name} ${product.brand} ${product.sku}`.toLowerCase();
            if (searchTokens.length > 1) {
                const firstIndex = allText.indexOf(searchTokens[0]);
                const lastIndex = allText.indexOf(searchTokens[searchTokens.length - 1]);
                if (firstIndex !== -1 && lastIndex !== -1) {
                    const distance = Math.abs(lastIndex - firstIndex);
                    score += Math.max(0, 100 - distance);
                }
            }

            return { ...product, _score: score };
        });

        // Sort by score (descending) and limit results
        const rankedProducts = scoredProducts
            .sort((a, b) => b._score - a._score)
            .slice(0, parseInt(limit))
            .map(({ _score, ...product }) => product); // Remove score from response

        console.log('Backend search results:', {
            query: search,
            totalFound: products.length,
            returned: rankedProducts.length,
            productNames: rankedProducts.map(p => p.name)
        });

        res.status(200).json({
            success: true,
            count: rankedProducts.length,
            data: rankedProducts
        });
    })
);

// @desc    Get all categories
// @route   GET /api/v1/products/categories
// @access  Private (requires read_products permission)
router.get('/categories',
    protect,
    requirePermission('read_products'),
    asyncHandler(async (req, res) => {
        const categories = await Product.getCategories();

        res.status(200).json({
            success: true,
            data: categories
        });
    })
);

// @desc    Get low stock products
// @route   GET /api/v1/products/low-stock
// @access  Private (requires read_inventory permission)
router.get('/low-stock',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const products = await InventoryService.getLowStockAlerts();

        res.status(200).json({
            success: true,
            count: products.length,
            data: products
        });
    })
);

// @desc    Get inventory summary
// @route   GET /api/v1/products/inventory-summary
// @access  Private (requires read_inventory permission)
router.get('/inventory-summary',
    protect,
    requirePermission('read_inventory'),
    asyncHandler(async (req, res) => {
        const summary = await InventoryService.getInventorySummary();

        res.status(200).json({
            success: true,
            data: summary
        });
    })
);

// @desc    Get product statistics overview
// @route   GET /api/v1/products/stats/overview
// @access  Private (requires read_reports permission)
router.get('/stats/overview',
    protect,
    requirePermission('read_reports'),
    asyncHandler(async (req, res) => {
        const [inventorySummary, categoryStats, brandStats] = await Promise.all([
            Product.getInventorySummary(),
            Product.aggregate([
                { $match: { isActive: true } },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        totalStock: { $sum: '$currentStock' },
                        totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            Product.aggregate([
                { $match: { isActive: true, brand: { $exists: true, $ne: '' } } },
                {
                    $group: {
                        _id: '$brand',
                        count: { $sum: 1 },
                        totalStock: { $sum: '$currentStock' },
                        totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const overview = inventorySummary[0] || {
            totalProducts: 0,
            totalStock: 0,
            totalValue: 0,
            lowStockCount: 0
        };

        res.status(200).json({
            success: true,
            data: {
                overview,
                categoryStats,
                brandStats
            }
        });
    })
);

// @desc    Get product by barcode
// @route   GET /api/v1/products/barcode/:barcode
// @access  Private (requires read_products permission)
router.get('/barcode/:barcode',
    protect,
    requirePermission('read_products'),
    asyncHandler(async (req, res) => {
        const product = await Product.findOne({
            barcode: req.params.barcode,
            isActive: true
        })
            .populate('createdBy', 'name email')
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found with this barcode'
            });
        }

        // Ensure all required fields have default values
        const sanitizedProduct = {
            ...product,
            rating: product.rating || { average: 0, count: 0 },
            images: product.images || [],
            tags: product.tags || [],
            featured: product.featured || false,
            currentStock: product.currentStock || 0,
            minStockLevel: product.minStockLevel || 0,
            maxStockLevel: product.maxStockLevel || 1000
        };

        res.status(200).json({
            success: true,
            data: sanitizedProduct
        });
    })
);

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Private (requires read_products permission)
router.get('/:id',
    protect,
    requirePermission('read_products'),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findById(req.params.id)
            .populate('createdBy', 'name email')
            .lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Ensure all required fields have default values
        const sanitizedProduct = {
            ...product,
            rating: product.rating || { average: 0, count: 0 },
            images: product.images || [],
            tags: product.tags || [],
            featured: product.featured || false,
            currentStock: product.currentStock || 0,
            minStockLevel: product.minStockLevel || 0,
            maxStockLevel: product.maxStockLevel || 1000
        };

        res.status(200).json({
            success: true,
            data: sanitizedProduct
        });
    })
);

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private (requires write_products permission)
router.post('/',
    protect,
    requirePermission('write_products'),
    validateRequest(productValidation.create),
    asyncHandler(async (req, res) => {
        try {
            console.log('Creating product with data:', JSON.stringify(req.body, null, 2));

            // Set createdBy to current user
            req.body.createdBy = req.user._id;

            // Auto-generate barcode if not provided
            const barcodeValue = req.body.barcode;
            const isEmptyBarcode = !barcodeValue || (typeof barcodeValue === 'string' && barcodeValue.trim() === '');
            
            if (isEmptyBarcode) {
                try {
                    const generatedBarcode = await BarcodeService.generateNextBarcode();
                    req.body.barcode = generatedBarcode;
                    console.log('Auto-generated barcode:', generatedBarcode);
                } catch (barcodeError) {
                    console.error('Error generating barcode:', barcodeError);
                    // Continue without barcode if generation fails
                    // The product can still be created without a barcode
                    delete req.body.barcode;
                }
            } else {
                // Validate provided barcode if it exists
                const trimmedBarcode = typeof barcodeValue === 'string' ? barcodeValue.trim() : String(barcodeValue).trim();
                if (trimmedBarcode) {
                    // Check if barcode already exists
                    const exists = await BarcodeService.barcodeExists(trimmedBarcode);
                    if (exists) {
                        return res.status(400).json({
                            success: false,
                            message: 'Barcode already exists'
                        });
                    }
                    req.body.barcode = trimmedBarcode;
                } else {
                    // Empty string after trim, generate barcode
                    try {
                        const generatedBarcode = await BarcodeService.generateNextBarcode();
                        req.body.barcode = generatedBarcode;
                        console.log('Auto-generated barcode (empty string):', generatedBarcode);
                    } catch (barcodeError) {
                        console.error('Error generating barcode:', barcodeError);
                        delete req.body.barcode;
                    }
                }
            }

            const product = await Product.create(req.body);

            console.log('Product created successfully:', product._id);

            res.status(201).json({
                success: true,
                data: product
            });
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    })
);

// @desc    Bulk create products
// @route   POST /api/v1/products/bulk
// @access  Private (requires write_products permission)
router.post('/bulk',
    protect,
    requirePermission('write_products'),
    asyncHandler(async (req, res) => {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Products array is required and cannot be empty'
            });
        }

        // Set createdBy for all products
        products.forEach(product => {
            product.createdBy = req.user._id;
        });

        const createdProducts = await Product.insertMany(products, { ordered: false });

        res.status(201).json({
            success: true,
            count: createdProducts.length,
            data: createdProducts
        });
    })
);

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (requires write_products permission)
router.put('/:id',
    protect,
    requirePermission('write_products'),
    validateRequest(productValidation.update),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            data: product
        });
    })
);

// @desc    Update product stock
// @route   PATCH /api/v1/products/:id/stock
// @access  Private (requires write_inventory permission)
router.patch('/:id/stock',
    protect,
    requirePermission('write_inventory'),
    validateRequest(productValidation.stockUpdate),
    asyncHandler(async (req, res) => {
        const { quantity, movementType, reason, notes } = req.body;

        const result = await InventoryService.updateStock(
            req.params.id,
            quantity,
            movementType,
            {
                reason,
                notes,
                createdBy: req.user._id
            }
        );

        res.status(200).json({
            success: true,
            message: 'Stock updated successfully',
            data: {
                product: result.product,
                stockMovement: result.stockMovement
            }
        });
    })
);

// @desc    Get product stock history
// @route   GET /api/v1/products/:id/stock-history
// @access  Private (requires read_inventory permission)
router.get('/:id/stock-history',
    protect,
    requirePermission('read_inventory'),
    validatePagination,
    asyncHandler(async (req, res) => {
        const { page, limit, skip } = req.pagination;
        const { movementType, startDate, endDate } = req.query;

        const result = await InventoryService.getProductStockHistory(
            req.params.id,
            {
                limit,
                skip,
                movementType,
                startDate,
                endDate
            }
        );

        res.status(200).json({
            success: true,
            data: result.movements,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(result.total / limit),
                hasNext: page < Math.ceil(result.total / limit),
                hasPrev: page > 1,
                limit,
                total: result.total
            }
        });
    })
);

// @desc    Soft delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (requires delete_products permission)
router.delete('/:id',
    protect,
    requirePermission('delete_products'),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deactivated successfully'
        });
    })
);

// @desc    Hard delete product
// @route   DELETE /api/v1/products/:id/force
// @access  Private (requires admin role)
router.delete('/:id/force',
    protect,
    requirePermission('manage_settings'),
    asyncHandler(async (req, res) => {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: 'Invalid product ID format'
            });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product permanently deleted'
        });
    })
);

module.exports = router;