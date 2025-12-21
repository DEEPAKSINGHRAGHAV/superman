# Barcode System - Migration & Onboarding Guide

> **Version:** 1.0  
> **Last Updated:** December 2024

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Barcode Format](#barcode-format)
3. [New Installation (Fresh Database)](#new-installation-fresh-database)
4. [Data Migration (Existing Client Data)](#data-migration-existing-client-data)
5. [Onboarding Checklist](#onboarding-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Technical Reference](#technical-reference)

---

## Overview

The system uses **EAN-13 barcodes** with prefix `21` for internal products. Barcodes are auto-generated using an atomic counter system that ensures:

- ✅ **O(1) Performance** - Constant time generation regardless of product count
- ✅ **No Race Conditions** - Atomic MongoDB operations prevent duplicates
- ✅ **Transaction Safe** - All-or-nothing operations with proper rollback

### Key Components

| File | Purpose |
|------|---------|
| `backend/models/BarcodeCounter.js` | Atomic counter model |
| `backend/services/barcodeService.js` | Barcode generation service |
| `backend/scripts/syncBarcodeCounter.js` | Counter sync script for migrations |
| `backend/scripts/updateProductsWithoutBarcode.js` | Backfill script for products missing barcodes |

---

## Barcode Format

```
EAN-13 Structure: 21 + XXXXXXXXXX + C
                  ├─┤  ├─────────┤  ├─┤
                  │    │            │
                  │    │            └─ Check Digit (1 digit, auto-calculated)
                  │    └────────────── Sequence Number (10 digits, 0-padded)
                  └─────────────────── Prefix (fixed: 21 for internal products)
```

### Examples

| Sequence | Barcode |
|----------|---------|
| 1 | `2100000000018` |
| 42 | `2100000000428` |
| 100 | `2100000001007` |
| 999999 | `2100009999997` |

### Capacity

- **Maximum Sequence:** 9,999,999,999 (10 billion products)
- **Format:** Standard EAN-13 (scannable by any barcode reader)

---

## New Installation (Fresh Database)

### ✅ No Action Required

For a fresh database with no existing products:

1. **Counter Auto-Creation**: The barcode counter is automatically created on the first product creation via MongoDB's `upsert` operation.
2. **First Product**: Will receive sequence `1` → barcode `2100000000018`
3. **No Scripts Needed**: Everything works out of the box

### Verification Steps

After creating the first product, verify the counter was created:

```javascript
// In MongoDB shell or Compass
db.barcodecounters.find()
// Should show: { _id: 'barcode_sequence', sequence: 1 }
```

---

## Data Migration (Existing Client Data)

### When to Use Migration Scripts

Run migration scripts when:

- ☑️ Importing products from an existing client database
- ☑️ Products have existing EAN-13 barcodes with `21` prefix
- ☑️ You need to continue the barcode sequence from existing data
- ☑️ You see duplicate barcode errors after data import

### Migration Steps

#### Step 1: Import Client Data

Import your client data (products, etc.) using your preferred method (MongoDB import, API, etc.).

#### Step 2: Sync Barcode Counter

**Purpose**: Sets the counter to the highest existing barcode sequence so new products continue from there.

```bash
cd backend

# Preview changes (recommended first)
node scripts/syncBarcodeCounter.js --dry-run

# Execute sync
node scripts/syncBarcodeCounter.js
```

**Example Output:**

```
═══════════════════════════════════════════════════════════════════
        BARCODE COUNTER SYNC SCRIPT
═══════════════════════════════════════════════════════════════════
✅ Connected to MongoDB
🔄 Syncing barcode counter with existing barcodes...

📊 Current counter value: NOT SET (will be created)
📦 Found 500 products with "21" prefix barcodes

📈 Highest sequence found:
   Sequence: 499
   Barcode:  2100000004996
   Product:  Sample Product Name

✅ Counter synced to: 499

📋 Next product will get:
   Sequence: 500
   Barcode:  2100000005004

═══════════════════════════════════════════════════════════════════
   ✅ SYNC COMPLETE
═══════════════════════════════════════════════════════════════════
```

#### Step 3: Backfill Missing Barcodes (Optional)

**Purpose**: If some imported products don't have barcodes, generate them.

```bash
cd backend
node scripts/updateProductsWithoutBarcode.js
```

This script:
- Finds all products without barcodes (null, undefined, or empty)
- Generates unique barcodes for each
- Processes in batches for efficiency
- Is idempotent (safe to run multiple times)

---

## Onboarding Checklist

### For New Clients (Fresh Start)

- [ ] Deploy backend with MongoDB connection configured
- [ ] Verify MongoDB connection is working
- [ ] Create first product → Barcode auto-generated
- [ ] Verify barcode counter created in `barcodecounters` collection
- [ ] Test barcode scanning with mobile app (if applicable)

### For Migrated Clients

- [ ] Import client data to MongoDB
- [ ] Run `syncBarcodeCounter.js --dry-run` to preview
- [ ] Run `syncBarcodeCounter.js` to sync counter
- [ ] Verify counter value matches highest existing barcode
- [ ] (Optional) Run `updateProductsWithoutBarcode.js` if products are missing barcodes
- [ ] Create test product → Verify barcode continues sequence
- [ ] Test barcode scanning with mobile app (if applicable)

### MongoDB Requirements

- [ ] MongoDB version 4.0+ (for transaction support)
- [ ] **Replica Set Required** for transactions (production)
  - Development can use single-node replica set
  - See [Replica Set Setup](#replica-set-setup) below

---

## Troubleshooting

### Issue: Duplicate Barcode Error

**Error:** `E11000 duplicate key error - barcode: "21XXXXXXXXXX" already exists`

**Cause:** Counter is out of sync with existing barcodes.

**Solution:**
```bash
cd backend
node scripts/syncBarcodeCounter.js
```

### Issue: Products Without Barcodes

**Cause:** Products imported without barcode field, or barcode is null/empty.

**Solution:**
```bash
cd backend
node scripts/updateProductsWithoutBarcode.js
```

### Issue: Counter Not Found

**Cause:** Counter collection doesn't exist (normal for fresh database).

**Solution:** No action needed. Counter is auto-created on first product creation.

### Issue: Transaction Errors (Replica Set)

**Error:** `Transaction numbers are only allowed on a replica set member or mongos`

**Cause:** MongoDB is not running as a replica set.

**Solution for Development:**
```bash
# Start MongoDB with replica set
mongod --replSet rs0 --port 27017

# Initialize replica set (one time)
mongosh
rs.initiate()
```

**Solution for Production:**
- Ensure MongoDB Atlas or self-hosted cluster has replica set configured
- Verify with: `rs.status()` in MongoDB shell

---

## Technical Reference

### Barcode Counter Collection

```javascript
// Collection: barcodecounters
// Single document structure:
{
  _id: "barcode_sequence",    // Fixed identifier
  sequence: 123               // Current sequence number
}
```

### Barcode Service Methods

| Method | Description |
|--------|-------------|
| `generateEAN13(sequence)` | Generate EAN-13 from sequence number |
| `calculateCheckDigit(barcode12)` | Calculate check digit for 12-digit barcode |
| `getNextSequence(session)` | Atomically get next sequence number |
| `generateNextBarcode(session, excludeId, retries)` | Generate next available barcode |
| `validateEAN13(barcode)` | Validate barcode format and check digit |
| `barcodeExists(barcode, excludeId, session)` | Check if barcode exists in database |

### Product Barcode Behavior

#### On Product Creation:

| Request Barcode Field | Behavior |
|-----------------------|----------|
| Not provided | Auto-generate next barcode |
| Empty string (`""`) | Auto-generate next barcode |
| Valid barcode | Use provided barcode |

#### On Product Update:

| Request Barcode Field | Behavior |
|-----------------------|----------|
| Not provided | Auto-generate next barcode (replaces any existing) |
| Empty string (`""`) | Auto-generate next barcode |
| Valid barcode | Use provided barcode |

> **Note:** If barcode is not included in the update request, the system treats it as empty and generates a new barcode. To keep an existing barcode, explicitly include it in the request.

### Replica Set Setup

**Development (Single Node):**
```bash
# Start MongoDB with replica set
mongod --replSet rs0 --dbpath /data/db --port 27017

# In mongo shell
mongosh
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "localhost:27017" }]
})
```

**Verify Replica Set:**
```javascript
rs.status()
// Should show: "stateStr": "PRIMARY"
```

---

## Quick Reference Commands

```bash
# Sync barcode counter (after data import)
cd backend && node scripts/syncBarcodeCounter.js

# Dry run (preview only)
cd backend && node scripts/syncBarcodeCounter.js --dry-run

# Backfill products without barcodes
cd backend && node scripts/updateProductsWithoutBarcode.js

# Check current counter (MongoDB shell)
db.barcodecounters.findOne({ _id: "barcode_sequence" })

# Count products with "21" prefix barcodes
db.products.countDocuments({ barcode: /^21/ })

# Count products without barcodes
db.products.countDocuments({ 
  $or: [
    { barcode: { $exists: false } },
    { barcode: null },
    { barcode: "" }
  ]
})
```

---

## Summary

| Scenario | Action |
|----------|--------|
| **Fresh installation** | No action needed - automatic |
| **Data migration with existing barcodes** | Run `syncBarcodeCounter.js` after import |
| **Products missing barcodes** | Run `updateProductsWithoutBarcode.js` |
| **Duplicate barcode errors** | Run `syncBarcodeCounter.js` |

---

**Questions?** Check the existing documentation files:
- `BARCODE_COUNTER_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `BARCODE_COUNTER_SYNC_INSTRUCTIONS.md` - Sync script details
- `BARCODE_SYSTEM_IMPLEMENTATION.md` - Full system documentation


