# ⚡ Shivik Mart - Quick Reference Guide

## 🚀 Quick Start

### Starting the System

**Backend:**
```bash
cd backend
npm start
# Server runs on: http://localhost:8001
```

**Mobile App:**
```bash
cd mobile
npm start
# Then: npm run android  OR  npm run ios
```

---

## 📱 Common User Tasks

### 1️⃣ **Check Product Stock & Prices**

**Method 1: Scan Barcode (Fastest)**
```
1. Dashboard → Tap "Scan Barcode" button
2. Point camera at barcode
3. Modal appears showing:
   - All batches for that product
   - Each batch's price
   - Quantities available
   - Which batch sells first
```

**Method 2: Search Product**
```
1. Products tab
2. Search by name or SKU
3. Tap product
4. Scroll to "Batch Tracking" section
5. See all batches with prices
```

**What You See:**
```
┌─────────────────────────────────────┐
│ Coca Cola 500ml                     │
│ Barcode: ABC123                     │
├─────────────────────────────────────┤
│ Total Stock: 250 units              │
│ Batches: 2                          │
│ Price Range: ₹25 - ₹28             │
├─────────────────────────────────────┤
│ BATCH2410070001 (Oldest) ⚡        │
│ 100 units @ ₹25 | Cost: ₹20        │
│ Margin: 20% | Sells First!         │
├─────────────────────────────────────┤
│ BATCH2410170001 (Newer)            │
│ 150 units @ ₹28 | Cost: ₹22        │
│ Margin: 21.4% | Sells Second       │
└─────────────────────────────────────┘
```

---

### 2️⃣ **Add New Product**

```
1. Products tab → Tap "+" button
2. Fill in:
   ✓ Name: "Maggi Noodles"
   ✓ Category: Select from dropdown
   ✓ Brand: (optional)
   ✓ MRP: ₹12
   ✓ Unit: "pcs"
   ✓ Min Stock Level: 50
   ✓ Barcode: Scan or enter manually
3. Tap "Save"
```

**Note:** 
- SKU auto-generated (PRD001, PRD002...)
- Stock is 0 until you receive a purchase order
- Cost/Selling prices set by first batch

---

### 3️⃣ **Order Stock from Supplier**

```
STEP 1: Create Supplier (if new)
  Suppliers → "+" → Fill details → Save

STEP 2: Create Purchase Order
  Dashboard → "Create Order" →
  1. Select Supplier
  2. Add Items:
     - Search product
     - Enter quantity: 100
     - Enter cost price: ₹20
     - Enter selling price: ₹25
     - (Optional: Expiry date)
  3. Review total
  4. Tap "Create Order"

STEP 3: Approve (if you're admin/manager)
  Purchase Orders → Find your PO →
  Tap "Approve"

STEP 4: Receive Stock (when it arrives)
  Purchase Orders → Find your PO →
  Tap "Mark as Received"
  
  ⚡ THIS CREATES BATCHES AUTOMATICALLY!
```

**What Happens:**
```
✅ New batch created with your pricing
✅ Product stock updated (+100)
✅ Stock movement recorded
✅ Ready to sell!
```

---

### 4️⃣ **View Profit Report**

```
Dashboard → Tap "Inventory Valuation"

You'll see:
  📊 Total inventory value (cost)
  💰 Potential revenue (if all sold)
  📈 Total profit
  📉 Margin percentage
  
  + List of all products with:
    - How many batches
    - Total value
    - Profit per product
```

---

### 5️⃣ **Check Low Stock Items**

```
Dashboard → Low Stock card shows count

OR

Products tab → Filter: "Low Stock"
```

Shows products where:
```
currentStock ≤ minStockLevel
```

---

### 6️⃣ **View Stock History**

```
Inventory Tracking tab →
See all movements:
  • Purchases (green)
  • Sales (red)
  • Adjustments (blue)
  • Damage/Expiry (orange)
  
Each movement shows:
  - Product name
  - Quantity change
  - Batch number
  - Date & time
  - User who made change
  - Reason
```

---

### 7️⃣ **Check Expiring Products**

```
API: GET /api/v1/batches/expiring?days=30

Shows batches expiring in next 30 days
Sorted by expiry date (urgent first)
```

**Color Codes:**
- 🔴 Red: < 7 days (URGENT!)
- 🟠 Orange: 7-30 days (Warning)
- 🟢 Green: > 30 days (OK)

---

## 🎯 Understanding Your Data

### Product States

