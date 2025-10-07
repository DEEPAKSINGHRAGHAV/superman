const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const supplierRoutes = require('./supplierRoutes');
const purchaseOrderRoutes = require('./purchaseOrderRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const brandRoutes = require('./brandRoutes');
const categoryRoutes = require('./categoryRoutes');

const router = express.Router();

// Health routes with API version prefix
const apiVersion = process.env.API_VERSION || 'v1';
router.use(`/api/${apiVersion}`, healthRoutes);

// API routes with version prefix
router.use(`/api/${apiVersion}/auth`, authRoutes);
router.use(`/api/${apiVersion}/users`, userRoutes);
router.use(`/api/${apiVersion}/products`, productRoutes);
router.use(`/api/${apiVersion}/suppliers`, supplierRoutes);
router.use(`/api/${apiVersion}/purchase-orders`, purchaseOrderRoutes);
router.use(`/api/${apiVersion}/inventory`, inventoryRoutes);
router.use(`/api/${apiVersion}/brands`, brandRoutes);
router.use(`/api/${apiVersion}/categories`, categoryRoutes);

// Root endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to ShivikMart Supermarket Inventory Management API!',
        version: process.env.API_VERSION || 'v1',
        endpoints: {
            health: '/health',
            auth: `/api/${process.env.API_VERSION || 'v1'}/auth`,
            users: `/api/${process.env.API_VERSION || 'v1'}/users`,
            products: `/api/${process.env.API_VERSION || 'v1'}/products`,
            suppliers: `/api/${process.env.API_VERSION || 'v1'}/suppliers`,
            purchaseOrders: `/api/${process.env.API_VERSION || 'v1'}/purchase-orders`,
            inventory: `/api/${process.env.API_VERSION || 'v1'}/inventory`,
            brands: `/api/${process.env.API_VERSION || 'v1'}/brands`,
            categories: `/api/${process.env.API_VERSION || 'v1'}/categories`
        },
        features: [
            'Enhanced Product Management with SKU, Barcode, and Pricing',
            'Supplier Management with Contact and Business Information',
            'Purchase Order Management with Approval Workflow',
            'Real-time Inventory Tracking with Stock Movements',
            'Brand Management with Verification and Statistics',
            'Category and Subcategory Management with Hierarchical Structure',
            'Authentication and Authorization System',
            'Rate Limiting and Input Validation',
            'Comprehensive API Documentation'
        ]
    });
});

module.exports = router;
