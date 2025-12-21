# Permission System Architecture

## Overview

The permission system is a centralized, configurable RBAC (Role-Based Access Control) system that provides fine-grained access control across the Shivik Mart application.

## Architecture Principles

1. **Single Source of Truth**: All permissions, roles, and dependencies are defined in `backend/config/permissions.js`
2. **Centralized Logic**: All permission checking goes through `PermissionService`
3. **Dependency Resolution**: Permissions can have dependencies (e.g., `write_inventory` → `write_customers`)
4. **Scalable**: Easy to add new permissions, roles, or dependencies
5. **Maintainable**: Clear structure and documentation

## File Structure

```
backend/
├── config/
│   ├── permissions.js          # Permission definitions, roles, dependencies
│   └── PERMISSION_SYSTEM.md    # This documentation
├── services/
│   └── permissionService.js    # Centralized permission checking logic
├── models/
│   └── User.js                 # User model (uses PermissionService)
└── middleware/
    └── auth.js                  # Auth middleware (uses PermissionService)
```

## Permission Configuration

### Location: `backend/config/permissions.js`

This file contains:

1. **PERMISSIONS**: All available permissions organized by functional area
2. **PERMISSION_DEPENDENCIES**: Implicit permission grants
3. **ROLES**: Predefined role definitions with default permissions
4. **PERMISSION_GROUPS**: Logical groupings for UI display

### Adding a New Permission

1. Add to `PERMISSIONS` object:
```javascript
const PERMISSIONS = {
    // ... existing permissions
    NEW_FEATURE: {
        READ: 'read_new_feature',
        WRITE: 'write_new_feature',
    },
};
```

2. Update `ALL_PERMISSIONS` (automatically generated from PERMISSIONS)

3. Add to User model enum (automatically uses `ALL_PERMISSIONS`)

### Adding Permission Dependencies

```javascript
const PERMISSION_DEPENDENCIES = {
    [PERMISSIONS.INVENTORY.WRITE]: [
        PERMISSIONS.CUSTOMERS.WRITE,  // Existing dependency
        PERMISSIONS.NEW_FEATURE.WRITE, // New dependency
    ],
};
```

### Adding a New Role

```javascript
const ROLES = {
    // ... existing roles
    CASHIER: {
        name: 'cashier',
        description: 'Cashier role - can process sales only',
        permissions: [
            PERMISSIONS.INVENTORY.READ,
            PERMISSIONS.INVENTORY.WRITE,
            PERMISSIONS.CUSTOMERS.READ,
            PERMISSIONS.CUSTOMERS.WRITE,
        ],
    },
};
```

## Permission Service

### Location: `backend/services/permissionService.js`

The `PermissionService` provides:

- `hasPermission(user, permission)` - Check if user has permission (with dependencies)
- `hasAnyPermission(user, permissions)` - Check if user has any permission
- `hasAllPermissions(user, permissions)` - Check if user has all permissions
- `getEffectivePermissions(user)` - Get all permissions (direct + dependencies)
- `getDefaultPermissionsForRole(roleName)` - Get default permissions for a role
- `validatePermissions(permissions)` - Validate permission array

### Usage Example

```javascript
const PermissionService = require('../services/permissionService');

// Check permission
if (PermissionService.hasPermission(req.user, 'write_inventory')) {
    // User can write inventory (or has dependency that grants it)
}

// Get effective permissions
const effectivePerms = PermissionService.getEffectivePermissions(user);
// Returns: ['write_inventory', 'write_customers', 'read_inventory', 'read_customers']
```

## Permission Dependencies

Dependencies define implicit permission grants. When a user has a permission, they automatically get dependent permissions.

### Current Dependencies

1. **Inventory → Customers**
   - `write_inventory` → `write_customers`
   - `read_inventory` → `read_customers`
   - **Reason**: Customer management is part of the sales/billing workflow

2. **Write → Read**
   - All write permissions grant their corresponding read permission
   - **Reason**: If you can modify, you should be able to view

3. **Approve → Read**
   - `approve_purchase_orders` → `read_purchase_orders`
   - **Reason**: Need to read to approve

### How Dependencies Work

```javascript
// User has: ['write_inventory']
// Effective permissions: ['write_inventory', 'write_customers', 'read_inventory', 'read_customers']
// 
// Because:
// - write_inventory → write_customers (dependency)
// - write_inventory → read_inventory (dependency)
// - write_customers → read_customers (dependency)
```

## Roles

### Admin
- **All permissions** - Full system access
- Use for: System administrators

### Manager
- Products: Read, Write
- Suppliers: Read, Write
- Purchase Orders: Read, Write, Approve
- Inventory: Read, Write, Adjust
- Customers: Read, Write
- Reports: Read, Write
- Admin: Brands, Categories, Subcategories
- Use for: Store managers, supervisors

### Employee
- Products: Read, Write
- Suppliers: Read, Write
- Purchase Orders: Read, Write
- Inventory: Read, Write (for billing/POS)
- Customers: Read, Write
- Use for: Store staff, cashiers

### Viewer
- All entities: Read only
- Use for: Auditors, read-only access

## Usage in Code

### Backend Routes

```javascript
const { requirePermission } = require('../middleware/auth');

router.post('/sales',
    protect,
    requirePermission('write_inventory'), // Automatically includes write_customers
    asyncHandler(async (req, res) => {
        // Route handler
    })
);
```

### User Model

```javascript
const user = await User.findById(userId);

// Check permission (includes dependencies)
if (user.hasPermission('write_customers')) {
    // User has write_customers (directly or via write_inventory)
}
```

### Frontend

```javascript
import { hasPermission } from '../config/constants';

if (hasPermission(user, 'write_inventory')) {
    // Show write inventory UI
    // User automatically has write_customers too
}
```

## Best Practices

1. **Always use PermissionService** - Don't check permissions directly
2. **Use role defaults** - Assign roles, then add specific permissions if needed
3. **Document dependencies** - When adding dependencies, document why
4. **Keep config in sync** - Frontend and backend should match
5. **Test permission logic** - Write tests for permission checks

## Migration Guide

### From Old System

The old system had hardcoded permission logic. Migration steps:

1. ✅ Permissions now defined in `config/permissions.js`
2. ✅ Permission checking uses `PermissionService`
3. ✅ Dependencies are configurable
4. ✅ Roles have default permissions

### Adding New Features

1. Define permissions in `config/permissions.js`
2. Add to role definitions if needed
3. Add dependencies if logical (e.g., write → read)
4. Update frontend constants to match
5. Test permission checks

## Troubleshooting

### Permission Not Working

1. Check if permission exists in `ALL_PERMISSIONS`
2. Check if user has permission directly or via dependency
3. Verify `PermissionService.hasPermission()` is being used
4. Check role - admin has all permissions

### Dependency Not Working

1. Verify dependency is defined in `PERMISSION_DEPENDENCIES`
2. Check `PermissionService.getEffectivePermissions()` output
3. Ensure dependency is a valid permission

## Future Enhancements

- [ ] Permission groups for UI organization
- [ ] Dynamic role creation via admin panel
- [ ] Permission inheritance chains
- [ ] Time-based permissions
- [ ] Resource-level permissions (e.g., can edit own products only)

