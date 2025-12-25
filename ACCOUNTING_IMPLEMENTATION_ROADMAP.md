# Accounting Implementation Roadmap for Shivik Mart

## Quick Summary

**Current State:** Your system tracks sales and purchases but lacks proper accounting infrastructure.

**Missing:** Accounts Payable, Accounts Receivable, General Ledger, Expense Management, Financial Statements, Cash Management, Tax Management.

**Impact:** Can't track what you owe suppliers, can't offer credit to customers, can't see true profitability, can't generate financial statements.

---

## 🎯 Phase 1: Critical Foundation (4-6 weeks)

### 1.1 General Ledger System
**Priority:** ⭐⭐⭐ CRITICAL

**What to Build:**
- Chart of Accounts model
- Journal Entry model
- Double-entry bookkeeping logic
- Account balance calculations

**Models Needed:**
- `Account` - Chart of accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- `JournalEntry` - All financial transactions

**Integration:**
- Auto-create journal entries when:
  - Bill is created (Sales transaction)
  - PurchaseOrder is received (Purchase transaction)
  - Stock is adjusted (Inventory transaction)

**API Endpoints:**
```
GET    /api/v1/accounts              - List all accounts
POST   /api/v1/accounts               - Create account
GET    /api/v1/journal-entries        - List journal entries
POST   /api/v1/journal-entries        - Create manual entry
GET    /api/v1/accounts/:id/balance  - Get account balance
```

---

### 1.2 Accounts Payable (Supplier Payments)
**Priority:** ⭐⭐⭐ CRITICAL

**What to Build:**
- Track outstanding supplier balances
- Record supplier payments
- Link payments to purchase orders
- Calculate what you owe each supplier

**Models Needed:**
- `SupplierPayment` - Record each payment to supplier
- Update `PurchaseOrder` - Track paid amount vs. total amount

**Business Logic:**
- When PO is received → Create AP entry (you owe supplier)
- When payment made → Record payment, reduce AP balance
- Calculate outstanding = totalAmount - paidAmount

**API Endpoints:**
```
GET    /api/v1/suppliers/:id/payments        - Payment history
POST   /api/v1/suppliers/:id/payments         - Record payment
GET    /api/v1/suppliers/:id/outstanding      - Outstanding balance
GET    /api/v1/accounts-payable/aging         - Aging report
```

**UI Screens:**
- Supplier payment form
- Outstanding balances list
- Payment history
- Aging report

---

### 1.3 Expense Management
**Priority:** ⭐⭐⭐ CRITICAL

**What to Build:**
- Record operational expenses (rent, salaries, utilities, etc.)
- Categorize expenses
- Track expense payments
- Generate expense reports

**Models Needed:**
- `Expense` - Record each expense
- Expense categories: Rent, Salaries, Utilities, Marketing, Maintenance, Other

**Business Logic:**
- Create expense → Debit expense account, Credit cash/AP
- Link to journal entries automatically

**API Endpoints:**
```
GET    /api/v1/expenses               - List expenses
POST   /api/v1/expenses               - Create expense
GET    /api/v1/expenses/categories    - Expense by category
GET    /api/v1/expenses/report        - Expense report
```

**UI Screens:**
- Expense entry form
- Expense list with filters
- Expense reports (category-wise, period-wise)

---

### 1.4 Basic Financial Statements
**Priority:** ⭐⭐⭐ CRITICAL

**What to Build:**
- Profit & Loss (P&L) Statement
- Balance Sheet
- Generate from journal entries

**P&L Structure:**
```
Revenue
  - Sales Revenue
  - Other Income
Total Revenue

Cost of Goods Sold
  - Inventory Purchases
Total COGS

Gross Profit (Revenue - COGS)

Operating Expenses
  - Rent
  - Salaries
  - Utilities
  - Marketing
  - Other Expenses
Total Operating Expenses

Net Profit (Gross Profit - Operating Expenses)
```

**Balance Sheet Structure:**
```
ASSETS
  Current Assets
    - Cash
    - Inventory
    - Accounts Receivable
  Fixed Assets
    - Equipment
    - Furniture
Total Assets

LIABILITIES
  Current Liabilities
    - Accounts Payable
    - Short-term Loans
  Long-term Liabilities
    - Long-term Loans
Total Liabilities

EQUITY
  - Capital
  - Retained Earnings
Total Equity

Total Liabilities + Equity = Total Assets
```

**API Endpoints:**
```
GET    /api/v1/financial/pl-statement      - Profit & Loss
GET    /api/v1/financial/balance-sheet     - Balance Sheet
GET    /api/v1/financial/trial-balance     - Trial Balance
```

