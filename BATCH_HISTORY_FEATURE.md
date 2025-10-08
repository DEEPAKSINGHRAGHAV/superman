# Batch History Feature - View Depleted & Historical Batches

## Problem Solved
When a batch's quantity reaches 0 (depleted), it disappears from the product detail page because only **active batches** are shown. Users needed a way to view:
- ✅ Depleted batches
- ✅ Expired batches  
- ✅ Damaged batches
- ✅ Historical batch records
- ✅ Complete batch lifecycle

## Solution: Batch History Screen

### 📍 Where to Find Batch History

#### **Option 1: From Product Detail Page**
1. Navigate to any product
2. Scroll to "Active Batches" section
3. Click **"View All Batches (Including History)"** button at the bottom
4. See all batches for that specific product (active + historical)

#### **Option 2: View All Batches (Coming Soon)**
- Dashboard quick link to batch history
- Or navigate directly via app menu

---

## Features

### 🔍 Filter by Status
Choose what batches to view:
- **All** - Everything
- **Active** - Currently available batches
- **Depleted** - Batches with 0 quantity
- **Expired** - Batches past expiry date
- **Damaged** - Batches marked as damaged

### 📊 Batch Information Displayed

Each batch card shows:

#### **Header**
```
BATCH241008001          [Active/Depleted/Expired/Damaged]
```

#### **Product Info** (if viewing all products)
```
📦 Coca Cola 500ml  →
```

#### **Quantity Details**
```
Initial Qty: 100    Current Qty: 0    Available: 0
```

#### **Pricing**
```
Cost Price: ₹20.00    Selling Price: ₹25.00    Profit: 20%
```

#### **Dates**
```
📅 Purchased: 08 Oct 2024
⏰ Expires: 31 Dec 2025 (450 days)
```

#### **Additional Info**
```
🏢 ABC Traders    📄 PO-2024-001
```

#### **Value** (for active batches)
```
Current Value: ₹2,000.00
```

---

## How Batches Become "Depleted"

### Scenario: Complete Batch Sale

**Initial State:**
```
Product: Coca Cola 500ml
BATCH241008001: 10 units @ ₹25
Status: active
```

**User sells all 10 units:**
1. Sale processes via FIFO
2. Batch quantity: 10 → 0
3. Batch status: active → **depleted**
4. Product stock updated: -10 units

**Final State:**
```
Product: Coca Cola 500ml
BATCH241008001: 0 units
Status: depleted ❌
```

**Visibility:**
- ❌ No longer in "Active Batches" on product page
- ✅ **Still visible in "Batch History" screen**

---

## API Support

### Backend Endpoint Already Supports Status Filtering

```bash
GET /api/v1/batches?status=depleted&product={productId}
```

**Query Parameters:**
- `status` - active, depleted, expired, damaged, returned
- `product` - Filter by product ID
- `page` - Pagination
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "...",
      "batchNumber": "BATCH241008001",
      "status": "depleted",
      "currentQuantity": 0,
      "initialQuantity": 10,
      "costPrice": 20,
      "sellingPrice": 25,
      "product": {
        "name": "Coca Cola 500ml",
        "sku": "COKE-500ML"
      },
      "purchaseDate": "2024-10-08",
      "expiryDate": "2025-12-31"
    }
  ]
}
```

---

## User Flows

### Flow 1: View Product Batch History

```
Product Detail Screen
         │
         ▼
[View All Batches (Including History)] ← Click
         │
         ▼
Batch History Screen
(Shows all batches for this product)
         │
         ▼
Filter: All | Active | Depleted | Expired | Damaged
         │
         ▼
View complete history with all details
```

### Flow 2: Investigate Why Product Out of Stock

```
User: "I had stock yesterday, where did it go?"
         │
         ▼
Product Detail → Current Stock: 0
         │
         ▼
Click "View All Batches (Including History)"
         │
         ▼
Filter: Depleted
         │
         ▼
See: BATCH241008001 - Depleted yesterday
      Initial: 100, Current: 0
      Last movement: Sale
```

### Flow 3: Track Price History

```
Product Detail → View Batch History
         │
         ▼
Filter: All (showing oldest to newest)
         │
         ▼
BATCH241001001 (Oct 1):  Cost ₹20, Sell ₹25 [Depleted]
BATCH241010001 (Oct 10): Cost ₹22, Sell ₹28 [Depleted]
BATCH241020001 (Oct 20): Cost ₹24, Sell ₹30 [Active]
         │
         ▼