| Stock Status | Meaning | Action |
|--------------|---------|--------|
| Available | Stock > 0 and Active | Can sell |
| Low Stock | Stock ≤ Min Level | Reorder soon |
| Out of Stock | Stock = 0 | Order now |
| Inactive | isActive = false | Not for sale |

### Batch Statuses

| Status | Meaning | Shows in Lists? |
|--------|---------|----------------|
| Active | Has stock, can sell | ✅ Yes |
| Depleted | All sold (quantity = 0) | ❌ No |
| Expired | Past expiry date | ❌ No |
| Damaged | Marked as damaged | ❌ No |
| Returned | Returned to supplier | ❌ No |

### Purchase Order Workflow

```
pending → approved → ordered → received → (creates batches)
   ↓
cancelled (if rejected)
```

---

## 🔍 Important API Endpoints

### Products
```
GET    /api/v1/products              - List all products
GET    /api/v1/products/:id          - Get product details
POST   /api/v1/products              - Create product
PUT    /api/v1/products/:id          - Update product
DELETE /api/v1/products/:id          - Delete product (soft)
GET    /api/v1/products/search?q=... - Search products
```

### Batches ⭐ (KEY FEATURE)
```
GET  /api/v1/batches                      - List all batches
GET  /api/v1/batches/product/:id          - Get batches by product ID/barcode ⭐
GET  /api/v1/batches/expiring?days=30     - Expiring batches
GET  /api/v1/batches/valuation            - Inventory valuation report ⭐
POST /api/v1/batches                      - Create batch manually
POST /api/v1/batches/sale                 - Process FIFO sale ⭐
```

### Purchase Orders
```
GET   /api/v1/purchase-orders              - List POs
GET   /api/v1/purchase-orders/:id          - Get PO details
POST  /api/v1/purchase-orders              - Create PO
PUT   /api/v1/purchase-orders/:id/approve  - Approve PO
PUT   /api/v1/purchase-orders/:id/receive  - Receive stock (creates batches)
```

### Inventory
```
GET  /api/v1/inventory/movements          - Stock movements
POST /api/v1/inventory/adjust             - Manual stock adjustment
GET  /api/v1/inventory/summary            - Inventory summary
```

---

## 💡 Pro Tips

### Tip 1: Batch Tracking Best Practices
```
✅ Always create batches via Purchase Orders (automatic)
✅ Don't manually edit batch quantities (use adjustments)
✅ Check expiring batches weekly
✅ Review valuation report monthly
```

### Tip 2: Pricing Strategy
```
When prices change:
  ❌ DON'T update existing batch prices
  ✅ DO create new purchase order with new prices
  
  Result: System maintains price history automatically!
```

### Tip 3: FIFO Understanding
```
You don't need to:
  • Track which batch to sell
  • Calculate weighted average costs
  • Manually update profit margins
  
System does it automatically when processing sales!
```

### Tip 4: Stock Accuracy
```
Always use the system for:
  ✓ Receiving stock (PO → Receive)
  ✓ Recording sales (API)
  ✓ Adjustments (with reason)
  
This maintains accurate:
  • Stock levels
  • Audit trail
  • Profit calculations
```

---

## 🆘 Troubleshooting

### Problem: "Cannot see batches after receiving PO"

**Check:**
1. Did you mark PO as "received"? (not just "approved")
2. Is the PO status = 'received'?
3. Check browser console for errors
4. Try refreshing product details screen

**Solution:**
```
GET /api/v1/batches/product/{productId}

If empty, batches weren't created.
Check backend logs for errors.
```

---

### Problem: "Wrong stock count"

**Check:**
1. View stock movements for that product
2. Look for adjustments or corrections
3. Sum all movements manually

**Fix:**
```
Use stock adjustment:
POST /api/v1/inventory/adjust
{
  productId: "...",
  quantity: +10,  // or -10 to reduce
  reason: "Physical count correction"
}
```

---

### Problem: "Profit calculations seem wrong"

**Remember:**
- Profit is calculated from **actual batches used** in FIFO order
- NOT from product's default cost price
- View batch sale response for breakdown

**Example:**
```
Sale: 50 units
Product default cost: ₹22 (latest batch)

BUT system might use:
  30 units from old batch @ ₹20
  20 units from new batch @ ₹22
  
Average cost: (30×20 + 20×22) / 50 = ₹20.80
NOT ₹22!

This is MORE ACCURATE! ✅
```

---

### Problem: "Can't scan barcode"

