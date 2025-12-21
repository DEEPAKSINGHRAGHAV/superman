/**
 * Permission Configuration (Mobile)
 * 
 * ⚠️ IMPORTANT: Backend is the SINGLE SOURCE OF TRUTH
 * This file is for TypeScript type safety and IDE autocomplete only.
 * Actual permission values should be fetched from: GET /api/v1/config/permissions
 * 
 * To keep in sync: Run validation script or fetch from API on app initialization
 * See: backend/config/permissions.js (SOURCE OF TRUTH)
 */

export const PERMISSIONS = {
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

// Permission Dependencies (matches backend)
const PERMISSION_DEPENDENCIES: Record<string, string[]> = {
    [PERMISSIONS.WRITE_INVENTORY]: [PERMISSIONS.WRITE_CUSTOMERS],
    [PERMISSIONS.READ_INVENTORY]: [PERMISSIONS.READ_CUSTOMERS],
    // Write permissions typically grant read permissions
    [PERMISSIONS.WRITE_PRODUCTS]: [PERMISSIONS.READ_PRODUCTS],
    [PERMISSIONS.WRITE_SUPPLIERS]: [PERMISSIONS.READ_SUPPLIERS],
    [PERMISSIONS.WRITE_PURCHASE_ORDERS]: [PERMISSIONS.READ_PURCHASE_ORDERS],
    [PERMISSIONS.WRITE_INVENTORY]: [PERMISSIONS.READ_INVENTORY],
    [PERMISSIONS.WRITE_CUSTOMERS]: [PERMISSIONS.READ_CUSTOMERS],
    [PERMISSIONS.WRITE_REPORTS]: [PERMISSIONS.READ_REPORTS],
    [PERMISSIONS.APPROVE_PURCHASE_ORDERS]: [PERMISSIONS.READ_PURCHASE_ORDERS],
};

import { User } from '../types';

/**
 * Check if user has permission (with dependency resolution)
 */
export const hasPermission = (user: User | null, permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // Check direct permission
    if (user.permissions?.includes(permission)) {
        return true;
    }
    
    // Check permission dependencies
    const userPermissions = user.permissions || [];
    for (const userPerm of userPermissions) {
        const dependencies = PERMISSION_DEPENDENCIES[userPerm] || [];
        if (dependencies.includes(permission)) {
            return true;
        }
    }
    
    return false;
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (user: User | null, permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.some((permission) => hasPermission(user, permission));
};

