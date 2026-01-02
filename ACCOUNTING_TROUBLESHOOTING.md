# Accounting Troubleshooting Guide

## Issue: Journal Entries Not Created

### Problem
You created a sale from billing section, but can't see the entry in `journalentries` collection.

### Solution

#### Step 1: Initialize Default Accounts

**Option A: Using API (Recommended)**
```bash
POST /api/v1/accounting/initialize
Authorization: Bearer YOUR_TOKEN
```

**Option B: Using cURL**
```bash
curl -X POST http://localhost:5000/api/v1/accounting/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Initialized 15 default accounts",
  "data": { "accountsCreated": 15 }
}
```

#### Step 2: Verify Accounts Exist

```bash
GET /api/v1/accounting/accounts
```

You should see accounts with codes: 1000, 1100, 2000, 4000, 5000, etc.

#### Step 3: Check Server Logs

When you create a sale, you should see in server console:
```
✅ Journal entry created for sale: JE2401150001
```

If you see an error instead:
```
❌ Failed to create accounting entry for sale: Account with code 1000 not found...
```

This means accounts weren't initialized.

---

## Common Issues

### Issue 1: "Account with code 1000 not found"

**Cause:** Default accounts not initialized

**Solution:**
1. Call `POST /api/v1/accounting/initialize`
2. Verify with `GET /api/v1/accounting/accounts`
3. Try creating a sale again

### Issue 2: Journal Entry Created But Not Visible

**Check:**
1. Are you querying the correct collection? (`journalentries`)
2. Check the `status` field - should be `'posted'`
3. Check the `date` field - might be filtering by date

**Query Example:**
```javascript
// MongoDB query
db.journalentries.find({ status: 'posted' }).sort({ date: -1 })

// Or via API
GET /api/v1/accounting/journal-entries
```

### Issue 3: Error in Console But Sale Still Works

**This is expected behavior!**

The system is designed so that:
- ✅ Sales/purchases work even if accounting fails
- ⚠️ Accounting errors are logged but don't break the sale
- 📝 Check server logs for error details

**To fix:**
1. Check the error message in server logs
2. Usually means accounts not initialized
3. Initialize accounts and try again

---

## Verification Steps

### 1. Check if Accounts Exist

**API:**
```bash
GET /api/v1/accounting/accounts
```

**MongoDB:**
```javascript
db.accounts.countDocuments({ isActive: true })
// Should return 15 (or more if you added custom accounts)
```

### 2. Check if Journal Entries Are Created

**API:**
```bash
GET /api/v1/accounting/journal-entries?referenceType=sale
```

**MongoDB:**
```javascript
db.journalentries.find({ referenceType: 'sale' }).sort({ date: -1 })
```

### 3. Check Account Balances

**API:**
```bash
GET /api/v1/accounting/accounts/1000/balance  # Cash
GET /api/v1/accounting/accounts/4000/balance  # Sales Revenue
```

---

## Auto-Initialization Feature

**NEW:** The system now automatically initializes accounts if they don't exist when:
- A sale is created
- A purchase is received

**How it works:**
1. System checks if accounts exist
2. If not, automatically creates default accounts
3. Then creates the journal entry
4. Logs: `Accounts not initialized. Initializing default accounts...`

**Note:** It's still better to initialize manually first to avoid any delays.

---

## Testing the Fix

### Test 1: Initialize Accounts
```bash
POST /api/v1/accounting/initialize
```

### Test 2: Create a Sale
1. Go to billing section
2. Create a sale
3. Check server logs for: `✅ Journal entry created for sale: JE...`

### Test 3: Verify Journal Entry
```bash
GET /api/v1/accounting/journal-entries
```

You should see the entry with:
- `referenceType: 'sale'`
- `referenceId: <bill_id>`
- `referenceNumber: <bill_number>`
- `status: 'posted'`

---

## Still Not Working?

### Check These:

1. **Server Logs**
   - Look for error messages
   - Check for "Account not found" errors
   - Check for database connection errors

2. **Database Connection**
   - Is MongoDB running?
   - Can you connect to the database?
   - Check `config.env` for `MONGODB_URI`

3. **Permissions**
   - Does the user have permission to create journal entries?
   - Check user role and permissions

4. **Model Import**
   - Are Account and JournalEntry models loaded?
   - Check if there are any import errors

---

## Quick Diagnostic Script

Run this to check everything:

```javascript
// In MongoDB shell or Node.js
const Account = require('./models/Account');
const JournalEntry = require('./models/JournalEntry');

async function diagnose() {
  // Check accounts
  const accountCount = await Account.countDocuments({ isActive: true });
  console.log(`Accounts: ${accountCount} (should be 15+)`);
  
  // Check journal entries
  const entryCount = await JournalEntry.countDocuments({ status: 'posted' });
  console.log(`Journal Entries: ${entryCount}`);
  
  // Check recent entries
  const recent = await JournalEntry.find({ status: 'posted' })
    .sort({ date: -1 })
    .limit(5);
  console.log('Recent entries:', recent.map(e => e.entryNumber));
}

diagnose();
```

---

## Summary

**Most Common Issue:** Accounts not initialized

**Quick Fix:**
```bash
POST /api/v1/accounting/initialize
```

**Then:** Create a sale and check journal entries again.

**Expected Result:**
- ✅ Journal entry created
- ✅ Visible in `journalentries` collection
- ✅ Linked to the bill via `referenceId`




