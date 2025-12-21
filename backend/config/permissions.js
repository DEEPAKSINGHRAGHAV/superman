/**
 * Permission Configuration System
 * 
 * This is the single source of truth for all permissions, roles, and permission relationships.
 * All permission logic should reference this configuration.
 * 
 * Architecture:
 * - Permissions: Individual actions (e.g., 'read_products', 'write_inventory')
 * - Permission Groups: Logical groupings of related permissions
 * - Permission Dependencies: Implicit grants (e.g., write_inventory → write_customers)
 * - Roles: Predefined sets of permissions for common user types
 */

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

/**
 * All available permissions in the system
 * Organized by functional area for clarity
 */
const PERMISSIONS = {
    // Product Management
    PRODUCTS: {
        READ: 'read_products',
        WRITE: 'write_products',
        DELETE: 'delete_products',
    },
    
    // Supplier Management
    SUPPLIERS: {
        READ: 'read_suppliers',
        WRITE: 'write_suppliers',
        DELETE: 'delete_suppliers',
    },
    
    // Purchase Order Management
    PURCHASE_ORDERS: {
        READ: 'read_purchase_orders',
        WRITE: 'write_purchase_orders',
        APPROVE: 'approve_purchase_orders',
    },
    
    // Inventory Management
    INVENTORY: {
        READ: 'read_inventory',
        WRITE: 'write_inventory',
        ADJUST: 'adjust_inventory',
    },
    
    // Customer Management
    CUSTOMERS: {
        READ: 'read_customers',
        WRITE: 'write_customers',
    },
    
    // Reports
    REPORTS: {
        READ: 'read_reports',
        WRITE: 'write_reports',
    },
    
    // System Administration
    ADMIN: {
        MANAGE_USERS: 'manage_users',
        MANAGE_SETTINGS: 'manage_settings',
        MANAGE_BRANDS: 'manage_brands',
        MANAGE_CATEGORIES: 'manage_categories',
        MANAGE_SUBCATEGORIES: 'manage_subcategories',
    },
};

// Flatten permissions for enum validation
const ALL_PERMISSIONS = Object.values(PERMISSIONS)
    .reduce((acc, group) => {
        return acc.concat(Object.values(group));
    }, []);

// ============================================================================
// PERMISSION DEPENDENCIES
// ============================================================================

/**
 * Permission Dependencies
 * 
 * Defines implicit permission grants. When a user has a permission,
 * they automatically gain access to dependent permissions.
 * 
 * Format: { sourcePermission: [dependentPermissions] }
 * 
 * Example: If user has 'write_inventory', they automatically get 'write_customers'
 * because customer management is part of the sales/billing workflow.
 */
const PERMISSION_DEPENDENCIES = {
    // Inventory write permission grants customer write (billing workflow)
    [PERMISSIONS.INVENTORY.WRITE]: [
        PERMISSIONS.CUSTOMERS.WRITE,
    ],
    
    // Inventory read permission grants customer read (viewing customer data)
    [PERMISSIONS.INVENTORY.READ]: [
        PERMISSIONS.CUSTOMERS.READ,
    ],
    
    // Write permission typically grants read permission
    [PERMISSIONS.PRODUCTS.WRITE]: [
        PERMISSIONS.PRODUCTS.READ,
    ],
    [PERMISSIONS.SUPPLIERS.WRITE]: [
        PERMISSIONS.SUPPLIERS.READ,
    ],
    [PERMISSIONS.PURCHASE_ORDERS.WRITE]: [
        PERMISSIONS.PURCHASE_ORDERS.READ,
    ],
    [PERMISSIONS.INVENTORY.WRITE]: [
        PERMISSIONS.INVENTORY.READ,
    ],
    [PERMISSIONS.CUSTOMERS.WRITE]: [
        PERMISSIONS.CUSTOMERS.READ,
    ],
    [PERMISSIONS.REPORTS.WRITE]: [
        PERMISSIONS.REPORTS.READ,
    ],
    
    // Approve permission grants read permission
    [PERMISSIONS.PURCHASE_ORDERS.APPROVE]: [
        PERMISSIONS.PURCHASE_ORDERS.READ,
    ],
};

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

/**
 * Role Definitions
 * 
 * Defines default permission sets for each role.
 * Users can have additional permissions assigned beyond their role defaults.
 */
