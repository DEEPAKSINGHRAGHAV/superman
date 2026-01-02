# Accounting System - Pending Tasks & Improvements

This document tracks non-critical improvements and enhancements for the accounting system that are not blocking production deployment but should be implemented for a complete, production-grade system.

---

## 🔴 HIGH PRIORITY (Implement Soon)

### 1. Period Management & Fiscal Year Closing
**Status:** Not Started  
**Priority:** HIGH  
**Estimated Time:** 3-4 days

**What's Needed:**
- Create `AccountingPeriod` model to track fiscal periods
- Prevent posting entries to closed periods
- Period closing functionality
- Opening balance handling

**Implementation:**
```javascript
// Model: backend/models/AccountingPeriod.js
const accountingPeriodSchema = new Schema({
    period: { type: String, required: true, unique: true }, // '2024-01'
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    closedAt: { type: Date },
    closedBy: { type: ObjectId, ref: 'User' }
});

// Validation in JournalEntry creation
static async createJournalEntry(entryData, options = {}) {
    const period = await AccountingPeriod.findOne({
        startDate: { $lte: entryData.date },
        endDate: { $gte: entryData.date }
    });
    
    if (!period || period.status === 'closed') {
        throw new Error(`Cannot post entries to closed period`);
    }
    // ... rest of creation
}
```

**Files to Create/Modify:**
- `backend/models/AccountingPeriod.js` (new)
- `backend/services/accountingService.js` (add period validation)
- `backend/routes/accountingRoutes.js` (add period management routes)

---

### 2. Accounts Payable (AP) Tracking
**Status:** Service method exists, but no model/routes  
**Priority:** HIGH  
**Estimated Time:** 2-3 days

**What's Needed:**
- `SupplierPayment` model
- Routes for recording supplier payments
- Outstanding balance calculation
- AP aging reports

**Implementation:**
```javascript
// Model: backend/models/SupplierPayment.js
const supplierPaymentSchema = new Schema({
    paymentNumber: { type: String, unique: true },
    supplier: { type: ObjectId, ref: 'Supplier', required: true },
    purchaseOrder: { type: ObjectId, ref: 'PurchaseOrder' },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: ['cash', 'cheque', 'online', 'bank_transfer'] },
    referenceNumber: String,
    notes: String,
    createdBy: { type: ObjectId, ref: 'User', required: true }
});

// Routes: backend/routes/accountingRoutes.js
router.post('/supplier-payments', ...);
router.get('/suppliers/:id/payments', ...);
router.get('/accounts-payable/aging', ...);
```

**Files to Create/Modify:**
- `backend/models/SupplierPayment.js` (new)
- `backend/routes/accountingRoutes.js` (add AP routes)
- `backend/services/accountingService.js` (already has `createSupplierPaymentEntry`)

---

### 3. Concurrency Locking for Journal Entries
**Status:** Not Started  
**Priority:** HIGH  
**Estimated Time:** 1-2 days

**What's Needed:**
- Distributed locks for journal entry creation
- Prevent duplicate entries under high concurrency
- Optimistic locking for sequence number generation

**Implementation:**
```javascript
// Option 1: Redis locks
const Lock = require('redis-lock');

static async createJournalEntry(entryData, options = {}) {
    const lockKey = `journal-entry-${entryData.date.toISOString().split('T')[0]}`;
    const lock = await Lock.acquire(lockKey, 5000); // 5 second timeout
    
    try {
        // Generate entry number
        // Create entry
    } finally {
        await lock.release();
    }
}

// Option 2: MongoDB optimistic locking
// Add version field to JournalEntry model
```

**Files to Modify:**
- `backend/services/accountingService.js`
- `backend/models/JournalEntry.js` (add version field if using optimistic locking)

---

### 4. Expense Management Model & Routes
**Status:** Service method exists, but no model/routes  
**Priority:** HIGH  
**Estimated Time:** 2-3 days

**What's Needed:**
- `Expense` model
- Routes for expense entry
- Expense reports by category
- Budget tracking

**Implementation:**
```javascript
// Model: backend/models/Expense.js
const expenseSchema = new Schema({
    expenseNumber: { type: String, unique: true },
    category: { 
        type: String, 
        enum: ['rent', 'salaries', 'utilities', 'marketing', 'maintenance', 'other'],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true },
    vendor: String,
    description: String,
    paymentMethod: { type: String, enum: ['cash', 'cheque', 'online', 'bank_transfer'] },
    referenceNumber: String,
    createdBy: { type: ObjectId, ref: 'User', required: true }
});

// Routes: backend/routes/accountingRoutes.js
router.post('/expenses', ...);
router.get('/expenses', ...);
router.get('/expenses/report', ...);
```

**Files to Create/Modify:**
- `backend/models/Expense.js` (new)
- `backend/routes/accountingRoutes.js` (add expense routes)
- `backend/services/accountingService.js` (already has `createExpenseEntry`)

---

## 🟡 MEDIUM PRIORITY (Implement When Time Permits)

### 5. Audit Logging System
**Status:** Not Started  
**Priority:** MEDIUM  
**Estimated Time:** 2-3 days

**What's Needed:**
- `AuditLog` model to track all accounting changes
- Log account modifications, journal entry reversals, etc.
- IP tracking and user agent logging

**Implementation:**
```javascript
// Model: backend/models/AuditLog.js
const auditLogSchema = new Schema({
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: ObjectId },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    userId: { type: ObjectId, ref: 'User' },
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
});

// Middleware to log changes
```

