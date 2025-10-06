// API Configuration
export const API_BASE_URL = __DEV__
    ? 'http://localhost:8000/api/v1'
    : 'https://your-production-api.com/api/v1';

// Product Categories
export const PRODUCT_CATEGORIES = [
    'grocery',
    'snacks',
    'personal-care',
    'dairy',
    'fruits-vegetables',
    'meat-seafood',
    'bakery',
    'beverages',
    'household',
    'electronics',
    'other'
] as const;

// Product Units
export const PRODUCT_UNITS = [
    'pcs',
    'kg',
    'liter',
    'gram',
    'ml',
    'box',
    'pack'
] as const;

// Stock Movement Types
export const STOCK_MOVEMENT_TYPES = [
    { value: 'purchase', label: 'Purchase', icon: '📦', color: '#4CAF50' },
    { value: 'sale', label: 'Sale', icon: '💰', color: '#2196F3' },
    { value: 'adjustment', label: 'Adjustment', icon: '⚖️', color: '#FF9800' },
    { value: 'return', label: 'Return', icon: '↩️', color: '#9C27B0' },
    { value: 'damage', label: 'Damage', icon: '❌', color: '#F44336' },
    { value: 'transfer', label: 'Transfer', icon: '🔄', color: '#607D8B' },
    { value: 'expired', label: 'Expired', icon: '⏰', color: '#FF5722' }
] as const;

// Purchase Order Status
export const PURCHASE_ORDER_STATUS = [
    { value: 'pending', label: 'Pending', color: '#FF9800' },
    { value: 'approved', label: 'Approved', color: '#4CAF50' },
    { value: 'ordered', label: 'Ordered', color: '#2196F3' },
    { value: 'received', label: 'Received', color: '#8BC34A' },
    { value: 'cancelled', label: 'Cancelled', color: '#F44336' }
];

// User Roles
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    VIEWER: 'viewer'
} as const;

// Colors
export const COLORS = {
    primary: '#2E7D32',
    secondary: '#1976D2',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    light: '#F5F5F5',
    dark: '#212121',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#757575',
    lightGray: '#E0E0E0'
};

// Screen Names
export const SCREEN_NAMES = {
    LOGIN: 'Login',
    DASHBOARD: 'Dashboard',
    PRODUCT_LIST: 'ProductList',
    PRODUCT_DETAIL: 'ProductDetail',
    PRODUCT_FORM: 'ProductForm',
    SUPPLIER_LIST: 'SupplierList',
    SUPPLIER_DETAIL: 'SupplierDetail',
    SUPPLIER_FORM: 'SupplierForm',
    PURCHASE_ORDER_LIST: 'PurchaseOrderList',
    PURCHASE_ORDER_DETAIL: 'PurchaseOrderDetail',
    PURCHASE_ORDER_FORM: 'PurchaseOrderForm',
    INVENTORY_TRACKING: 'InventoryTracking',
    BARCODE_SCANNER: 'BarcodeScanner',
    BULK_UPLOAD: 'BulkUpload'
};

// API Endpoints
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        PROFILE: '/auth/me',
        CHANGE_PASSWORD: '/auth/change-password'
    },
    PRODUCTS: {
        LIST: '/products',
        CREATE: '/products',
        UPDATE: '/products',
        DELETE: '/products',
        SEARCH: '/products/search',
        CATEGORIES: '/products/categories',
        BULK_UPLOAD: '/products/bulk'
    },
    SUPPLIERS: {
        LIST: '/suppliers',
        CREATE: '/suppliers',
        UPDATE: '/suppliers',
        DELETE: '/suppliers'
    },
    PURCHASE_ORDERS: {
        LIST: '/purchase-orders',
        CREATE: '/purchase-orders',
        UPDATE: '/purchase-orders',
        DELETE: '/purchase-orders'
    },
    STOCK_MOVEMENTS: {
        LIST: '/inventory/movements',
        CREATE: '/inventory/movements'
    },
    DASHBOARD: {
        STATS: '/dashboard/stats'
    }
};

// Validation Rules
export const VALIDATION_RULES = {
    PRODUCT: {
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 100,
        SKU_MIN_LENGTH: 3,
        SKU_MAX_LENGTH: 20,
        DESCRIPTION_MAX_LENGTH: 500,
        PRICE_MIN: 0,
        STOCK_MIN: 0
    },
    SUPPLIER: {
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 100,
        CODE_MIN_LENGTH: 3,
        CODE_MAX_LENGTH: 20,
        EMAIL_PATTERN: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    }
};

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
};

// Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    OFFLINE_QUEUE: 'offline_queue',
    CACHE_DATA: 'cache_data'
};

// Barcode Types
export const BARCODE_TYPES = [
    'QR_CODE',
    'EAN_13',
    'EAN_8',
    'CODE_128',
    'UPC_A',
    'UPC_E'
];

// Chart Colors
export const CHART_COLORS = [
    '#4CAF50',
    '#2196F3',
    '#FF9800',
    '#9C27B0',
    '#F44336',
    '#607D8B',
    '#795548',
    '#E91E63',
    '#00BCD4',
    '#8BC34A'
];