**UI Screens:**
- P&L Statement view
- Balance Sheet view
- Date range filters

---

## 🎯 Phase 2: Revenue Enhancement (3-4 weeks)

### 2.1 Accounts Receivable (Customer Credit)
**Priority:** ⭐⭐ HIGH

**What to Build:**
- Allow credit sales to customers
- Track customer outstanding balances
- Record customer payments
- Credit limit management

**Models Needed:**
- `CustomerInvoice` - Track credit sales
- Update `Customer` - Add creditLimit, outstandingBalance
- Update `Bill` - Add isCreditSale flag

**Business Logic:**
- When credit sale → Create invoice, don't reduce cash
- When customer pays → Record payment against invoice
- Calculate outstanding = invoiceAmount - paidAmount
- Check credit limit before allowing credit sale

**API Endpoints:**
```
GET    /api/v1/customers/:id/invoices       - Customer invoices
POST   /api/v1/customers/:id/payments       - Record payment
GET    /api/v1/customers/:id/outstanding     - Outstanding balance
GET    /api/v1/accounts-receivable/aging     - Aging report
POST   /api/v1/bills/:id/convert-to-credit   - Convert sale to credit
```

**UI Screens:**
- Credit sale option in billing
- Customer payment form
- Outstanding invoices list
- Aging report

---

### 2.2 Cash Management
**Priority:** ⭐⭐ HIGH

**What to Build:**
- Cash register opening/closing
- Cash reconciliation
- Petty cash tracking
- Cash flow tracking

**Models Needed:**
- `CashRegister` - Track daily cash operations
- `CashTransaction` - All cash movements

**Business Logic:**
- Opening balance + Sales (cash) - Expenses (cash) = Expected closing balance
- Compare with actual cash count
- Track discrepancies

**API Endpoints:**
```
POST   /api/v1/cash-register/open           - Open register
POST   /api/v1/cash-register/close          - Close register
GET    /api/v1/cash-register/reconciliation - Cash reconciliation
GET    /api/v1/cash-flow                    - Cash flow report
```

**UI Screens:**
- Cash register open/close
- Cash reconciliation
- Cash flow dashboard

---

## 🎯 Phase 3: Compliance & Analytics (2-3 weeks)

### 3.1 Enhanced Tax Management
**Priority:** ⭐ IMPORTANT

**What to Build:**
- Comprehensive GST tracking
- GST input/output calculations
- GST return preparation
- Tax reports

**Business Logic:**
- Track GST paid on purchases (Input GST)
- Track GST collected on sales (Output GST)
- Calculate GST payable = Output GST - Input GST
- Generate GST return data

**API Endpoints:**
```
GET    /api/v1/tax/gst-summary              - GST summary
GET    /api/v1/tax/gst-return               - GST return data
GET    /api/v1/tax/reports                   - Tax reports
```

---

### 3.2 Advanced Financial Reports
**Priority:** ⭐ IMPORTANT

**What to Build:**
- Sales reports (daily, weekly, monthly, yearly)
- Purchase reports (supplier-wise, product-wise)
- Expense reports (category-wise)
- Profitability analysis
- Cash flow reports
- Comparative reports (period-over-period)

**API Endpoints:**
```
GET    /api/v1/reports/sales                - Sales reports
GET    /api/v1/reports/purchases            - Purchase reports
GET    /api/v1/reports/expenses             - Expense reports
GET    /api/v1/reports/profitability        - Profitability analysis
GET    /api/v1/reports/cash-flow            - Cash flow report
GET    /api/v1/reports/comparative          - Comparative reports
```

---

## 📊 Data Model Summary

### New Models to Create:

1. **Account** - Chart of accounts
2. **JournalEntry** - General ledger entries
3. **SupplierPayment** - Supplier payment records
4. **CustomerInvoice** - Customer credit invoices
5. **CustomerPayment** - Customer payment records
6. **Expense** - Operational expenses
7. **CashRegister** - Cash register management
8. **CashTransaction** - Cash movements

### Models to Update:

1. **PurchaseOrder** - Add paidAmount, link to SupplierPayment
2. **Bill** - Add isCreditSale, link to CustomerInvoice
3. **Customer** - Add creditLimit, outstandingBalance
4. **Supplier** - Add outstandingBalance (calculated)

---

## 🔄 Integration Flow