**Files to Create:**
- `backend/models/AuditLog.js` (new)
- `backend/middleware/auditLogger.js` (new)

---

### 6. Account Reconciliation Tools
**Status:** Not Started  
**Priority:** MEDIUM  
**Estimated Time:** 2-3 days

**What's Needed:**
- Reconciliation endpoints
- Mark transactions as reconciled
- Reconciliation reports
- Bank statement import (future)

**Implementation:**
```javascript
// Add reconciliation fields to JournalEntry
reconciled: { type: Boolean, default: false },
reconciledAt: Date,
reconciledBy: { type: ObjectId, ref: 'User' },

// Routes
router.post('/accounts/:id/reconcile', ...);
router.get('/accounts/:id/reconciliation-report', ...);
```

**Files to Modify:**
- `backend/models/JournalEntry.js`
- `backend/routes/accountingRoutes.js`

---

### 7. Accounts Receivable (AR) - Customer Credit
**Status:** Planned in Phase 2  
**Priority:** MEDIUM  
**Estimated Time:** 4-5 days

**What's Needed:**
- `CustomerInvoice` model
- Credit sale support in billing
- Customer payment tracking
- AR aging reports
- Credit limit management

**Implementation:**
```javascript
// Model: backend/models/CustomerInvoice.js
const customerInvoiceSchema = new Schema({
    invoiceNumber: { type: String, unique: true },
    customer: { type: ObjectId, ref: 'Customer', required: true },
    bill: { type: ObjectId, ref: 'Bill' },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    outstandingAmount: { type: Number }, // calculated
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'partial', 'paid', 'overdue'] }
});

// Update Customer model
creditLimit: { type: Number, default: 0 },
outstandingBalance: { type: Number, default: 0 }
```

**Files to Create/Modify:**
- `backend/models/CustomerInvoice.js` (new)
- `backend/models/Customer.js` (add credit fields)
- `backend/routes/accountingRoutes.js` (add AR routes)
- `mobile/src/screens/BillingScreen.tsx` (add credit sale option)

---

### 8. Cash Management & Register
**Status:** Not Started  
**Priority:** MEDIUM  
**Estimated Time:** 3-4 days

**What's Needed:**
- `CashRegister` model
- Opening/closing cash register
- Cash reconciliation
- Petty cash tracking

**Implementation:**
```javascript
// Model: backend/models/CashRegister.js
const cashRegisterSchema = new Schema({
    registerNumber: { type: String, required: true },
    openingBalance: { type: Number, required: true },
    closingBalance: { type: Number },
    date: { type: Date, required: true },
    cashier: { type: ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' }
});
```

**Files to Create:**
- `backend/models/CashRegister.js` (new)
- `backend/routes/accountingRoutes.js` (add cash management routes)

---

## 🟢 LOW PRIORITY (Future Enhancements)

### 9. Multi-Currency Support
**Status:** Not Started  
**Priority:** LOW  
**Estimated Time:** 5-7 days

**What's Needed:**
- Currency model
- Exchange rate tracking
- Multi-currency journal entries
- Currency conversion in reports

---

### 10. Advanced Financial Reports
**Status:** Not Started  
**Priority:** LOW  
**Estimated Time:** 3-4 days

**What's Needed:**
- Cash Flow Statement
- Comparative reports (period-over-period)
- Product profitability reports
- Category-wise profitability
- Trend analysis

---

### 11. Budget vs Actual Tracking
**Status:** Not Started  
**Priority:** LOW  
**Estimated Time:** 3-4 days

**What's Needed:**
- Budget model
- Budget vs actual comparison
- Variance reports
- Budget alerts

---

### 12. Cost Center / Department Tracking
**Status:** Not Started  
**Priority:** LOW  
**Estimated Time:** 3-4 days

**What's Needed:**
- Department/Cost Center model
- Assign expenses to departments
- Department-wise P&L
- Cost allocation

---

### 13. Tax Management Enhancements
**Status:** Basic GST exists  
**Priority:** LOW  
**Estimated Time:** 4-5 days

**What's Needed:**
- Comprehensive GST input/output tracking
- GST return generation
- Tax reports
- Multiple tax types support

---

### 14. Financial Statement Export
**Status:** Not Started  
**Priority:** LOW  
**Estimated Time:** 2-3 days

**What's Needed:**
- PDF export for P&L and Balance Sheet
- Excel export
- Email reports
- Scheduled report generation

---

## 📋 Implementation Priority Summary

### Immediate (Next 2 Weeks):
1. ✅ Transaction Integrity Fix (DONE)
2. ✅ Balance Performance Optimization (DONE)
3. ✅ Financial Statements (DONE)
4. Period Management
5. Accounts Payable Tracking
6. Concurrency Locking

### Short Term (Next Month):
7. Expense Management
8. Audit Logging
9. Account Reconciliation

### Medium Term (Next Quarter):
10. Accounts Receivable
11. Cash Management
12. Advanced Reports

### Long Term (Future):
13. Multi-Currency
14. Budget Tracking
15. Cost Centers
16. Tax Enhancements

---

## 📝 Notes

- All critical fixes have been completed ✅
- System is now production-ready with monitoring
- Remaining tasks are enhancements, not blockers
- Prioritize based on business needs

---

**Last Updated:** 2024-01-15  
**Status:** Critical fixes complete, pending tasks documented




