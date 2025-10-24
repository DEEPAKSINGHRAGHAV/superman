# 🔄 Shivik Mart - Visual System Flow Diagrams

## 📱 Mobile App Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         SHIVIK MART MOBILE APP                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              LOGIN SCREEN (if not logged in)             │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │  Email: ___________________________            │     │  │
│  │  │  Password: ________________________            │     │  │
│  │  │                                                 │     │  │
│  │  │              [  Login  ]                        │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              │ After Login                       │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  MAIN TAB NAVIGATION                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │Dashboard │  │ Products │  │ Tracking │  │  Admin   │ │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │  │
│  │       │             │              │             │        │  │
│  │       ▼             ▼              ▼             ▼        │  │
│  │  ┌────────┐   ┌─────────┐   ┌──────────┐  ┌──────────┐ │  │
│  │  │ Stats  │   │Product  │   │  Stock   │  │  Brands  │ │  │
│  │  │ Quick  │   │  List   │   │Movements │  │Categories│ │  │
│  │  │Actions │   │ Search  │   │ History  │  │  Users   │ │  │
│  │  │        │   │ Filters │   │          │  │          │ │  │
│  │  └────────┘   └─────────┘   └──────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  KEY SCREENS (Stack)                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  • ProductDetailScreen (shows batches!)                   │  │
│  │  • ProductFormScreen (add/edit)                           │  │
│  │  • BarcodeScannerScreen (scan & see batches)             │  │
│  │  • BatchValuationScreen (profit report)                   │  │
│  │  • SupplierListScreen / FormScreen                        │  │
│  │  • PurchaseOrderListScreen / FormScreen / DetailScreen   │  │
│  │  • InventoryTrackingScreen                                │  │
│  │  • BrandListScreen / FormScreen / DetailScreen            │  │
│  │  • CategoryListScreen / FormScreen / DetailScreen         │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌐 Backend API Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Node.js/Express)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SERVER.JS (Entry Point)                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Load environment variables (config.env)               │  │
│  │  2. Connect to MongoDB                                    │  │
│  │  3. Apply middleware:                                     │  │
│  │     • CORS (allow mobile app)                             │  │
│  │     • Helmet (security)                                   │  │
│  │     • Rate Limiter (prevent abuse)                        │  │
│  │     • Body Parser (JSON)                                  │  │
│  │  4. Mount routes (/api/v1/...)                            │  │
│  │  5. Error handler                                         │  │
│  │  6. Listen on port 8000                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ROUTES (API Endpoints)                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /api/v1/auth              - Login, logout, profile       │  │
│  │  /api/v1/users             - User management              │  │
│  │  /api/v1/products          - Product CRUD + search        │  │
│  │  /api/v1/suppliers         - Supplier management          │  │
│  │  /api/v1/purchase-orders   - PO workflow                  │  │
│  │  /api/v1/inventory         - Stock movements              │  │
│  │  /api/v1/batches           - ⭐ BATCH TRACKING           │  │
│  │  /api/v1/brands            - Brand management             │  │
│  │  /api/v1/categories        - Category management          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  MIDDLEWARE (on each request)                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • auth.js - Check JWT token, verify user                │  │
│  │  • validation.js - Validate request data                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  SERVICES (Business Logic)                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • batchService.js - ⭐ FIFO, valuation, expiry          │  │
│  │  • inventoryService.js - Stock management                 │  │
│  │  • pricingService.js - Price calculations                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  MODELS (Mongoose Schemas)                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • User.js                                                │  │
│  │  • Product.js                                             │  │
│  │  • InventoryBatch.js - ⭐ KEY MODEL                       │  │
│  │  • Supplier.js                                            │  │
│  │  • PurchaseOrder.js                                       │  │
│  │  • StockMovement.js                                       │  │
│  │  • Brand.js                                               │  │
│  │  • Category.js                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    MongoDB Database                       │  │
│  │  Collections: users, products, inventorybatches,          │  │
│  │               suppliers, purchaseorders, stockmovements   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Purchase-to-Sale Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    STEP 1: CREATE SUPPLIER                        │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → POST /api/v1/suppliers
        { name, email, phone, gst }
                               │
                               ▼
        Backend: Save to MongoDB
                               │
                               ▼
        ✅ Supplier created (SUP001)

