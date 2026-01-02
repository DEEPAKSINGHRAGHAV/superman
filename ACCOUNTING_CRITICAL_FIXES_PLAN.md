# Accounting Critical Fixes Implementation Plan

## Priority 1: Transaction Integrity Fix (CRITICAL - Do First)

### Problem
Journal entries are created outside the main transaction, causing data inconsistency if accounting fails.

### Solution
Integrate journal entry creation into the main database transaction for sales and purchases.

### Implementation Steps

#### Step 1: Modify Sale Processing (`backend/routes/inventoryRoutes.js`)

**Current Code (WRONG):**
```javascript
// Process sale (separate transaction)
const results = await InventoryService.processSale(...);

// Create bill (separate transaction)
const bill = await Bill.create({...});

// Create journal entry (separate transaction - can fail silently)
try {
    await AccountingService.createSaleEntry({...});
} catch (error) {
    // Sale succeeds even if accounting fails!
}
```

**Fixed Code:**
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
    // 1. Process sale WITHIN transaction
    const results = await InventoryService.processSale(
        saleItems,
        req.user._id,
        referenceNumber,
        { session } // Pass session
    );

    // 2. Create bill WITHIN transaction
    let bill = null;
    if (receiptData) {
        // ... calculate bill data ...
        const bills = await Bill.create([{
            billNumber: receiptData.billNumber || referenceNumber,
            items: billItems,
            // ... all fields ...
        }], { session });
        bill = bills[0];

        // 3. Create journal entry WITHIN transaction
        await AccountingService.createSaleEntry({
            billId: bill._id,
            billNumber: bill.billNumber,
            totalAmount: bill.totalAmount,
            totalCost: bill.totalCost,
            paymentMethod: bill.paymentMethod,
            customerId: customer ? customer._id : null,
            createdBy: req.user._id
        }, { session }); // Pass session - CRITICAL
    }

    // 4. Commit everything together
    await session.commitTransaction();

    res.status(201).json({
        success: true,
        message: 'Sales processed successfully',
        data: results,
        bill: bill
    });

} catch (error) {
    // 5. Rollback everything on any error
    await session.abortTransaction();
    throw error; // Let asyncHandler handle it
} finally {
    session.endSession();
}
```

**Key Changes:**
1. Create MongoDB session at start
2. Pass `session` to all operations (processSale, Bill.create, createSaleEntry)
3. Commit only after ALL operations succeed
4. Abort transaction on ANY error

#### Step 2: Modify Purchase Order Receipt (`backend/routes/purchaseOrderRoutes.js`)

**Apply same pattern:**
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
    // 1. Update PO status (with optimistic lock)
    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
        req.params.id,
        { 
            status: 'received',
            receivedAt: new Date(),
            receivedBy: req.user._id
        },
        { 
            session,
            new: true,
            runValidators: true
        }
    ).populate('supplier');

    // 2. Create batches WITHIN transaction
    const createdBatches = [];
    for (const receivedItem of receivedItems) {
        const batch = await BatchService.createBatch({
            // ... batch data ...
        }, { session }); // Pass session
        createdBatches.push(batch);
    }

    // 3. Create journal entry WITHIN transaction
    await AccountingService.createPurchaseEntry({
        purchaseOrderId: purchaseOrder._id,
        orderNumber: purchaseOrder.orderNumber,
        totalAmount: purchaseOrder.totalAmount,
        supplierId: purchaseOrder.supplier._id,
        createdBy: req.user._id
    }, { session }); // Pass session

    // 4. Commit everything
    await session.commitTransaction();

    res.status(200).json({
        success: true,
        message: 'Purchase order received successfully',
        data: {
            purchaseOrder,
            batches: createdBatches
        }
    });

} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
```

#### Step 3: Update Service Methods to Accept Session

**`backend/services/inventoryService.js`:**
```javascript
static async processSale(saleItems, createdBy, referenceNumber, options = {}) {
    const { session } = options; // Accept session
    
    // Pass session to all database operations
    // ...
}
```

**`backend/services/batchService.js`:**
```javascript
static async createBatch(batchData, options = {}) {
    const { session: providedSession } = options;
    // Already handles session correctly ✅
}
```

**`backend/services/accountingService.js`:**
```javascript
static async createSaleEntry(saleData, options = {}) {
    const { session: providedSession } = options;
    // Already handles session correctly ✅
}
```

### Testing
```javascript
// Test Case 1: Sale succeeds, accounting succeeds
// Expected: Both succeed, transaction committed

// Test Case 2: Sale succeeds, accounting fails
// Expected: Both rollback, error returned

// Test Case 3: Sale fails
// Expected: Transaction aborted, no journal entry created
```