**Check:**
1. Camera permissions granted?
2. Good lighting?
3. Barcode in focus?
4. Barcode exists in system?

**Alternative:**
```
Use manual barcode entry:
  Scanner screen → "Enter Manually" button
  Type barcode number → Search
```

---

## 📊 Understanding Reports

### Inventory Valuation Report

**What it shows:**
```json
{
  "summary": {
    "totalProducts": 50,        // How many products have stock
    "totalBatches": 127,         // Total active batches
    "totalQuantity": 15420,      // Total units in stock
    "totalCostValue": 308400,    // What you paid (investment)
    "totalSellingValue": 385250, // What you'll get if all sold
    "totalPotentialProfit": 76850 // Profit if all sold
  }
}
```

**How to use:**
- Monitor total investment (cost value)
- Track potential returns (selling value)
- Identify high-value products (top of list)
- Make reorder decisions

---

### Stock Movement Report

**Movement Types:**

| Type | Meaning | Quantity |
|------|---------|----------|
| purchase | Stock received | Positive (+) |
| sale | Stock sold | Negative (-) |
| adjustment | Manual correction | +/- |
| damage | Damaged goods | Negative (-) |
| expired | Expired products | Negative (-) |
| return | Returned to supplier | Negative (-) |

**Each movement shows:**
- Product & batch
- Quantity change
- Stock before/after
- Unit cost
- Total cost
- User who made it
- Date & time
- Reason

---

## 🎓 Training New Users

### For Employees (Basic Users)

**They can:**
- ✅ View products
- ✅ Search products
- ✅ Scan barcodes
- ✅ View stock levels
- ✅ View purchase orders

**They cannot:**
- ❌ Create/edit products
- ❌ Approve purchase orders
- ❌ Adjust stock
- ❌ Delete anything

**Train them on:**
1. How to check stock (scanning)
2. How to view product details
3. Understanding batch information
4. Reading stock status indicators

---

### For Managers

**They can:**
- ✅ All employee permissions
- ✅ Create/edit products
- ✅ Create/edit suppliers
- ✅ Create purchase orders
- ✅ **Approve purchase orders** ⭐
- ✅ Receive stock
- ✅ Adjust stock
- ✅ View all reports

**Train them on:**
1. Complete PO workflow
2. Stock receiving process
3. How batches are created
4. FIFO concept
5. Profit reports
6. Stock adjustments
7. Expiry management

---

### For Admins

**Full access plus:**
- ✅ User management
- ✅ Brand/category management
- ✅ System settings
- ✅ Delete operations

**Train them on:**
1. User role assignment
2. Permission management
3. Data maintenance
4. System configuration

---

## 📝 Daily Checklist

### Opening (Morning)
```
□ Login to system
□ Check low stock alerts
□ Review pending purchase orders
□ Check products expiring soon (< 7 days)
```

### During Day
```
□ Scan products when checking stock
□ Create POs for low stock items
□ Receive deliveries and mark POs as received
□ Process any stock adjustments with reasons
```

### Closing (Evening)
```
□ Verify all POs received today are marked correctly
□ Check for any stock discrepancies
□ Review stock movements for the day
□ Plan tomorrow's orders
```

### Weekly
```
□ Review inventory valuation report
□ Check expiring products (next 30 days)
□ Analyze slow-moving stock
□ Plan promotions for expiring items
```

### Monthly
```
□ Full inventory valuation review
□ Profit margin analysis
□ Supplier performance review
□ Stock accuracy audit
□ System backup verification
```

---

## 🔑 Key Metrics to Monitor

### Daily
- Low stock count (reorder now)
- Out of stock count (lost sales)
- Pending POs (waiting approval)

### Weekly
- Items expiring < 7 days (urgent action)
- Total inventory value (your investment)
- New stock received (batches created)

### Monthly
- Total profit potential (valuation report)
- Average profit margin
- Inventory turnover
- Supplier performance

---

## 🎯 Success Indicators

**Your system is working well if:**

✅ Stock levels are accurate (match physical count)  
✅ Low stock alerts prevent stock-outs  
✅ FIFO ensures older stock sells first  
✅ Profit calculations are precise  
✅ No expired products being sold  
✅ Complete audit trail (who did what when)  
✅ Quick barcode scanning for instant info  
✅ Clear price history per product  
✅ Automated batch creation (no manual tracking)  

---

**Remember: The system is designed to work FOR you, not against you. Let it handle the complex tracking automatically!** 🚀
