/**
 * Permission Service
 * 
 * Centralized service for all permission-related logic.
 * This service handles permission checking, dependency resolution, and role management.
 * 
 * All permission checks should go through this service to ensure consistency.
 */

const {
    PERMISSIONS,
    ALL_PERMISSIONS,
    PERMISSION_DEPENDENCIES,
    ROLES,
    getRolePermissions,
} = require('../config/permissions');

/**
 * Performance Optimization: Cache for effective permissions
 * Key: userId_permissionHash, Value: effectivePermissions array
 * TTL: 5 minutes (configurable)
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key for user permissions
 */
const getCacheKey = (user) => {
    if (!user || !user._id) return null;
    const permHash = (user.permissions || []).sort().join(',');
    return `${user._id}_${permHash}`;
};

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
    const now = Date.now();
    for (const [key, value] of permissionCache.entries()) {
        if (value.expiresAt < now) {
            permissionCache.delete(key);
        }
    }
};

// Clear expired cache every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000);

class PermissionService {
    /**
     * Check if a user has a specific permission
     * Resolves permission dependencies automatically
     * 
     * @param {Object} user - User object with role and permissions array
     * @param {string} permission - Permission to check
     * @returns {boolean} - True if user has permission (directly or via dependency)
     */
    static hasPermission(user, permission) {
        if (!user) return false;
        
        // Admin role has all permissions
        if (user.role === 'admin') {
            return true;
        }
        
        // Check direct permission
        if (user.permissions && user.permissions.includes(permission)) {
            return true;
        }
        
        // Check permission dependencies (implicit grants)
        const effectivePermissions = this.getEffectivePermissions(user);
        return effectivePermissions.includes(permission);
    }
    
    /**
     * Check if user has any of the specified permissions
     * 
     * @param {Object} user - User object
     * @param {string[]} permissions - Array of permissions to check
     * @returns {boolean} - True if user has at least one permission
     */
    static hasAnyPermission(user, permissions) {
        if (!user) return false;
        if (user.role === 'admin') return true;
        
        return permissions.some(permission => this.hasPermission(user, permission));
    }
    
    /**
     * Check if user has all of the specified permissions
     * 
     * @param {Object} user - User object
     * @param {string[]} permissions - Array of permissions to check
     * @returns {boolean} - True if user has all permissions
     */
    static hasAllPermissions(user, permissions) {
        if (!user) return false;
        if (user.role === 'admin') return true;
        
        return permissions.every(permission => this.hasPermission(user, permission));
    }
    
    /**
     * Get all effective permissions for a user
     * Includes direct permissions + dependencies
     * Uses caching for performance optimization
     * 
     * @param {Object} user - User object
     * @param {boolean} useCache - Whether to use cache (default: true)
     * @returns {string[]} - Array of all effective permissions
     */
    static getEffectivePermissions(user, useCache = true) {
        if (!user || !user.permissions) {
            return [];
        }
        
        if (user.role === 'admin') {
            return ALL_PERMISSIONS;
        }
        
        // Check cache first (performance optimization)
        if (useCache) {
            const cacheKey = getCacheKey(user);
            if (cacheKey) {
                const cached = permissionCache.get(cacheKey);
                if (cached && cached.expiresAt > Date.now()) {
                    return cached.permissions;
                }
            }
        }
        
        const effectivePermissions = new Set(user.permissions);
        
        // Resolve all dependencies (breadth-first to handle nested dependencies)
        const processed = new Set();
        const queue = [...user.permissions];
        
        while (queue.length > 0) {
            const permission = queue.shift();
            if (processed.has(permission)) continue;
            processed.add(permission);
            
            const dependencies = PERMISSION_DEPENDENCIES[permission] || [];
            dependencies.forEach(dep => {
                if (!effectivePermissions.has(dep)) {
                    effectivePermissions.add(dep);
                    queue.push(dep); // Process nested dependencies
                }
            });
        }
        
        const result = Array.from(effectivePermissions);
        
        // Cache the result
        if (useCache) {
            const cacheKey = getCacheKey(user);
            if (cacheKey) {
                permissionCache.set(cacheKey, {
                    permissions: result,
                    expiresAt: Date.now() + CACHE_TTL
                });
            }
        }
        
        return result;
    }
    
    /**
     * Clear permission cache for a specific user or all users
     * Useful when user permissions are updated
     * 
     * @param {Object} user - User object (optional, if not provided clears all)
     */
    static clearCache(user = null) {
        if (user) {
            const cacheKey = getCacheKey(user);
            if (cacheKey) {
                permissionCache.delete(cacheKey);
            }
        } else {
            permissionCache.clear();
        }
    }
    
    /**
     * Get default permissions for a role
     * 
     * @param {string} roleName - Role name (admin, manager, employee, viewer)
     * @returns {string[]} - Array of default permissions for the role
     */
    static getDefaultPermissionsForRole(roleName) {
        return getRolePermissions(roleName) || [];
    }
    
    /**
     * Validate that all permissions in an array are valid
     * 
     * @param {string[]} permissions - Array of permissions to validate
     * @returns {Object} - { valid: boolean, invalid: string[] }
     */
    static validatePermissions(permissions) {
        if (!Array.isArray(permissions)) {
            return { valid: false, invalid: [], error: 'Permissions must be an array' };
        }
        
        const invalid = permissions.filter(perm => !ALL_PERMISSIONS.includes(perm));
        
        return {
            valid: invalid.length === 0,
            invalid,
        };
    }
    
    /**
     * Get role definition
     * 
     * @param {string} roleName - Role name
     * @returns {Object|null} - Role definition or null
     */
    static getRole(roleName) {
        return ROLES[roleName.toUpperCase()] || null;
    }
    
    /**
     * Get all available roles
     * 
     * @returns {Object} - Object with all role definitions
     */
    static getAllRoles() {
        return ROLES;
    }
    
    /**
     * Get all available permissions
     * 
     * @returns {string[]} - Array of all permission strings
     */
    static getAllPermissions() {
        return ALL_PERMISSIONS;
    }
    
    /**
     * Get permission dependencies for a given permission
     * 
     * @param {string} permission - Permission to check
     * @returns {string[]} - Array of dependent permissions
     */
    static getPermissionDependencies(permission) {
        return PERMISSION_DEPENDENCIES[permission] || [];
    }
    
    /**
     * Check if a role has a specific permission by default
     * 
     * @param {string} roleName - Role name
     * @param {string} permission - Permission to check
     * @returns {boolean} - True if role has permission by default
     */
    static roleHasPermission(roleName, permission) {
        const rolePermissions = this.getDefaultPermissionsForRole(roleName);
        return rolePermissions.includes(permission);
    }
}

module.exports = PermissionService;

