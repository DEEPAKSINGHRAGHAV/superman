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
    READ_REPORTS: 'read_reports',
    WRITE_REPORTS: 'write_reports',
    MANAGE_USERS: 'manage_users',
    MANAGE_SETTINGS: 'manage_settings',
    MANAGE_BRANDS: 'manage_brands',
    MANAGE_CATEGORIES: 'manage_categories',
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

