# Accounting Phase 1 Implementation - General Ledger System

## ✅ What We've Built

### 1. **Account Model** (`backend/models/Account.js`)
- Chart of Accounts structure
- Account types: Asset, Liability, Equity, Revenue, Expense
- Account codes (4-6 digits)
- Default accounts initialization
- Account hierarchy support (parent accounts)

### 2. **JournalEntry Model** (`backend/models/JournalEntry.js`)
- Double-entry bookkeeping
- Journal entry lines (debit/credit)
- Automatic entry number generation (JEyymmddNNNN)
- Reference tracking (links to sales, purchases, etc.)
- Entry reversal support
- Account balance calculation

### 3. **AccountingService** (`backend/services/accountingService.js`)
- Account management
- Journal entry creation
- Automatic journal entries for:
  - **Sales** (when Bill is created)
  - **Purchases** (when PO is received)
- Account balance calculation
- Trial balance generation

### 4. **Accounting Routes** (`backend/routes/accountingRoutes.js`)
- Initialize default accounts
- List/view accounts
- Get account balances
- Create/view journal entries
- Get trial balance
- Get account balances summary

### 5. **Integration**
- ✅ Sales automatically create journal entries
- ✅ Purchases automatically create journal entries

---

## 🎯 How It Works

### Double-Entry Bookkeeping

Every transaction affects at least 2 accounts:

**Example: Sale Transaction**
```
When a customer buys ₹500 worth of products:
- Debit: Cash ₹500 (money coming in)
- Credit: Sales Revenue ₹500 (revenue earned)
- Debit: COGS ₹400 (cost of products sold)
- Credit: Inventory ₹400 (inventory going out)
```

**Example: Purchase Transaction**
```
When you receive stock worth ₹1000:
- Debit: Inventory ₹1000 (inventory coming in)
- Credit: Accounts Payable ₹1000 (money you owe)
```

### Account Types & Normal Balances

| Account Type | Normal Balance | Increases With | Decreases With |
|-------------|----------------|----------------|----------------|
| Asset | Debit | Debit | Credit |
| Liability | Credit | Credit | Debit |
| Equity | Credit | Credit | Debit |
| Revenue | Credit | Credit | Debit |
| Expense | Debit | Debit | Credit |

---

## 📋 Default Chart of Accounts

### Assets (1000-1999)
- `1000` - Cash
- `1100` - Inventory
- `1200` - Accounts Receivable
- `1300` - Fixed Assets

### Liabilities (2000-2999)
- `2000` - Accounts Payable
- `2100` - Short-term Loans

### Equity (3000-3999)
- `3000` - Capital
- `3100` - Retained Earnings

### Revenue (4000-4999)
- `4000` - Sales Revenue
- `4100` - Other Income

### Expenses (5000-5999)
- `5000` - Cost of Goods Sold (COGS)
- `5100` - Rent
- `5200` - Salaries
- `5300` - Utilities
- `5400` - Marketing
- `5500` - Maintenance
- `5600` - Other Expenses

---

## 🚀 Getting Started

### Step 1: Initialize Default Accounts

**API Call:**
```bash
POST /api/v1/accounting/initialize
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Initialized 15 default accounts",
  "data": { "accountsCreated": 15 }
}
```

**Note:** Only needs to be done once. Safe to call multiple times (won't create duplicates).

---

### Step 2: View Chart of Accounts

**API Call:**
```bash
GET /api/v1/accounting/accounts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "...",
      "code": "1000",
      "name": "Cash",
      "type": "asset",
      "isActive": true
    },
    ...
  ]
}
```

---

### Step 3: Check Account Balance

**API Call:**
```bash
GET /api/v1/accounting/accounts/1000/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "code": "1000",
      "name": "Cash",
      "type": "asset"
    },
    "balance": 50000,
    "asOfDate": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Step 4: View Journal Entries

**API Call:**
```bash
GET /api/v1/accounting/journal-entries?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 10,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "...",
      "entryNumber": "JE2401150001",
      "date": "2024-01-15T10:00:00.000Z",
      "description": "Sale transaction - Bill BILL001",
      "entries": [
        {
          "account": {
            "code": "1000",
            "name": "Cash",
            "type": "asset"
          },
          "debit": 500,
          "credit": 0,
          "description": "Sale - BILL001"
        },
        {
          "account": {
            "code": "4000",
            "name": "Sales Revenue",
            "type": "revenue"
          },
          "debit": 0,
          "credit": 500,
          "description": "Sales Revenue - BILL001"
        }
      ],
      "referenceType": "sale",
      "referenceId": "...",
      "referenceNumber": "BILL001"
    }
  ]
}
```

---

### Step 5: Get Trial Balance

**API Call:**
```bash
GET /api/v1/accounting/trial-balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "asOfDate": "2024-01-15T10:30:00.000Z",
    "accounts": [
      {
        "account": {
          "code": "1000",
          "name": "Cash",
          "type": "asset"
        },
        "debitBalance": 50000,
        "creditBalance": 0
      },
      {
        "account": {
          "code": "4000",
          "name": "Sales Revenue",
          "type": "revenue"
        },
        "debitBalance": 0,
        "creditBalance": 100000
      }
    ],
    "totals": {
      "totalDebits": 150000,
      "totalCredits": 150000,
      "difference": 0
    }
  }
}
```

**Note:** Total debits should always equal total credits (balanced).

---

## 🔄 Automatic Journal Entry Creation

### When a Sale Happens

**Flow:**
1. Customer buys products
2. Bill is created (`POST /api/v1/inventory/sales`)
3. **Automatically creates journal entry:**
   - Debit: Cash (or Accounts Receivable if credit)
   - Credit: Sales Revenue
   - Debit: COGS
   - Credit: Inventory

**Example:**
```
Sale: ₹500, Cost: ₹400
Journal Entry Created:
- Debit Cash: ₹500
- Credit Sales Revenue: ₹500
- Debit COGS: ₹400
- Credit Inventory: ₹400
```

---

### When a Purchase is Received

**Flow:**
1. Purchase Order is received (`PATCH /api/v1/purchase-orders/:id/receive`)
2. Batches are created
3. **Automatically creates journal entry:**
   - Debit: Inventory
   - Credit: Accounts Payable

**Example:**
```
Purchase: ₹1000
Journal Entry Created:
- Debit Inventory: ₹1000
- Credit Accounts Payable: ₹1000
```

---

## 📊 Account Balance Calculation

Account balance is calculated from all journal entries:

**Formula:**
- For Assets/Expenses: Balance = Sum of Debits - Sum of Credits
- For Liabilities/Equity/Revenue: Balance = Sum of Credits - Sum of Debits

**Example - Cash Account:**
```
Entry 1: Debit ₹500 (sale)
Entry 2: Credit ₹200 (expense)
Entry 3: Debit ₹1000 (another sale)

