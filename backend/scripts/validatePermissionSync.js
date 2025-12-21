/**
 * Permission Sync Validation Script
 * 
 * Validates that frontend permission constants match backend configuration.
 * Run this script to ensure frontend and backend are in sync.
 * 
 * Usage: node backend/scripts/validatePermissionSync.js
 */

const { ALL_PERMISSIONS, PERMISSION_DEPENDENCIES, PERMISSIONS } = require('../config/permissions');
const fs = require('fs');
const path = require('path');

// Expected frontend permission constants
const FRONTEND_PERMISSIONS = {
    READ_PRODUCTS: 'read_products',
    WRITE_PRODUCTS: 'write_products',
    DELETE_PRODUCTS: 'delete_products',
    READ_SUPPLIERS: 'read_suppliers',
    WRITE_SUPPLIERS: 'write_suppliers',
    DELETE_SUPPLIERS: 'delete_suppliers',
    READ_PURCHASE_ORDERS: 'read_purchase_orders',
    WRITE_PURCHASE_ORDERS: 'write_purchase_orders',
    APPROVE_PURCHASE_ORDERS: 'approve_purchase_orders',
    READ_INVENTORY: 'read_inventory',
    WRITE_INVENTORY: 'write_inventory',
    ADJUST_INVENTORY: 'adjust_inventory',
    READ_CUSTOMERS: 'read_customers',
    WRITE_CUSTOMERS: 'write_customers',
    READ_REPORTS: 'read_reports',
    WRITE_REPORTS: 'write_reports',
    MANAGE_USERS: 'manage_users',
    MANAGE_SETTINGS: 'manage_settings',
    MANAGE_BRANDS: 'manage_brands',
    MANAGE_CATEGORIES: 'manage_categories',
    MANAGE_SUBCATEGORIES: 'manage_subcategories',
};

// Expected backend permission values
const BACKEND_PERMISSIONS = {
    READ_PRODUCTS: PERMISSIONS.PRODUCTS.READ,
    WRITE_PRODUCTS: PERMISSIONS.PRODUCTS.WRITE,
    DELETE_PRODUCTS: PERMISSIONS.PRODUCTS.DELETE,
    READ_SUPPLIERS: PERMISSIONS.SUPPLIERS.READ,
    WRITE_SUPPLIERS: PERMISSIONS.SUPPLIERS.WRITE,
    DELETE_SUPPLIERS: PERMISSIONS.SUPPLIERS.DELETE,
    READ_PURCHASE_ORDERS: PERMISSIONS.PURCHASE_ORDERS.READ,
    WRITE_PURCHASE_ORDERS: PERMISSIONS.PURCHASE_ORDERS.WRITE,
    APPROVE_PURCHASE_ORDERS: PERMISSIONS.PURCHASE_ORDERS.APPROVE,
    READ_INVENTORY: PERMISSIONS.INVENTORY.READ,
    WRITE_INVENTORY: PERMISSIONS.INVENTORY.WRITE,
    ADJUST_INVENTORY: PERMISSIONS.INVENTORY.ADJUST,
    READ_CUSTOMERS: PERMISSIONS.CUSTOMERS.READ,
    WRITE_CUSTOMERS: PERMISSIONS.CUSTOMERS.WRITE,
    READ_REPORTS: PERMISSIONS.REPORTS.READ,
    WRITE_REPORTS: PERMISSIONS.REPORTS.WRITE,
    MANAGE_USERS: PERMISSIONS.ADMIN.MANAGE_USERS,
    MANAGE_SETTINGS: PERMISSIONS.ADMIN.MANAGE_SETTINGS,
    MANAGE_BRANDS: PERMISSIONS.ADMIN.MANAGE_BRANDS,
    MANAGE_CATEGORIES: PERMISSIONS.ADMIN.MANAGE_CATEGORIES,
    MANAGE_SUBCATEGORIES: PERMISSIONS.ADMIN.MANAGE_SUBCATEGORIES,
};

function validatePermissions() {
    console.log('🔍 Validating permission synchronization...\n');
    
    let errors = [];
    let warnings = [];
    
    // Check all frontend permissions match backend
    for (const [key, frontendValue] of Object.entries(FRONTEND_PERMISSIONS)) {
        const backendValue = BACKEND_PERMISSIONS[key];
        
        if (!backendValue) {
            errors.push(`❌ Missing backend permission: ${key}`);
        } else if (frontendValue !== backendValue) {
            errors.push(`❌ Mismatch for ${key}: frontend="${frontendValue}", backend="${backendValue}"`);
        }
    }
    
    // Check all backend permissions have frontend equivalents
    for (const [key, backendValue] of Object.entries(BACKEND_PERMISSIONS)) {
        const frontendValue = FRONTEND_PERMISSIONS[key];
        
        if (!frontendValue) {
            warnings.push(`⚠️  Missing frontend permission: ${key}`);
        }
    }
    
    // Check ALL_PERMISSIONS array
    const frontendValues = Object.values(FRONTEND_PERMISSIONS);
    const missingInFrontend = ALL_PERMISSIONS.filter(p => !frontendValues.includes(p));
    const extraInFrontend = frontendValues.filter(p => !ALL_PERMISSIONS.includes(p));
    
    if (missingInFrontend.length > 0) {
        errors.push(`❌ Permissions in backend but not in frontend: ${missingInFrontend.join(', ')}`);
    }
    
    if (extraInFrontend.length > 0) {
        warnings.push(`⚠️  Permissions in frontend but not in backend: ${extraInFrontend.join(', ')}`);
    }
    
    // Report results
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All permissions are synchronized!\n');
        console.log(`   Total permissions: ${ALL_PERMISSIONS.length}`);
        console.log(`   Permission dependencies: ${Object.keys(PERMISSION_DEPENDENCIES).length}`);
        return true;
    }
    
    if (errors.length > 0) {
        console.log('❌ ERRORS FOUND:\n');
        errors.forEach(error => console.log(`   ${error}`));
        console.log('');
    }
    
    if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:\n');
        warnings.forEach(warning => console.log(`   ${warning}`));
        console.log('');
    }
    
    return false;
}

// Run validation
if (require.main === module) {
    const isValid = validatePermissions();
    process.exit(isValid ? 0 : 1);
}

module.exports = { validatePermissions };