User can see price increase trend over time
```

---

## Visual Design

### Batch Status Badges

**Active** (Green)
```
[✓ Active]  - Green background, white text
```

**Depleted** (Gray)
```
[○ Depleted] - Gray background, dark text
```

**Expired** (Red)
```
[⚠ Expired] - Red background, white text
```

**Damaged** (Orange)
```
[❌ Damaged] - Orange background, white text
```

**Returned** (Blue)
```
[↩ Returned] - Blue background, white text
```

---

## Implementation Details

### Files Created/Modified

#### ✅ **New Screen Created**
- `mobile/src/screens/BatchHistoryScreen.tsx`
  - Full batch history with filtering
  - Pagination support
  - Pull to refresh
  - Product navigation

#### ✅ **Updated Navigation**
- `mobile/src/navigation/AppNavigator.tsx`
  - Added BatchHistory screen
  - Route: `BatchHistory`
  - Params: `{ productId?: string }`

#### ✅ **Updated Constants**
- `mobile/src/constants/index.ts`
  - Added `BATCH_HISTORY: 'BatchHistory'`

#### ✅ **Updated Types**
- `mobile/src/types/index.ts`
  - Added to `RootStackParamList`
  - Type: `BatchHistory: { productId?: string }`

#### ✅ **Updated Product Detail**
- `mobile/src/screens/ProductDetailScreen.tsx`
  - Changed "Batch Tracking" to "Active Batches"
  - Added "View All Batches (Including History)" button
  - Navigates to BatchHistory with productId

---

## Usage Examples

### Example 1: View All Depleted Batches for a Product

```typescript
// User Flow
1. Open Product Detail (Coca Cola 500ml)
2. Tap "View All Batches (Including History)"
3. Tap "Depleted" filter chip
4. See all depleted batches:
   - BATCH241001001: 0/100 units
   - BATCH241005001: 0/50 units
   - BATCH241015001: 0/200 units
```

### Example 2: Check When Batch Was Depleted

```typescript
// Batch Card Shows:
BATCH241008001          [○ Depleted]
─────────────────────────────────────
Initial Qty: 100    Current Qty: 0
Cost: ₹20.00       Selling: ₹25.00
📅 Purchased: 08 Oct 2024
⏰ Expires: 31 Dec 2025
🏢 ABC Traders    📄 PO-2024-001
```

### Example 3: Track Price Changes Over Time

```typescript
// Filter: All (chronological)

BATCH241001001 [Depleted]
├─ Oct 1: Cost ₹20, Sell ₹25
├─ 100 units sold

BATCH241010001 [Depleted]  
├─ Oct 10: Cost ₹22, Sell ₹28 (↑ Price increase!)
├─ 150 units sold

BATCH241020001 [Active]
├─ Oct 20: Cost ₹24, Sell ₹30 (↑ Another increase)
├─ 200 units available

Insight: 20% price increase in 20 days
```

---

## Benefits

### ✅ **Complete Audit Trail**
- See every batch ever created
- Track when batches were depleted
- Historical pricing data

### ✅ **Better Inventory Management**
- Understand stock movements
- Identify patterns
- Track expiry trends

### ✅ **Transparency**
- Nothing is hidden
- Full batch lifecycle visible
- Easy troubleshooting

### ✅ **Business Insights**
- Price history analysis
- Supplier comparison
- Turnover rates

---

## Future Enhancements

### 1. **Restore Depleted Batch**
Allow adjustment to bring back depleted batch
```typescript
// Admin action
Adjust BATCH241008001: +10 units
Status: depleted → active
```

### 2. **Batch Performance Metrics**
```typescript
- Time to depletion
- Profit per batch
- Turnover rate
- Wastage tracking
```

### 3. **Export Batch History**
```typescript
Export to CSV/PDF:
- Date range selection
- Filter by status
- Include movements
```

### 4. **Batch Comparison**
```typescript
Compare batches side by side:
- Price differences
- Supplier comparison
- Profit margins
```

---

## Testing Checklist

- [x] Create product with batch
- [x] Sell all batch quantity
- [x] Verify batch becomes depleted
- [x] Open product detail page
- [x] Confirm depleted batch NOT in "Active Batches"
- [x] Click "View All Batches (Including History)"
- [x] Verify depleted batch appears in history
- [x] Test filter: All, Active, Depleted
- [x] Test pagination (20+ batches)
- [x] Test pull to refresh
- [x] Test product navigation
- [x] Test with no batches
- [x] Test with mixed status batches

---

## Quick Reference

### Where Are Batches?

| Batch Status | Product Detail ("Active Batches") | Batch History Screen |
|--------------|-----------------------------------|----------------------|
| Active       | ✅ Visible                        | ✅ Visible           |
| Depleted     | ❌ Hidden                         | ✅ Visible           |
| Expired      | ❌ Hidden                         | ✅ Visible           |
| Damaged      | ❌ Hidden                         | ✅ Visible           |
| Returned     | ❌ Hidden                         | ✅ Visible           |

### Navigation Paths

```
📱 Product Detail
   └── Active Batches
       └── [View All Batches (Including History)]
           └── 📋 Batch History Screen
               ├── Filter: All
               ├── Filter: Active
               ├── Filter: Depleted ← Depleted batches here!
               ├── Filter: Expired
               └── Filter: Damaged
```

---

## Conclusion

**Problem:** Depleted batches disappear from view after being sold

**Solution:** Dedicated Batch History screen with filtering

**Result:** Complete visibility into all batches - past, present, active, or depleted! 🎉

Now you can always answer:
- "Where did my stock go?" → Check depleted batches
- "What were the old prices?" → View batch history
- "Which supplier had better pricing?" → Compare historical batches
- "When was this batch purchased?" → All details preserved

