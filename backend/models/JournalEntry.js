const mongoose = require('mongoose');

const journalEntryLineSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account is required']
    },
    debit: {
        type: Number,
        default: 0,
        min: [0, 'Debit amount cannot be negative']
    },
    credit: {
        type: Number,
        default: 0,
        min: [0, 'Credit amount cannot be negative']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    }
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
    // Entry Identification
    entryNumber: {
        type: String,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    
    // Entry Date
    date: {
        type: Date,
        required: [true, 'Entry date is required'],
        default: Date.now,
        index: true
    },
    
    // Description
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Journal Entry Lines (Double-Entry)
    entries: {
        type: [journalEntryLineSchema],
        required: true,
        validate: {
            validator: function (entries) {
                // Must have at least 2 entries (double-entry)
                if (!entries || entries.length < 2) return false;
                
                // Total debits must equal total credits
                const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
                const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
                
                // Allow small rounding differences (0.01)
                return Math.abs(totalDebits - totalCredits) < 0.01;
            },
            message: 'Journal entry must be balanced (total debits = total credits) and have at least 2 entries'
        }
    },
    
    // Reference Information (links to source transaction)
    referenceType: {
        type: String,
        enum: ['sale', 'purchase', 'expense', 'payment', 'receipt', 'adjustment', 'manual'],
        default: 'manual',
        index: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    referenceNumber: {
        type: String,
        trim: true,
        index: true
    },
    
    // Status
    status: {
        type: String,
        enum: ['draft', 'posted', 'reversed'],
        default: 'posted',
        index: true
    },
    
    // Reversal Information (if this entry reverses another)
    reversedEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    reversedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JournalEntry'
    },
    
    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Created by is required']
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
journalEntrySchema.index({ entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ date: -1 });
journalEntrySchema.index({ referenceType: 1, referenceId: 1 });
journalEntrySchema.index({ status: 1, date: -1 });
journalEntrySchema.index({ 'entries.account': 1 });

// Virtual for total debit amount
journalEntrySchema.virtual('totalDebits').get(function () {
    return this.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
});

// Virtual for total credit amount
journalEntrySchema.virtual('totalCredits').get(function () {
    return this.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
});

// Virtual for formatted date
journalEntrySchema.virtual('formattedDate').get(function () {
    return this.date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
});

// Pre-save middleware to generate entry number
journalEntrySchema.pre('save', async function (next) {
    if (!this.entryNumber) {
        const date = new Date(this.date);
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // Get sequence number for the day
        const today = new Date(date);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const count = await this.constructor.countDocuments({
            date: { $gte: today, $lt: tomorrow }
        });
        
        const sequence = (count + 1).toString().padStart(4, '0');
        this.entryNumber = `JE${year}${month}${day}${sequence}`;
    }
    
    next();
});

// Static method to find entries by account
journalEntrySchema.statics.findByAccount = function (accountId, startDate, endDate) {
    const filter = {
        'entries.account': accountId,
        status: 'posted'
    };
    
    if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }
    
    return this.find(filter).sort({ date: 1 });
};

// Static method to find entries by reference
journalEntrySchema.statics.findByReference = function (referenceType, referenceId) {
    return this.find({
        referenceType,
        referenceId,
        status: 'posted'
    }).sort({ date: -1 });
};

// Static method to get account balance (optimized with snapshots)
journalEntrySchema.statics.getAccountBalance = async function (accountId, asOfDate = null) {
    if (!asOfDate) asOfDate = new Date();
    
    const AccountBalanceSnapshot = mongoose.model('AccountBalanceSnapshot');
    const Account = mongoose.model('Account');
    
    // Get account to determine normal balance
    const account = await Account.findById(accountId);
    if (!account) {
        throw new Error('Account not found');
    }
    
    // Get latest snapshot before asOfDate
    const snapshot = await AccountBalanceSnapshot.getLatestSnapshot(accountId, asOfDate);
    
    // Calculate delta from snapshot date to asOfDate
    const snapshotDate = snapshot?.asOfDate || new Date(0);
    const endDate = new Date(asOfDate);
    endDate.setHours(23, 59, 59, 999);
    
    const deltaResult = await this.aggregate([
        {
            $match: {
                'entries.account': new mongoose.Types.ObjectId(accountId),
                date: {
                    $gt: snapshotDate,
                    $lte: endDate
                },
                status: 'posted'
            }
        },
        { $unwind: '$entries' },
        {
            $match: {
                'entries.account': new mongoose.Types.ObjectId(accountId)
            }
        },
        {
            $group: {
                _id: null,
                totalDebit: { $sum: '$entries.debit' },
                totalCredit: { $sum: '$entries.credit' }
            }
        }
    ]);
    
    const baseBalance = snapshot?.balance || 0;
    const delta = (deltaResult[0]?.totalDebit || 0) - (deltaResult[0]?.totalCredit || 0);
    
    // Calculate balance based on account type
    const balance = baseBalance + delta;
    
    // Normalize based on account type
    if (account.type === 'asset' || account.type === 'expense') {
        // Debit balance (positive = debit)
        return balance;
    } else {
        // Credit balance (positive = credit, negative = debit)
        return balance;
    }
};

// Instance method to reverse entry
journalEntrySchema.methods.reverse = async function (reversedBy, reason) {
    if (this.status === 'reversed') {
        throw new Error('Entry is already reversed');
    }
    
    // Create reversed entries (swap debits and credits)
    const reversedEntries = this.entries.map(entry => ({
        account: entry.account,
        debit: entry.credit,
        credit: entry.debit,
        description: entry.description
    }));
    
    const reversedEntry = new this.constructor({
        date: new Date(),
        description: `Reversal: ${this.description}`,
        entries: reversedEntries,
        referenceType: 'adjustment',
        status: 'posted',
        reversedEntry: this._id,
        createdBy: reversedBy,
        notes: reason || 'Entry reversal'
    });
    
    await reversedEntry.save();
    
    // Mark original as reversed
    this.status = 'reversed';
    this.reversedBy = reversedEntry._id;
    await this.save();
    
    return reversedEntry;
};

module.exports = mongoose.model('JournalEntry', journalEntrySchema);

