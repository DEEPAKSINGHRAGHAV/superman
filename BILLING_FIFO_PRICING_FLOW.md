# Billing Screen FIFO Pricing Flow Diagram

## Complete Flow: From Scan to Sale

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILLING SCREEN FLOW                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  User Action    │
│                 │
│ • Scan Barcode  │
│ • Search Product│
│ • Manual Add    │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│              GET PRODUCT BY BARCODE/ID                         │
│  Response: Product with default prices (latest batch prices)  │
└────────┬───────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────┐
│                  FETCH BATCH INFORMATION                       │
│           GET /api/v1/batches/product/:productId               │
│                                                                │
│  Returns batches in FIFO order (oldest first):                │
│  ┌──────────────────────────────────────────────────┐         │
│  │ Batch 1 (Oldest):  Cost ₹20, Selling ₹25        │         │
│  │ Batch 2:           Cost ₹21, Selling ₹26        │         │
│  │ Batch 3 (Newest):  Cost ₹22, Selling ₹28        │         │
│  └──────────────────────────────────────────────────┘         │
└────────┬───────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────┐
    │ Has Batches?│
    └─────┬──────┘
          │
    ┌─────┴─────┐
    │           │
   YES         NO
    │           │
    ▼           ▼
┌─────────────────────┐    ┌──────────────────────┐
│ USE FIFO BATCH      │    │ USE PRODUCT PRICES   │
│                     │    │                      │
│ Extract from        │    │ Cost: product.costPrice│
│ batches[0]:         │    │ Sell: product.sellingPrice│
│                     │    │                      │
│ • Cost Price        │    │ No batch info        │
│ • Selling Price     │    └──────────────────────┘
│ • Batch Number      │              │
│ • Available Qty     │              │
└──────────┬──────────┘              │
           │                         │
           └────────┬────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  CREATE CART ITEM    │
         │                      │
         │  {                   │
         │    product,          │
         │    quantity: 1,      │
         │    unitPrice: $FIFO, │
         │    costPrice: $FIFO, │
         │    batchInfo: {...}  │
         │  }                   │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   DISPLAY IN CART    │
         │                      │
         │ ┌──────────────────┐ │
         │ │ Coca Cola 500ml  │ │
         │ │ COKE-500ML       │ │
         │ │                  │ │
         │ │ Cost: ₹20 (FIFO) │ │
         │ │ [20% profit]     │ │
         │ │ Batch: BATCH001  │ │
         │ │                  │ │
         │ │ Selling: ₹25     │ │
         │ │ Qty: 1           │ │
         │ │ Total: ₹25       │ │
         │ └──────────────────┘ │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   USER ACTIONS       │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    ┌─────────┐          ┌──────────┐
    │ Edit    │          │ Process  │
    │ Price   │          │ Payment  │
    └────┬────┘          └─────┬────┘
         │                     │
         ▼                     ▼
    ┌─────────────────┐   ┌──────────────────┐
    │ Validate vs     │   │ POST /batches/   │
    │ FIFO Cost (₹20) │   │ sale (FIFO)      │
    │                 │   │                  │
    │ If < ₹20:       │   │ Uses same batches│
    │   ❌ Block      │   │ shown in billing │
    │                 │   │                  │
    │ If >= ₹20:      │   │ Accurate profit! │
    │   ✅ Allow      │   └──────────────────┘
    └─────────────────┘
```

## Before vs After Comparison

### BEFORE (Showing Latest Prices)
```
┌─────────────────────────────────────┐
│ Product: Coca Cola 500ml            │
│                                     │
│ Batches:                            │
│ ┌─────────────────────────────────┐ │
│ │ Batch 1 (Oct 1):                │ │
│ │   100 units @ ₹20/₹25          │ │ ← FIFO (oldest)
│ │                                 │ │
│ │ Batch 2 (Oct 10):               │ │
│ │   150 units @ ₹22/₹28          │ │ ← Latest
│ └─────────────────────────────────┘ │
│                                     │
│ Product prices updated to latest:  │
│   costPrice: ₹22                   │
│   sellingPrice: ₹28                │
└─────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   BILLING SCREEN    │
         │  (Before Fix)       │
         │                     │
         │ Shows: Cost ₹22     │ ← Wrong!
         │        Sell ₹28     │ ← Wrong!
         │        Profit 21%   │ ← Wrong!
         └─────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   ACTUAL SALE       │
         │   (FIFO Backend)    │
         │                     │
         │ Uses: Cost ₹20      │ ← Correct (oldest)
         │       Sell ₹25      │ ← Correct (oldest)
         │       Profit 20%    │ ← Correct
         └─────────────────────┘

         ❌ MISMATCH! ❌
