const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    // Account Identification
    code: {
        type: String,
        required: [true, 'Account code is required'],
        unique: true,
        trim: true,
        uppercase: true,
        match: [/^\d{4,6}$/, 'Account code must be 4-6 digits'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true,
        minlength: [2, 'Account name must be at least 2 characters long'],
        maxlength: [100, 'Account name cannot exceed 100 characters'],
        index: true
    },
    
    // Account Classification
    type: {
        type: String,
        required: [true, 'Account type is required'],
        enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
        index: true
    },
    
    // Hierarchy (for sub-accounts)
    parentAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    
    // Account Details
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Balance Information (calculated, not stored)
    // Opening balance for the account (if needed)
    openingBalance: {
        type: Number,
        default: 0
    },
    openingBalanceDate: {
        type: Date
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
accountSchema.index({ code: 1 }, { unique: true });
accountSchema.index({ type: 1, isActive: 1 });
accountSchema.index({ parentAccount: 1 });

// Virtual for account balance (will be calculated from journal entries)
accountSchema.virtual('balance', {
    ref: 'JournalEntry',
    localField: '_id',
    foreignField: 'entries.account',
    justOne: false
});

// Virtual for account type label
accountSchema.virtual('typeLabel').get(function () {
    const labels = {
        'asset': 'Asset',
        'liability': 'Liability',
        'equity': 'Equity',
        'revenue': 'Revenue',
        'expense': 'Expense'
    };
    return labels[this.type] || this.type;
});

// Static method to get accounts by type
accountSchema.statics.findByType = function (type) {
    return this.find({ type, isActive: true }).sort({ code: 1 });
};

// Static method to get chart of accounts structure
accountSchema.statics.getChartOfAccounts = async function () {
    const accounts = await this.find({ isActive: true }).sort({ code: 1 });
    
    // Group by type
    const grouped = {
        assets: accounts.filter(a => a.type === 'asset'),
        liabilities: accounts.filter(a => a.type === 'liability'),
        equity: accounts.filter(a => a.type === 'equity'),
        revenue: accounts.filter(a => a.type === 'revenue'),
        expenses: accounts.filter(a => a.type === 'expense')
    };
    
    return grouped;
};

// Static method to initialize default chart of accounts
accountSchema.statics.initializeDefaultAccounts = async function (createdBy) {
    const defaultAccounts = [
        // Assets (1000-1999)
        { code: '1000', name: 'Cash', type: 'asset', description: 'Cash in hand and bank' },
        { code: '1100', name: 'Inventory', type: 'asset', description: 'Stock inventory' },
        { code: '1200', name: 'Accounts Receivable', type: 'asset', description: 'Amounts owed by customers' },
        { code: '1300', name: 'Fixed Assets', type: 'asset', description: 'Equipment, furniture, etc.' },
        
        // Liabilities (2000-2999)
        { code: '2000', name: 'Accounts Payable', type: 'liability', description: 'Amounts owed to suppliers' },
        { code: '2100', name: 'Short-term Loans', type: 'liability', description: 'Short-term borrowings' },
        
        // Equity (3000-3999)
        { code: '3000', name: 'Capital', type: 'equity', description: 'Owner capital' },
        { code: '3100', name: 'Retained Earnings', type: 'equity', description: 'Accumulated profits' },
        
        // Revenue (4000-4999)
        { code: '4000', name: 'Sales Revenue', type: 'revenue', description: 'Revenue from product sales' },
        { code: '4100', name: 'Other Income', type: 'revenue', description: 'Other sources of income' },
        
        // Expenses (5000-5999)
        { code: '5000', name: 'Cost of Goods Sold', type: 'expense', description: 'Direct costs of products sold' },
        { code: '5100', name: 'Rent', type: 'expense', description: 'Rent expenses' },
        { code: '5200', name: 'Salaries', type: 'expense', description: 'Employee salaries' },
        { code: '5300', name: 'Utilities', type: 'expense', description: 'Electricity, water, etc.' },
        { code: '5400', name: 'Marketing', type: 'expense', description: 'Marketing and advertising' },
        { code: '5500', name: 'Maintenance', type: 'expense', description: 'Repairs and maintenance' },
        { code: '5600', name: 'Other Expenses', type: 'expense', description: 'Other operating expenses' }
    ];
    
    // Check if accounts already exist
    const existingCodes = await this.find({ code: { $in: defaultAccounts.map(a => a.code) } }).select('code');
    const existingCodeSet = new Set(existingCodes.map(a => a.code));
    
    // Only create accounts that don't exist
    const accountsToCreate = defaultAccounts
        .filter(acc => !existingCodeSet.has(acc.code))
        .map(acc => ({ ...acc, createdBy }));
    
    if (accountsToCreate.length > 0) {
        await this.insertMany(accountsToCreate);
    }
    
    return accountsToCreate.length;
};

// Instance method to check if account can be deleted
accountSchema.methods.canDelete = async function () {
    const JournalEntry = mongoose.model('JournalEntry');
    const hasEntries = await JournalEntry.exists({
        'entries.account': this._id
    });
    return !hasEntries;
};

module.exports = mongoose.model('Account', accountSchema);