const ROLES = {
    ADMIN: {
        name: 'admin',
        description: 'Full system access - all permissions',
        permissions: ALL_PERMISSIONS, // Admin has all permissions
    },
    
    MANAGER: {
        name: 'manager',
        description: 'Management role - can approve POs, manage inventory, view reports',
        permissions: [
            // Products
            PERMISSIONS.PRODUCTS.READ,
            PERMISSIONS.PRODUCTS.WRITE,
            // Suppliers
            PERMISSIONS.SUPPLIERS.READ,
            PERMISSIONS.SUPPLIERS.WRITE,
            // Purchase Orders
            PERMISSIONS.PURCHASE_ORDERS.READ,
            PERMISSIONS.PURCHASE_ORDERS.WRITE,
            PERMISSIONS.PURCHASE_ORDERS.APPROVE,
            // Inventory
            PERMISSIONS.INVENTORY.READ,
            PERMISSIONS.INVENTORY.WRITE,
            PERMISSIONS.INVENTORY.ADJUST,
            // Customers (implicit via inventory, but explicit for clarity)
            PERMISSIONS.CUSTOMERS.READ,
            PERMISSIONS.CUSTOMERS.WRITE,
            // Reports
            PERMISSIONS.REPORTS.READ,
            PERMISSIONS.REPORTS.WRITE,
            // Admin functions
            PERMISSIONS.ADMIN.MANAGE_BRANDS,
            PERMISSIONS.ADMIN.MANAGE_CATEGORIES,
            PERMISSIONS.ADMIN.MANAGE_SUBCATEGORIES,
        ],
    },
    
    EMPLOYEE: {
        name: 'employee',
        description: 'Standard employee - can process sales, create POs, manage products',
        permissions: [
            // Products
            PERMISSIONS.PRODUCTS.READ,
            PERMISSIONS.PRODUCTS.WRITE,
            // Suppliers
            PERMISSIONS.SUPPLIERS.READ,
            PERMISSIONS.SUPPLIERS.WRITE,
            // Purchase Orders
            PERMISSIONS.PURCHASE_ORDERS.READ,
            PERMISSIONS.PURCHASE_ORDERS.WRITE,
            // Inventory (for billing/POS)
            PERMISSIONS.INVENTORY.READ,
            PERMISSIONS.INVENTORY.WRITE,
            // Customers (implicit via inventory, but explicit for clarity)
            PERMISSIONS.CUSTOMERS.READ,
            PERMISSIONS.CUSTOMERS.WRITE,
        ],
    },
    
    VIEWER: {
        name: 'viewer',
        description: 'Read-only access - can view data but not modify',
        permissions: [
            PERMISSIONS.PRODUCTS.READ,
            PERMISSIONS.SUPPLIERS.READ,
            PERMISSIONS.PURCHASE_ORDERS.READ,
            PERMISSIONS.INVENTORY.READ,
            PERMISSIONS.CUSTOMERS.READ,
            PERMISSIONS.REPORTS.READ,
        ],
    },
};

// ============================================================================
// PERMISSION GROUPS (for UI/display purposes)
// ============================================================================

const PERMISSION_GROUPS = {
    PRODUCTS: {
        name: 'Products',
        permissions: [
            PERMISSIONS.PRODUCTS.READ,
            PERMISSIONS.PRODUCTS.WRITE,
            PERMISSIONS.PRODUCTS.DELETE,
        ],
    },
    SUPPLIERS: {
        name: 'Suppliers',
        permissions: [
            PERMISSIONS.SUPPLIERS.READ,
            PERMISSIONS.SUPPLIERS.WRITE,
            PERMISSIONS.SUPPLIERS.DELETE,
        ],
    },
    PURCHASE_ORDERS: {
        name: 'Purchase Orders',
        permissions: [
            PERMISSIONS.PURCHASE_ORDERS.READ,
            PERMISSIONS.PURCHASE_ORDERS.WRITE,
            PERMISSIONS.PURCHASE_ORDERS.APPROVE,
        ],
    },
    INVENTORY: {
        name: 'Inventory & Sales',
        permissions: [
            PERMISSIONS.INVENTORY.READ,
            PERMISSIONS.INVENTORY.WRITE,
            PERMISSIONS.INVENTORY.ADJUST,
            PERMISSIONS.CUSTOMERS.READ,
            PERMISSIONS.CUSTOMERS.WRITE,
        ],
    },
    REPORTS: {
        name: 'Reports',
        permissions: [
            PERMISSIONS.REPORTS.READ,
            PERMISSIONS.REPORTS.WRITE,
        ],
    },
    ADMIN: {
        name: 'Administration',
        permissions: [
            PERMISSIONS.ADMIN.MANAGE_USERS,
            PERMISSIONS.ADMIN.MANAGE_SETTINGS,
            PERMISSIONS.ADMIN.MANAGE_BRANDS,
            PERMISSIONS.ADMIN.MANAGE_CATEGORIES,
            PERMISSIONS.ADMIN.MANAGE_SUBCATEGORIES,
        ],
    },
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    PERMISSIONS,
    ALL_PERMISSIONS,
    PERMISSION_DEPENDENCIES,
    ROLES,
    PERMISSION_GROUPS,
    
    // Helper: Get all permissions for a role
    getRolePermissions: (roleName) => {
        const role = ROLES[roleName.toUpperCase()];
        return role ? role.permissions : [];
    },
    
    // Helper: Get role definition
    getRole: (roleName) => {
        return ROLES[roleName.toUpperCase()] || null;
    },
    
    // Helper: Check if permission exists
    isValidPermission: (permission) => {
        return ALL_PERMISSIONS.includes(permission);
    },
};

