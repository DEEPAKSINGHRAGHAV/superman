# Permission System - Single Source of Truth

## 🎯 Source of Truth

**Backend**: `backend/config/permissions.js` is the **SINGLE SOURCE OF TRUTH** for all permissions.

## 📁 File Structure

```
backend/
├── config/
│   └── permissions.js          ⭐ SOURCE OF TRUTH
├── routes/
│   └── configRoutes.js         📡 API endpoint to expose config
└── scripts/
    └── validatePermissionSync.js  ✅ Validation script

frontend/
├── website/src/config/
│   └── constants.js             📝 Type definitions (must match backend)
└── mobile/src/config/
    └── permissions.ts           📝 Type definitions (must match backend)
```

## 🔄 How It Works

### Backend (Source of Truth)
- **File**: `backend/config/permissions.js`
- **Contains**: All permissions, roles, dependencies
- **Used by**: PermissionService, User model, routes

### API Endpoint
- **Endpoint**: `GET /api/v1/config/permissions`
- **Purpose**: Expose permission config to frontend
- **Access**: Public (no sensitive data)
- **Response**: Permission constants, dependencies, roles

### Frontend Files
- **Purpose**: TypeScript/IDE autocomplete and type safety
- **Status**: Should match backend (validated by script)
- **Note**: These are for development convenience only

## ✅ Validation

### Automatic Validation
Run the validation script to ensure frontend matches backend:

```bash
node backend/scripts/validatePermissionSync.js
```

### Manual Validation
1. Check that all permission strings match
2. Check that dependencies match
3. Check that roles match

## 🚀 Best Practices

### Adding New Permissions

1. **Add to Backend** (`backend/config/permissions.js`):
```javascript
PERMISSIONS.NEW_FEATURE = {
    READ: 'read_new_feature',
    WRITE: 'write_new_feature',
};
```

2. **Update API Endpoint** (`backend/routes/configRoutes.js`):
```javascript
READ_NEW_FEATURE: PERMISSIONS.NEW_FEATURE.READ,
WRITE_NEW_FEATURE: PERMISSIONS.NEW_FEATURE.WRITE,
```

3. **Update Frontend** (for type safety):
```javascript
// website/src/config/constants.js
READ_NEW_FEATURE: 'read_new_feature',
WRITE_NEW_FEATURE: 'write_new_feature',
```

4. **Validate**:
```bash
node backend/scripts/validatePermissionSync.js
```

### Fetching from API (Recommended)

Instead of hardcoding, frontend can fetch permissions on initialization:

```javascript
// Fetch permissions from backend
const response = await fetch('/api/v1/config/permissions');
const { permissions, permissionDependencies } = response.data;

// Use fetched permissions
const PERMISSIONS = permissions;
```

## 📋 Current Status

- ✅ Backend is source of truth
- ✅ API endpoint exposes config
- ✅ Frontend files marked as type definitions
- ✅ Validation script available
- ⚠️ Frontend still has hardcoded values (for now)

## 🔮 Future Improvements

1. **Auto-sync**: Generate frontend files from backend config
2. **Runtime Fetch**: Frontend fetches permissions on app start
3. **Type Generation**: Auto-generate TypeScript types from backend
4. **CI/CD Validation**: Run validation in CI pipeline

## ⚠️ Important Notes

1. **Always update backend first** - It's the source of truth
2. **Run validation script** - Before committing changes
3. **Update API endpoint** - When adding new permissions
4. **Keep frontend in sync** - For type safety and IDE support

## 🎯 Summary

- **Source of Truth**: `backend/config/permissions.js`
- **API Endpoint**: `GET /api/v1/config/permissions`
- **Frontend Files**: Type definitions only (should match backend)
- **Validation**: `node backend/scripts/validatePermissionSync.js`

**Remember**: Backend is always right. Frontend should match it.