---

## Priority 2: Balance Calculation Performance Fix (CRITICAL)

### Problem
Balance calculation scans all journal entries, becomes slow at scale.

### Solution
Implement balance snapshot system with incremental calculation.

### Implementation Steps

#### Step 1: Create AccountBalanceSnapshot Model

**File: `backend/models/AccountBalanceSnapshot.js`**
```javascript
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

// Compound index for fast lookups
accountBalanceSnapshotSchema.index({ account: 1, asOfDate: -1 });
accountBalanceSnapshotSchema.index({ period: 1, account: 1 });

// Static method to get latest snapshot
accountBalanceSnapshotSchema.statics.getLatestSnapshot = function(accountId, asOfDate) {
    return this.findOne({
        account: accountId,
        asOfDate: { $lte: asOfDate }
    }).sort({ asOfDate: -1 });
};

module.exports = mongoose.model('AccountBalanceSnapshot', accountBalanceSnapshotSchema);
```

#### Step 2: Update Balance Calculation Method

**File: `backend/models/JournalEntry.js`**
```javascript
// Update getAccountBalance method
static async getAccountBalance(accountId, asOfDate = null) {
    if (!asOfDate) asOfDate = new Date();
    
    const AccountBalanceSnapshot = mongoose.model('AccountBalanceSnapshot');
    const Account = mongoose.model('Account');
    
    // Get account to determine normal balance
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Account not found');
    
    // Get latest snapshot before asOfDate
    const snapshot = await AccountBalanceSnapshot.getLatestSnapshot(accountId, asOfDate);
    
    // Calculate delta from snapshot date to asOfDate
    const deltaResult = await this.aggregate([
        {
            $match: {
                'entries.account': new mongoose.Types.ObjectId(accountId),
                date: {
                    $gt: snapshot?.asOfDate || new Date(0),
                    $lte: asOfDate
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
}
```

#### Step 3: Create Snapshot Generation Job