Balance = (500 + 1000) - 200 = ₹1300
```

---

## 🧪 Testing the System

### Test 1: Initialize Accounts
```bash
curl -X POST http://localhost:5000/api/v1/accounting/initialize \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Make a Sale
```bash
# This will automatically create a journal entry
curl -X POST http://localhost:5000/api/v1/inventory/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "saleItems": [...],
    "receiptData": {...}
  }'
```

### Test 3: Check Cash Balance
```bash
curl -X GET http://localhost:5000/api/v1/accounting/accounts/1000/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: View Journal Entries
```bash
curl -X GET http://localhost:5000/api/v1/accounting/journal-entries \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 5: Get Trial Balance
```bash
curl -X GET http://localhost:5000/api/v1/accounting/trial-balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Key Features

### 1. **Automatic Journal Entries**
- No manual entry needed for sales/purchases
- System automatically creates proper journal entries
- Links to source transaction (Bill, PO)

### 2. **Double-Entry Validation**
- System ensures debits = credits
- Prevents unbalanced entries
- Maintains accounting integrity

### 3. **Complete Audit Trail**
- Every transaction recorded
- Can trace any amount to source
- Reference links to original documents

### 4. **Real-time Balance Calculation**
- Account balances calculated on-demand
- Always up-to-date
- Can get balance as of any date

### 5. **Trial Balance**
- Verify all entries are balanced
- See all account balances at once
- Foundation for financial statements

---

## 📝 Next Steps (Phase 1 Remaining)

1. **Supplier Payment Model** - Track payments to suppliers
2. **Expense Model** - Record operational expenses
3. **Financial Statements** - Generate P&L and Balance Sheet

---

## 🐛 Troubleshooting

### Issue: "Account not found" error
**Solution:** Initialize default accounts first:
```bash
POST /api/v1/accounting/initialize
```

### Issue: Journal entry not created for sale
**Check:**
1. Are default accounts initialized?
2. Check server logs for accounting errors
3. Journal entry creation is non-blocking (won't fail the sale)

### Issue: Trial balance not balanced
**Check:**
1. All journal entries should have debits = credits
2. Check for manual entries that might be unbalanced
3. Verify account types are correct

---

## 📚 Understanding Double-Entry Bookkeeping

### Basic Rules:
1. **Every transaction affects at least 2 accounts**
2. **Total debits = Total credits** (always balanced)
3. **Assets + Expenses = Liabilities + Equity + Revenue**

### Example Transaction Flow:

**Sale: Customer pays ₹500 cash**
```
Assets (Cash) increases → Debit ₹500
Revenue (Sales) increases → Credit ₹500
```

**Purchase: Buy inventory for ₹1000 on credit**
```
Assets (Inventory) increases → Debit ₹1000
Liabilities (Accounts Payable) increases → Credit ₹1000
```

**Expense: Pay rent ₹2000 cash**
```
Expenses (Rent) increases → Debit ₹2000
Assets (Cash) decreases → Credit ₹2000
```

---

## ✅ What's Working Now

- ✅ Chart of Accounts
- ✅ Journal Entries
- ✅ Automatic entries for sales
- ✅ Automatic entries for purchases
- ✅ Account balance calculation
- ✅ Trial balance
- ✅ Complete audit trail

---

**Status:** Phase 1 - General Ledger System ✅ **COMPLETE**

Next: Accounts Payable, Expense Management, Financial Statements




