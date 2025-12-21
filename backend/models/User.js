const mongoose = require('mongoose');
const { ALL_PERMISSIONS } = require('../config/permissions');
const PermissionService = require('../services/permissionService');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        index: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Don't include password in queries by default
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'employee', 'viewer'],
        default: 'employee',
        index: true
    },
    permissions: [{
        type: String,
        enum: ALL_PERMISSIONS // Use centralized permission config
    }],
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        select: false
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for user's full profile
userSchema.virtual('profile').get(function () {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        phone: this.phone,
        role: this.role,
        permissions: this.permissions,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ name: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ lastLogin: -1 });

// Pre-save middleware
userSchema.pre('save', function (next) {
    // Update lastLogin on login
    if (this.isModified('lastLogin')) {
        this.loginAttempts = 0;
        this.lockUntil = undefined;
    }
    
    // Clear permission cache if permissions or role changed
    if (this.isModified('permissions') || this.isModified('role')) {
        const PermissionService = require('../services/permissionService');
        PermissionService.clearCache(this);
    }
    
    next();
});

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
    return this.find({ isActive: true }).select('-password');
};

// Static method to find users by role
userSchema.statics.findByRole = function (role) {
    return this.find({ role, isActive: true }).select('-password');
};

// Static method to find users with permission
userSchema.statics.findByPermission = function (permission) {
    return this.find({
        isActive: true,
        $or: [
            { role: 'admin' },
            { permissions: permission }
        ]
    }).select('-password');
};

// Instance method to get user summary
userSchema.methods.getSummary = function () {
    return `${this.name} (${this.email}) - ${this.role}`;
};

// Instance method to check if user has permission
// Uses PermissionService for centralized permission logic
userSchema.methods.hasPermission = function (permission) {
    return PermissionService.hasPermission(this, permission);
};

// Instance method to check if user has any of the permissions
userSchema.methods.hasAnyPermission = function (permissions) {
    return PermissionService.hasAnyPermission(this, permissions);
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }

    return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 },
        $set: { lastLogin: new Date() }
    });
};

module.exports = mongoose.model('User', userSchema);
