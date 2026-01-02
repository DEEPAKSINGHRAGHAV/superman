const mongoose = require('mongoose');

const accountBalanceSnapshotSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    asOfDate: {
        type: Date,
        required: true,
        index: true
    },
    period: {
        type: String,
        required: true,
        index: true
    }, // Format: 'YYYY-MM'
    debitTotal: {
        type: Number,
        default: 0
    },
    creditTotal: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound indexes for fast lookups
accountBalanceSnapshotSchema.index({ account: 1, asOfDate: -1 });
accountBalanceSnapshotSchema.index({ period: 1, account: 1 });
accountBalanceSnapshotSchema.index({ account: 1, period: 1 }, { unique: true }); // One snapshot per account per period

// Static method to get latest snapshot
accountBalanceSnapshotSchema.statics.getLatestSnapshot = function(accountId, asOfDate) {
    return this.findOne({
        account: accountId,
        asOfDate: { $lte: asOfDate }
    }).sort({ asOfDate: -1 });
};

// Static method to get snapshot for a specific period
accountBalanceSnapshotSchema.statics.getSnapshotForPeriod = function(accountId, period) {
    return this.findOne({
        account: accountId,
        period: period
    });
};

module.exports = mongoose.model('AccountBalanceSnapshot', accountBalanceSnapshotSchema);