### Sales Flow (With Accounting):
```
1. Customer buys product
2. Create Bill
3. Auto-create Journal Entry:
   - Debit: Cash/Accounts Receivable
   - Credit: Sales Revenue
   - Debit: COGS
   - Credit: Inventory
4. If credit sale → Create CustomerInvoice
5. Update P&L and Balance Sheet
```

### Purchase Flow (With Accounting):
```
1. Receive Purchase Order
2. Create InventoryBatch
3. Auto-create Journal Entry:
   - Debit: Inventory
   - Credit: Accounts Payable
4. When payment made → Create SupplierPayment
5. Update Accounts Payable balance
6. Update Balance Sheet
```

### Expense Flow (With Accounting):
```
1. Record Expense
2. Auto-create Journal Entry:
   - Debit: Expense Account (e.g., Rent)
   - Credit: Cash/Accounts Payable
3. Update P&L Statement
4. Update Balance Sheet
```

---

## 📱 UI/UX Requirements

### Mobile App Screens:
1. **Accounting Dashboard**
   - Quick financial overview
   - Outstanding AP/AR
   - Cash balance
   - Today's profit

2. **Supplier Payments**
   - List suppliers with outstanding
   - Payment form
   - Payment history

3. **Expense Entry**
   - Quick expense form
   - Category selection
   - Photo attachment (receipts)

4. **Financial Reports**
   - P&L view
   - Balance Sheet view
   - Cash flow view

5. **Customer Credit**
   - Credit sale option
   - Customer payment form
   - Outstanding invoices

### Website Screens:
1. **Accounting Dashboard** - Full financial overview
2. **Accounts Payable** - Supplier payment management
3. **Accounts Receivable** - Customer credit management
4. **Expense Management** - Expense entry and reports
5. **Financial Statements** - P&L, Balance Sheet, Cash Flow
6. **Reports** - All financial reports
7. **Cash Management** - Cash register and reconciliation

---

## 🧪 Testing Checklist

### Phase 1 Testing:
- [ ] Journal entries created automatically for sales
- [ ] Journal entries created automatically for purchases
- [ ] Journal entries created automatically for expenses
- [ ] Account balances calculated correctly
- [ ] Supplier payments reduce AP balance
- [ ] P&L statement shows correct profit
- [ ] Balance Sheet balances (Assets = Liabilities + Equity)

### Phase 2 Testing:
- [ ] Credit sales create invoices
- [ ] Customer payments reduce AR balance
- [ ] Credit limits enforced
- [ ] Cash register reconciliation works
- [ ] Cash flow calculations correct

### Phase 3 Testing:
- [ ] GST calculations accurate
- [ ] GST return data correct
- [ ] All reports generate correctly
- [ ] Comparative reports show trends

---

## 📈 Success Metrics

### After Phase 1:
- ✅ Can track all supplier payments
- ✅ Can record all expenses
- ✅ Can generate P&L and Balance Sheet
- ✅ Complete financial visibility

### After Phase 2:
- ✅ Can offer credit to customers
- ✅ Can track customer payments
- ✅ Can manage cash register
- ✅ Better cash flow management

### After Phase 3:
- ✅ GST compliance ready
- ✅ Comprehensive financial reports
- ✅ Complete accounting system

---

## 🚀 Quick Start (Minimum Viable Accounting)

If you need something quick to show your client, implement:

1. **Expense Model** - Record expenses (2-3 days)
2. **Supplier Payment Model** - Track supplier payments (2-3 days)
3. **Basic P&L Report** - Calculate profit including expenses (1-2 days)
4. **Outstanding Balances** - Show what you owe suppliers (1 day)

**Total: ~1 week** for basic accounting functionality

This gives you:
- ✅ Expense tracking
- ✅ Supplier payment tracking
- ✅ True profit calculation (Revenue - COGS - Expenses)
- ✅ Outstanding supplier balances

---

## 💡 Key Implementation Tips

1. **Start with General Ledger** - Everything else builds on this
2. **Auto-create Journal Entries** - Don't make users manually enter everything
3. **Use Double-Entry** - Ensures accuracy and completeness
4. **Link Everything** - Connect sales, purchases, expenses to accounting
5. **Real-time Updates** - Update financial statements as transactions occur
6. **Audit Trail** - Keep complete history of all accounting entries
7. **User Permissions** - Restrict accounting features to authorized users

---

## 📚 Learning Resources

- Double-entry bookkeeping basics
- Chart of accounts structure
- Financial statement preparation
- GST compliance for retail
- Cash flow management

---

**Next Step:** Review this roadmap, prioritize features based on your business needs, and start with Phase 1 implementation.