```

### AFTER (Showing FIFO Prices)
```
┌─────────────────────────────────────┐
│ Product: Coca Cola 500ml            │
│                                     │
│ Batches:                            │
│ ┌─────────────────────────────────┐ │
│ │ Batch 1 (Oct 1):                │ │
│ │   100 units @ ₹20/₹25          │ │ ← FIFO (oldest) ✓
│ │                                 │ │
│ │ Batch 2 (Oct 10):               │ │
│ │   150 units @ ₹22/₹28          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Fetch batches via API              │
│ Extract oldest batch prices        │
└─────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   BILLING SCREEN    │
         │   (After Fix)       │
         │                     │
         │ Shows: Cost ₹20 ✓   │ ← FIFO price!
         │        Sell ₹25 ✓   │ ← FIFO price!
         │        Profit 20% ✓ │ ← Accurate!
         │        (FIFO)       │
         │  Batch: BATCH001    │
         └─────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   ACTUAL SALE       │
         │   (FIFO Backend)    │
         │                     │
         │ Uses: Cost ₹20 ✓    │ ← Same!
         │       Sell ₹25 ✓    │ ← Same!
         │       Profit 20% ✓  │ ← Same!
         └─────────────────────┘

         ✅ PERFECT MATCH! ✅
```

## Multi-Quantity Sale Scenario

```
Product: Coca Cola 500ml
Available Batches:
┌──────────────────────────────────────────┐
│ Batch 1 (Oldest): 100 units @ ₹20/₹25   │ ← FIFO
│ Batch 2:          150 units @ ₹22/₹28   │
└──────────────────────────────────────────┘

User adds 120 units to cart
         │
         ▼
┌────────────────────────────────────────────┐
│  BILLING SCREEN SHOWS                      │
│                                            │
│  Quantity: 120                             │
│  Unit Price: ₹25 (from Batch 1)           │
│  Cost Price: ₹20 (from Batch 1)           │
│  Batch: BATCH001                          │
│                                            │
│  Note: Simplified view showing FIFO price  │
│  (actual sale will use multiple batches)   │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  ACTUAL SALE (FIFO Backend)                │
│                                            │
│  1. Take 100 from Batch 1 @ ₹25 = ₹2500   │
│  2. Take 20 from Batch 2 @ ₹28 = ₹560     │
│                                            │
│  Total Revenue: ₹3060                     │
│  Total Cost: ₹2440                        │
│  Profit: ₹620                             │
└────────────────────────────────────────────┘

Note: Current implementation shows first batch price.
Future enhancement: Show "Mixed batches" warning.
```

## Price Editing Flow

```
User taps "Edit Price" on cart item
         │
         ▼
┌────────────────────────────────┐
│  Show price input              │
│  Current: ₹25                  │
│  FIFO Cost: ₹20                │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  User enters new price         │
└────────┬───────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│< ₹20   │  │>= ₹20  │
└────┬───┘  └───┬────┘
     │          │
     ▼          ▼
┌─────────────────┐  ┌──────────────────┐
│ ❌ REJECT       │  │ ✅ ACCEPT        │
│                 │  │                  │
│ Alert:          │  │ Update:          │
│ "Selling price  │  │ • unitPrice      │
│  cannot be less │  │ • totalPrice     │
│  than FIFO cost │  │ • Recalc profit  │
│  (₹20)"         │  │                  │
└─────────────────┘  └──────────────────┘
```

## Error Handling Flow

```
Add product to cart
         │
         ▼
┌────────────────────────────────┐
│  Fetch batch information       │
│  GET /batches/product/:id      │
└────────┬───────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐  ┌──────────┐
│ Success │  │  Error   │
└────┬────┘  └─────┬────┘
     │             │
     ▼             ▼
┌─────────────┐  ┌────────────────────┐
│ Use FIFO    │  │ Fallback to        │
│ prices      │  │ product prices     │
│             │  │                    │
│ • Cost ✓    │  │ • product.costPrice│
│ • Sell ✓    │  │ • product.selling  │
│ • Batch ✓   │  │ • No batch info    │
│             │  │                    │
│ Show (FIFO) │  │ Log error          │
└─────────────┘  └────────────────────┘
         │             │
         └──────┬──────┘
                ▼
         ┌──────────────┐
         │ Add to cart  │
         │ successfully │
         └──────────────┘
```

## Visual Indicators on Screen

```
┌─────────────────────────────────────────────────┐
│ CART ITEM DISPLAY                               │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📦 Coca Cola 500ml                    [×]   │ │
│ │    COKE-500ML • 8901234567890              │ │
│ │                                             │ │
│ │    Cost: ₹20.00 (FIFO) [🔄 20% profit]     │ │
│ │    Batch: BATCH241001001                   │ │
│ │                                             │ │
│ │    ┌──────────┐  ┌──────────────────────┐  │ │
│ │    │ Quantity │  │  Selling Price       │  │ │
│ │    │  [-] 1 [+]  │  ₹25.00 [✏️]        │  │ │
│ │    └──────────┘  └──────────────────────┘  │ │
│ │                                             │ │
│ │                   Item Total: ₹25.00       │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Legend:
• (FIFO) - Indicates batch-based pricing
• [🔄 20% profit] - Real-time profit calculation
• Batch: BATCH... - Shows which batch is being used
• [✏️] - Price is editable (with validation)
```

## Key Takeaways

1. **FIFO Prices Fetched on Add**
   - Real-time batch lookup
   - Oldest batch prices used
   - Accurate from the start

2. **Transparent Display**
   - Shows actual costs
   - Displays batch information
   - Clear FIFO indicator

3. **Accurate Validation**
   - Price edits validated against FIFO cost
   - Prevents loss-making sales
   - Real profit margins shown

4. **Consistent with Backend**
   - Billing preview = Actual sale
   - No surprises
   - Reliable reporting

5. **Graceful Degradation**
   - Works without batches
   - Handles API errors
   - Always functional