┌──────────────────────────────────────────────────────────────────┐
│                    STEP 2: CREATE PRODUCT                         │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → POST /api/v1/products
        { name: "Coca Cola 500ml", barcode: "ABC123", category }
                               │
                               ▼
        Backend: Generate SKU (PRD001)
                Save to MongoDB
                               │
                               ▼
        ✅ Product created (no stock yet)

┌──────────────────────────────────────────────────────────────────┐
│                 STEP 3: CREATE PURCHASE ORDER                     │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → POST /api/v1/purchase-orders
        {
          supplier: SUP001,
          items: [{
            product: PRD001 (Coca Cola),
            quantity: 100,
            costPrice: 20,
            sellingPrice: 25
          }]
        }
                               │
                               ▼
        Backend: Generate PO number (PO2410070001)
                Status: 'pending'
                Save to MongoDB
                               │
                               ▼
        ✅ PO created, waiting approval

┌──────────────────────────────────────────────────────────────────┐
│                    STEP 4: APPROVE PO (Admin)                     │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → PUT /api/v1/purchase-orders/:id/approve
                               │
                               ▼
        Backend: Check user role (admin/manager)
                Update PO: status = 'approved'
                           approvedBy = user ID
                           approvedAt = now
                               │
                               ▼
        ✅ PO approved

┌──────────────────────────────────────────────────────────────────┐
│      STEP 5: RECEIVE STOCK ⭐ (Creates Batches)                  │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → PUT /api/v1/purchase-orders/:id/receive
                               │
                               ▼
        Backend: START TRANSACTION
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
        For each item:               inventoryService
        Coca Cola (100 units)        .receivePurchaseOrder()
                │                             │
                ▼                             ▼
        Call batchService            Generate batch number:
        .createBatch()               BATCH2410070001
                │                             │
                ├─────────────────────────────┤
                │                             │
                ▼                             ▼
        Create InventoryBatch:       Update Product:
          - batchNumber               - currentStock: 0 → 100
          - product: PRD001           - costPrice: 20
          - costPrice: 20             - sellingPrice: 25
          - sellingPrice: 25
          - initialQuantity: 100
          - currentQuantity: 100
          - status: 'active'
          - purchaseDate: now
          - supplier: SUP001
                │                             │
                ├─────────────────────────────┤
                │                             │
                ▼                             ▼
        Create StockMovement:        Update PO:
          - type: 'purchase'          - status: 'received'
          - quantity: +100            - actualDeliveryDate
          - batchNumber
          - unitCost: 20
          - totalCost: 2000
                │                             │
                └─────────────┬───────────────┘
                              ▼
                      COMMIT TRANSACTION
                              │
                              ▼
        ✅ Stock received!
        ✅ Batch created!
        ✅ Product stock updated!
        ✅ Audit trail recorded!

┌──────────────────────────────────────────────────────────────────┐
│           STEP 6: SCAN BARCODE (Check Stock & Prices)            │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → Open Barcode Scanner
                     Scan "ABC123"
                               │
                               ▼
        API Call: GET /api/v1/batches/product/ABC123
                               │
                               ▼
        Backend: batchService.getBatchesByProduct()
                 1. Find product by barcode
                 2. Get all active batches
                 3. Sort by purchaseDate (FIFO)
                               │
                               ▼
        Return: {
          productName: "Coca Cola 500ml",
          totalBatches: 1,
          totalQuantity: 100,
          batches: [{
            batchNumber: "BATCH2410070001",
            costPrice: 20,
            sellingPrice: 25,
            currentQuantity: 100,
            purchaseDate: "2024-10-07"
          }]
        }
                               │
                               ▼
        Mobile App: Show modal with batch details
                               │
                               ▼
        ✅ User sees: 100 units @ ₹25 (Cost ₹20)