**File: `backend/jobs/accountingSnapshotJob.js`**
```javascript
const Account = require('../models/Account');
const JournalEntry = require('../models/JournalEntry');
const AccountBalanceSnapshot = require('../models/AccountBalanceSnapshot');
const mongoose = require('mongoose');

/**
 * Generate balance snapshots for all accounts
 * Should run daily at midnight
 */
async function generateBalanceSnapshots() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get yesterday's date for snapshot
    const snapshotDate = new Date(today);
    snapshotDate.setDate(snapshotDate.getDate() - 1);
    snapshotDate.setHours(23, 59, 59, 999);
    
    const period = `${snapshotDate.getFullYear()}-${String(snapshotDate.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`Generating balance snapshots for ${snapshotDate.toISOString()}...`);
    
    const accounts = await Account.find({ isActive: true });
    const snapshots = [];
    
    for (const account of accounts) {
        // Check if snapshot already exists
        const existing = await AccountBalanceSnapshot.findOne({
            account: account._id,
            period: period
        });
        
        if (existing) {
            console.log(`Snapshot already exists for account ${account.code} period ${period}`);
            continue;
        }
        
        // Calculate balance using old method (first time only)
        // Or use latest snapshot + delta
        const latestSnapshot = await AccountBalanceSnapshot.getLatestSnapshot(
            account._id,
            snapshotDate
        );
        
        let balance = 0;
        let debitTotal = 0;
        let creditTotal = 0;
        
        if (latestSnapshot) {
            // Calculate from latest snapshot
            const deltaResult = await JournalEntry.aggregate([
                {
                    $match: {
                        'entries.account': account._id,
                        date: {
                            $gt: latestSnapshot.asOfDate,
                            $lte: snapshotDate
                        },
                        status: 'posted'
                    }
                },
                { $unwind: '$entries' },
                {
                    $match: {
                        'entries.account': account._id
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
            
            balance = latestSnapshot.balance + 
                      ((deltaResult[0]?.totalDebit || 0) - (deltaResult[0]?.totalCredit || 0));
            debitTotal = latestSnapshot.debitTotal + (deltaResult[0]?.totalDebit || 0);
            creditTotal = latestSnapshot.creditTotal + (deltaResult[0]?.totalCredit || 0);
        } else {
            // First snapshot - calculate from beginning
            const allEntries = await JournalEntry.aggregate([
                {
                    $match: {
                        'entries.account': account._id,
                        date: { $lte: snapshotDate },
                        status: 'posted'
                    }
                },
                { $unwind: '$entries' },
                {
                    $match: {
                        'entries.account': account._id
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
            
            balance = (allEntries[0]?.totalDebit || 0) - (allEntries[0]?.totalCredit || 0);
            debitTotal = allEntries[0]?.totalDebit || 0;
            creditTotal = allEntries[0]?.totalCredit || 0;
        }
        
        snapshots.push({
            account: account._id,
            balance: balance,
            asOfDate: snapshotDate,
            period: period,
            debitTotal: debitTotal,
            creditTotal: creditTotal
        });
    }
    
    if (snapshots.length > 0) {
        await AccountBalanceSnapshot.insertMany(snapshots);
        console.log(`Created ${snapshots.length} balance snapshots`);
    } else {
        console.log('No new snapshots to create');
    }
}

module.exports = { generateBalanceSnapshots };
```

#### Step 4: Schedule Snapshot Job

**File: `backend/server.js` (add to startup)**
```javascript
const cron = require('node-cron');
const { generateBalanceSnapshots } = require('./jobs/accountingSnapshotJob');

// Run daily at 1:00 AM
cron.schedule('0 1 * * *', async () => {
    console.log('Running daily balance snapshot job...');
    try {
        await generateBalanceSnapshots();
    } catch (error) {
        console.error('Error generating balance snapshots:', error);
    }
});
```

**Or use node-cron package:**
```bash
npm install node-cron
```

### Performance Improvement

**Before:**
- 1M journal entries: ~5-10 seconds per balance calculation
- Trial balance: ~2-3 minutes

**After:**
- With snapshot: ~50-100ms per balance calculation (100x faster)
- Trial balance: ~2-5 seconds (36x faster)

---

## Priority 3: Financial Statements Implementation

### Profit & Loss Statement

**File: `backend/services/accountingService.js`**
```javascript
static async getProfitAndLossStatement(startDate, endDate) {
    // Ensure dates are set
    if (!startDate) {
        startDate = new Date(new Date().getFullYear(), 0, 1); // Start of year
    }
    if (!endDate) {
        endDate = new Date();
    }
    
    // Get revenue accounts (4000-4999)
    const revenueAccounts = await Account.find({
        code: { $gte: '4000', $lt: '5000' },
        isActive: true
    }).sort({ code: 1 });
    
    // Get COGS account (5000)
    const cogsAccount = await this.getAccountByCode('5000');
    
    // Get expense accounts (5100-5999)
    const expenseAccounts = await Account.find({
        code: { $gte: '5100', $lt: '6000' },
        isActive: true
    }).sort({ code: 1 });
    
    // Calculate totals for period
    let totalRevenue = 0;
    const revenueDetails = [];
    
    for (const account of revenueAccounts) {
        const startBalance = await JournalEntry.getAccountBalance(account._id, startDate);
        const endBalance = await JournalEntry.getAccountBalance(account._id, endDate);
        const periodAmount = endBalance - startBalance;
        
        totalRevenue += periodAmount;
        revenueDetails.push({
            account: {
                code: account.code,
                name: account.name
            },
            amount: periodAmount
        });
    }
    
    const startCOGS = await JournalEntry.getAccountBalance(cogsAccount._id, startDate);
    const endCOGS = await JournalEntry.getAccountBalance(cogsAccount._id, endDate);
    const totalCOGS = endCOGS - startCOGS;
    
    const grossProfit = totalRevenue - totalCOGS;
    
    let totalExpenses = 0;
    const expenseDetails = [];
    
    for (const account of expenseAccounts) {
        const startBalance = await JournalEntry.getAccountBalance(account._id, startDate);
        const endBalance = await JournalEntry.getAccountBalance(account._id, endDate);
        const periodAmount = endBalance - startBalance; // Expenses are debits, so positive = expense
        
        totalExpenses += periodAmount;
        expenseDetails.push({
            account: {
                code: account.code,
                name: account.name
            },
            amount: periodAmount
        });
    }
    
    const netIncome = grossProfit - totalExpenses;
    
    return {
        period: {
            startDate,
            endDate
        },
        revenue: {
            total: totalRevenue,
            details: revenueDetails
        },
        costOfGoodsSold: {
            total: totalCOGS,
            account: {
                code: cogsAccount.code,
                name: cogsAccount.name
            }
        },
        grossProfit: grossProfit,
        expenses: {
            total: totalExpenses,
            details: expenseDetails
        },
        netIncome: netIncome,
        grossProfitMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0,
        netProfitMargin: totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(2) : 0
    };
}
```

### Balance Sheet

**Add to `backend/services/accountingService.js`:**
```javascript
static async getBalanceSheet(asOfDate = null) {
    if (!asOfDate) asOfDate = new Date();
    
    // Get all account types
    const assets = await Account.find({
        type: 'asset',
        isActive: true
    }).sort({ code: 1 });
    
    const liabilities = await Account.find({
        type: 'liability',
        isActive: true
    }).sort({ code: 1 });
    
    const equity = await Account.find({
        type: 'equity',
        isActive: true
    }).sort({ code: 1 });
    
    // Calculate balances
    const assetDetails = [];
    let totalAssets = 0;
    
    for (const account of assets) {
        const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
        // Assets: positive balance = debit (asset value)
        const assetValue = Math.max(0, balance);
        totalAssets += assetValue;
        assetDetails.push({
            account: {
                code: account.code,
                name: account.name
            },
            balance: assetValue
        });
    }
    
    const liabilityDetails = [];
    let totalLiabilities = 0;
    
    for (const account of liabilities) {
        const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
        // Liabilities: positive balance = credit (liability amount)
        const liabilityAmount = Math.max(0, -balance); // Invert for liabilities
        totalLiabilities += liabilityAmount;
        liabilityDetails.push({
            account: {
                code: account.code,
                name: account.name
            },
            balance: liabilityAmount
        });
    }
    
    const equityDetails = [];
    let totalEquity = 0;
    
    for (const account of equity) {
        const balance = await JournalEntry.getAccountBalance(account._id, asOfDate);
        // Equity: positive balance = credit (equity value)
        const equityValue = Math.max(0, -balance); // Invert for equity
        totalEquity += equityValue;
        equityDetails.push({
            account: {
                code: account.code,
                name: account.name
            },
            balance: equityValue
        });
    }
    
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    
    return {
        asOfDate,
        assets: {
            total: totalAssets,
            details: assetDetails
        },
        liabilities: {
            total: totalLiabilities,
            details: liabilityDetails
        },
        equity: {
            total: totalEquity,
            details: equityDetails
        },
        totalLiabilitiesAndEquity: totalLiabilitiesAndEquity,
        balanced: difference < 0.01, // Allow small rounding differences
        difference: difference
    };
}
```

### Add Routes

**File: `backend/routes/accountingRoutes.js`**
```javascript
/**
 * @route   GET /api/v1/accounting/financial/pl-statement
 * @desc    Get Profit & Loss Statement
 * @access  Private
 */
router.get('/financial/pl-statement', protect, asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const plStatement = await AccountingService.getProfitAndLossStatement(
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
    );
    
    res.status(200).json({
        success: true,
        data: plStatement
    });
}));

/**
 * @route   GET /api/v1/accounting/financial/balance-sheet
 * @desc    Get Balance Sheet
 * @access  Private
 */
router.get('/financial/balance-sheet', protect, asyncHandler(async (req, res) => {
    const { asOfDate } = req.query;
    
    const balanceSheet = await AccountingService.getBalanceSheet(
        asOfDate ? new Date(asOfDate) : null
    );
    
    res.status(200).json({
        success: true,
        data: balanceSheet
    });
}));
```

---

## Testing Checklist

### Transaction Integrity Tests
- [ ] Sale succeeds → Journal entry created (in same transaction)
- [ ] Sale fails → No journal entry created
- [ ] Journal entry creation fails → Sale rolls back
- [ ] Purchase succeeds → Journal entry created (in same transaction)
- [ ] Concurrent sales → All journal entries created correctly

### Performance Tests
- [ ] Balance calculation < 100ms with 1M entries
- [ ] Trial balance generation < 5 seconds
- [ ] Snapshot job completes in < 2 minutes

### Financial Statement Tests
- [ ] P&L totals match sum of account balances
- [ ] Balance sheet balances (Assets = Liabilities + Equity)
- [ ] Period filtering works correctly
- [ ] Calculations handle edge cases (zero revenue, negative expenses)

---

## Deployment Checklist

### Before Deployment:
- [ ] Run migration to create AccountBalanceSnapshot collection
- [ ] Run initial snapshot generation job manually
- [ ] Test transaction integrity in staging
- [ ] Performance test with production-like data
- [ ] Backup current data before changes

### After Deployment:
- [ ] Monitor journal entry creation success rate
- [ ] Monitor balance calculation performance
- [ ] Verify snapshot job runs daily
- [ ] Check for any transaction rollback errors

---

## Estimated Time

- **Priority 1 (Transaction Integrity):** 1-2 days
- **Priority 2 (Balance Performance):** 2-3 days
- **Priority 3 (Financial Statements):** 2-3 days
- **Testing & QA:** 2-3 days

**Total: ~1.5-2 weeks** for critical fixes




