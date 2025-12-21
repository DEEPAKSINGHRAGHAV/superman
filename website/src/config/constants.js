// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_VERSION = 'v1';
export const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Authentication
export const TOKEN_KEY = 'shivikmart_token';
export const USER_KEY = 'shivikmart_user';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// User Roles
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    VIEWER: 'viewer',
};

// Permissions
// ⚠️ IMPORTANT: Backend is the SINGLE SOURCE OF TRUTH
// This file is for TypeScript/IDE autocomplete and type safety only.
// Actual permission values should be fetched from: GET /api/v1/config/permissions
// 
// To keep in sync: Run validation script or fetch from API on app initialization
// See: backend/config/permissions.js (SOURCE OF TRUTH)
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
// These define implicit permission grants
const PERMISSION_DEPENDENCIES = {
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

/**
 * Check if user has permission (with dependency resolution)
 * @param {Object} user - User object with permissions array
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
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

// Stock Movement Types
export const MOVEMENT_TYPES = {
    IN: 'in',
    OUT: 'out',
    ADJUSTMENT: 'adjustment',
    RETURN: 'return',
    DAMAGE: 'damage',
    SALE: 'sale',
};

// Purchase Order Status
export const PO_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    RECEIVED: 'received',
    CANCELLED: 'cancelled',
};

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
export const DATE_INPUT_FORMAT = 'yyyy-MM-dd';

// Toast Messages
export const TOAST_DURATION = 4000;

// Charts
export const CHART_COLORS = {
    primary: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
};

// Status Colors
export const STATUS_COLORS = {
    active: 'success',
    inactive: 'gray',
    pending: 'warning',
    approved: 'info',
    received: 'success',
    cancelled: 'danger',
    draft: 'gray',
    low: 'danger',
    medium: 'warning',
    high: 'success',
};