┌──────────────────────────────────────────────────────────────────┐
│  LATER: SECOND PURCHASE (Same Product, Different Price)          │
└──────────────────────────────────────────────────────────────────┘
                               │
        Create new PO for Coca Cola:
        - Quantity: 150
        - Cost Price: 22 (increased!)
        - Selling Price: 28 (increased!)
                               │
                               ▼
        Receive Stock → Creates BATCH2410170001
                               │
                               ▼
        Now in database:
        
        Product: Coca Cola
          - currentStock: 250 (100 + 150)
          - costPrice: 22 (latest)
          - sellingPrice: 28 (latest)
        
        Batches:
          1. BATCH2410070001
             - quantity: 100
             - costPrice: 20
             - sellingPrice: 25
             - purchaseDate: 2024-10-07 ← OLDER
          
          2. BATCH2410170001
             - quantity: 150
             - costPrice: 22
             - sellingPrice: 28
             - purchaseDate: 2024-10-17 ← NEWER
                               │
                               ▼
        ✅ Same product, TWO batches with different prices!

┌──────────────────────────────────────────────────────────────────┐
│            SCAN BARCODE AGAIN (Shows Both Batches)                │
└──────────────────────────────────────────────────────────────────┘
                               │
        Scan "ABC123" again
                               │
                               ▼
        API returns:
        {
          productName: "Coca Cola 500ml",
          totalBatches: 2,
          totalQuantity: 250,
          priceRange: {
            minCostPrice: 20,
            maxCostPrice: 22,
            minSellingPrice: 25,
            maxSellingPrice: 28
          },
          batches: [
            { batch1... }, // Older @ ₹25
            { batch2... }  // Newer @ ₹28
          ]
        }
                               │
                               ▼
        Mobile shows:
        "Coca Cola has 2 batches:
         
         Old Stock: 100 units @ ₹25 (Cost ₹20)
         New Stock: 150 units @ ₹28 (Cost ₹22)
         
         System will sell old stock first!"
                               │
                               ▼
        ✅ PROBLEM SOLVED! User sees both prices!

┌──────────────────────────────────────────────────────────────────┐
│             STEP 7: MAKE SALE (FIFO Processing)                   │
└──────────────────────────────────────────────────────────────────┘
                               │
        Customer buys 120 units
                               │
                               ▼
        API Call: POST /api/v1/batches/sale
        {
          productId: PRD001,
          quantity: 120
        }
                               │
                               ▼
        Backend: batchService.processSaleFIFO()
                 START TRANSACTION
                               │
        Get batches in FIFO order:
        [Batch1 (Oct 7), Batch2 (Oct 17)]
                               │
        Remaining to sell: 120
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
    From Batch1:          From Batch2:          Result:
    Take 100 units        Take 20 units         
    (depleted!)          (130 left)            Total sold: 120
                                                
    Cost: 100×20=2000    Cost: 20×22=440       Total cost: 2440
    Rev: 100×25=2500     Rev: 20×28=560        Total rev: 3060
    Profit: 500          Profit: 120           Profit: 620
                                                Margin: 20.26%
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
        Update Product:
          currentStock: 250 - 120 = 130
                               │
        Create StockMovements for each batch used
                               │
        COMMIT TRANSACTION
                               │
                               ▼
        Return: {
          quantitySold: 120,
          batchesUsed: [
            { batch1, qty: 100, cost: 2000, rev: 2500 },
            { batch2, qty: 20, cost: 440, rev: 560 }
          ],
          totalCost: 2440,
          totalRevenue: 3060,
          profit: 620,
          profitMargin: 20.26%,
          averageCostPrice: 20.33,
          averageSellingPrice: 25.50
        }
                               │
                               ▼
        ✅ Sale processed!
        ✅ Exact profit calculated!
        ✅ FIFO automatic!
        ✅ Audit trail complete!

┌──────────────────────────────────────────────────────────────────┐
│              STEP 8: VIEW PROFIT REPORT (Anytime)                 │
└──────────────────────────────────────────────────────────────────┘
                               │
        Mobile App → Tap "Inventory Valuation"
                               │
                               ▼
        API Call: GET /api/v1/batches/valuation
                               │
                               ▼
        Backend: MongoDB Aggregation
                 - Group batches by product
                 - Sum quantities
                 - Calculate cost value (qty × costPrice)
                 - Calculate selling value (qty × sellingPrice)
                 - Calculate profit (selling - cost)
                               │
                               ▼
        Return: {
          summary: {
            totalProducts: 50,
            totalBatches: 126,
            totalQuantity: 15300,
            totalCostValue: 305960,
            totalSellingValue: 382090,
            totalPotentialProfit: 76130
          },
          products: [
            {
              productName: "Coca Cola",
              batches: 2,
              quantity: 130,
              costValue: 2860,
              sellingValue: 3640,
              profit: 780,
              margin: 21.4%
            },
            ... (all products)
          ]
        }
                               │
                               ▼
        Mobile App displays beautiful report
                               │
                               ▼
        ✅ Manager sees complete financial picture!
