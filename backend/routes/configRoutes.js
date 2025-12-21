/**
 * Configuration Routes
 * 
 * Exposes system configuration to authenticated frontend applications.
 * This ensures frontend always uses the same configuration as backend.
 * 
 * SECURITY: Requires authentication to prevent information disclosure
 * about the permission model structure, dependencies, and roles.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    PERMISSIONS,
    ALL_PERMISSIONS,
    PERMISSION_DEPENDENCIES,
    ROLES,
    PERMISSION_GROUPS,
} = require('../config/permissions');

// @desc    Get permission configuration
// @route   GET /api/v1/config/permissions
// @access  Private (requires authentication)
// @security Prevents information disclosure about permission model structure
router.get('/permissions', protect, (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            // Flatten permissions for easier frontend consumption
            permissions: {
                // Product Management
                READ_PRODUCTS: PERMISSIONS.PRODUCTS.READ,
                WRITE_PRODUCTS: PERMISSIONS.PRODUCTS.WRITE,
                DELETE_PRODUCTS: PERMISSIONS.PRODUCTS.DELETE,
                // Supplier Management
                READ_SUPPLIERS: PERMISSIONS.SUPPLIERS.READ,
                WRITE_SUPPLIERS: PERMISSIONS.SUPPLIERS.WRITE,
                DELETE_SUPPLIERS: PERMISSIONS.SUPPLIERS.DELETE,
                // Purchase Order Management
                READ_PURCHASE_ORDERS: PERMISSIONS.PURCHASE_ORDERS.READ,
                WRITE_PURCHASE_ORDERS: PERMISSIONS.PURCHASE_ORDERS.WRITE,
                APPROVE_PURCHASE_ORDERS: PERMISSIONS.PURCHASE_ORDERS.APPROVE,
                // Inventory Management
                READ_INVENTORY: PERMISSIONS.INVENTORY.READ,
                WRITE_INVENTORY: PERMISSIONS.INVENTORY.WRITE,
                ADJUST_INVENTORY: PERMISSIONS.INVENTORY.ADJUST,
                // Customer Management
                READ_CUSTOMERS: PERMISSIONS.CUSTOMERS.READ,
                WRITE_CUSTOMERS: PERMISSIONS.CUSTOMERS.WRITE,
                // Reports
                READ_REPORTS: PERMISSIONS.REPORTS.READ,
                WRITE_REPORTS: PERMISSIONS.REPORTS.WRITE,
                // System Administration
                MANAGE_USERS: PERMISSIONS.ADMIN.MANAGE_USERS,
                MANAGE_SETTINGS: PERMISSIONS.ADMIN.MANAGE_SETTINGS,
                MANAGE_BRANDS: PERMISSIONS.ADMIN.MANAGE_BRANDS,
                MANAGE_CATEGORIES: PERMISSIONS.ADMIN.MANAGE_CATEGORIES,
                MANAGE_SUBCATEGORIES: PERMISSIONS.ADMIN.MANAGE_SUBCATEGORIES,
            },
            allPermissions: ALL_PERMISSIONS,
            permissionDependencies: PERMISSION_DEPENDENCIES,
            roles: Object.values(ROLES).map(role => ({
                name: role.name,
                description: role.description,
                permissions: role.permissions,
            })),
            permissionGroups: PERMISSION_GROUPS,
        },
    });
});

module.exports = router;