```

---

## 🎯 Key Concept: Multiple Batches for Same Product

```
PRODUCT: Coca Cola 500ml (Barcode: ABC123)
┌───────────────────────────────────────────────────────────┐
│                       Master Record                        │
│  - SKU: PRD001                                            │
│  - Barcode: ABC123                                        │
│  - Category: Beverages                                    │
│  - Current Stock: 250 units (sum of all batches)         │
│  - Cost Price: 22 (latest batch)                         │
│  - Selling Price: 28 (latest batch)                      │
└───────────────────────────────────────────────────────────┘
                               │
                               │ Has Multiple Batches
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   BATCH #1      │   │   BATCH #2      │   │   BATCH #3      │
│  (October 7)    │   │  (October 17)   │   │  (Future)       │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ Number:         │   │ Number:         │   │ Number:         │
│ BATCH2410070001 │   │ BATCH2410170001 │   │ BATCH2411010001 │
│                 │   │                 │   │                 │
│ Quantity:       │   │ Quantity:       │   │ Quantity:       │
│ 0 (DEPLETED)    │   │ 130 units       │   │ 200 units       │
│                 │   │                 │   │                 │
│ Cost: ₹20       │   │ Cost: ₹22       │   │ Cost: ₹23       │
│ Selling: ₹25    │   │ Selling: ₹28    │   │ Selling: ₹30    │
│                 │   │                 │   │                 │
│ Margin: 20.0%   │   │ Margin: 21.4%   │   │ Margin: 23.3%   │
│                 │   │                 │   │                 │
│ Status:         │   │ Status:         │   │ Status:         │
│ DEPLETED        │   │ ACTIVE ✅       │   │ ACTIVE ✅       │
│                 │   │                 │   │                 │
│ Purchased:      │   │ Purchased:      │   │ Purchased:      │
│ Oct 7, 2024     │   │ Oct 17, 2024    │   │ Nov 1, 2024     │
│                 │   │                 │   │                 │
│ Sold First ⚡   │   │ Will Sell Next  │   │ Will Sell Last  │
│ (FIFO)          │   │ (FIFO)          │   │ (FIFO)          │
└─────────────────┘   └─────────────────┘   └─────────────────┘

When you scan barcode "ABC123":
  → System shows ALL batches
  → You see price history
  → You know which sells first
  → Exact profit calculations
```

---

## 💡 The Magic: What Happens Automatically

```
┌────────────────────────────────────────────────────────────┐
│               YOU DO THIS (Manual)                         │
├────────────────────────────────────────────────────────────┤
│  1. Create purchase order                                  │
│  2. Add items with quantities and prices                   │
│  3. Approve PO (if admin)                                  │
│  4. Mark as "received" when stock arrives                  │
│  5. Scan barcode when checking stock                       │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│         SYSTEM DOES THIS (Automatic) ⚡                     │
├────────────────────────────────────────────────────────────┤
│  ✅ Generates batch numbers                                │
│  ✅ Creates inventory batches with pricing                 │
│  ✅ Updates product stock levels                           │
│  ✅ Records all stock movements (audit trail)              │
│  ✅ Sorts batches by date (FIFO)                          │
│  ✅ Shows all batches when you scan                        │
│  ✅ Uses oldest batch first when selling                   │
│  ✅ Calculates exact profit per sale                       │
│  ✅ Tracks expiry dates                                    │
│  ✅ Generates valuation reports                            │
│  ✅ Maintains complete history                             │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│               RESULT: You Get                              │
├────────────────────────────────────────────────────────────┤
│  📊 Accurate profit margins (not estimated)                │
│  💰 Real-time inventory valuation                          │
│  📦 Complete stock traceability                            │
│  ⏰ Expiry management                                       │
│  🔍 Price history per product                              │
│  📈 Financial insights                                     │
│  ✨ No manual calculations needed                          │
│  🎯 Industry-standard FIFO costing                         │
└────────────────────────────────────────────────────────────┘
```

---

**Your system is smart, automatic, and production-ready! 🎉**
