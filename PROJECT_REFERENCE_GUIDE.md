# 📚 Shivik Mart - Complete Project Reference Guide

> **Project Name:** Superman / Shivik Mart  
> **Type:** Inventory Management & Billing System  
> **Last Updated:** December 2024

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Core Data Models](#core-data-models)
4. [Purchase Order Workflow](#purchase-order-workflow)
5. [Batch Tracking System](#batch-tracking-system)
6. [Billing & Sales Flow](#billing--sales-flow)
7. [Services Layer](#services-layer)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Key Screens & Components](#key-screens--components)
10. [Permissions System](#permissions-system)
11. [Profit Calculation](#profit-calculation)
12. [Data Flow Diagrams](#data-flow-diagrams)

---

## Project Overview

Shivik Mart is a comprehensive **Inventory Management and Point-of-Sale (POS) System** designed for retail businesses. It provides:

- ✅ **Batch-level inventory tracking** with unique pricing per batch
- ✅ **FIFO (First-In-First-Out)** cost accounting for accurate profit calculation
- ✅ **Purchase Order management** with approval workflow
- ✅ **Expiry date tracking** and alerts
- ✅ **Real-time inventory valuation** reports
- ✅ **Barcode scanning** for quick product lookup
- ✅ **Multi-platform support** (Mobile App + Web Dashboard)

---

## Technology Stack

| Layer | Technology | Directory |
|-------|------------|-----------|
| **Backend API** | Node.js + Express.js | `/backend/` |
| **Database** | MongoDB (with Mongoose ODM) | - |
| **Mobile App** | React Native + TypeScript | `/mobile/` |
| **Web Dashboard** | React + JSX | `/website/` |
| **Authentication** | JWT (JSON Web Tokens) | - |

### Key Dependencies

**Backend:**
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - Authentication
- `bcryptjs` - Password hashing
- `helmet` - Security headers
- `cors` - Cross-origin support

**Mobile:**
- `react-native` - Mobile framework
- `@react-navigation` - Navigation
- `react-native-vector-icons` - Icons
- `@react-native-community/datetimepicker` - Date inputs

---

## Core Data Models

### 1. Product (`backend/models/Product.js`)

The master product catalog containing base product information.

```javascript
{
  name: String,           // Product name (required)
  sku: String,            // Auto-generated unique SKU
  barcode: String,        // Unique barcode (optional, sparse index)
  mrp: Number,            // Maximum Retail Price
  costPrice: Number,      // Default cost price (updated to latest batch)
  sellingPrice: Number,   // Default selling price (updated to latest batch)
  currentStock: Number,   // Total stock across all batches
  minStockLevel: Number,  // Low stock alert threshold
  maxStockLevel: Number,  // Maximum stock level
  category: String,       // Product category (slug)
  brand: String,          // Brand name
  unit: String,           // Unit of measurement (pcs, kg, liter, etc.)
  isActive: Boolean,      // Active/inactive status
  createdBy: ObjectId     // Reference to User
}
```

**Virtual Fields:**
- `isAvailable` - Stock > 0 and isActive
- `isLowStock` - Stock <= minStockLevel
- `profitMargin` - Calculated margin percentage
- `batches` - Populates active InventoryBatch records

---

### 2. InventoryBatch (`backend/models/InventoryBatch.js`) ⭐ KEY MODEL

Tracks individual batches of products with their own pricing.

```javascript
{
  product: ObjectId,        // Reference to Product (required)
  batchNumber: String,      // Auto-generated: BATCHyymmddNNN
  
  // Pricing (specific to THIS batch)
  costPrice: Number,        // Purchase cost for this batch
  sellingPrice: Number,     // Selling price for this batch
  mrp: Number,              // MRP for this batch
  
  // Quantities
  initialQuantity: Number,  // Original quantity received
  currentQuantity: Number,  // Current available quantity
  reservedQuantity: Number, // Reserved for pending orders
  
  // References
  purchaseOrder: ObjectId,  // Reference to PurchaseOrder
  supplier: ObjectId,       // Reference to Supplier
  
  // Dates
  purchaseDate: Date,       // When batch was received (for FIFO)
  expiryDate: Date,         // Expiry date (optional)
  manufactureDate: Date,    // Manufacturing date (optional)
  
  // Status
  status: String,           // 'active' | 'depleted' | 'expired' | 'damaged' | 'returned'
  
  notes: String,
  createdBy: ObjectId
}
```

**Virtual Fields:**
- `availableQuantity` - currentQuantity - reservedQuantity
- `isDepleted` - currentQuantity === 0
- `isExpired` - Current date > expiryDate
- `daysUntilExpiry` - Days remaining until expiry
- `profitMargin` - ((sellingPrice - costPrice) / sellingPrice) × 100
- `batchValue` - currentQuantity × costPrice
- `potentialRevenue` - currentQuantity × sellingPrice

**Why This Model is Critical:**
- Each batch has its **own cost and selling prices**
- Enables **accurate FIFO costing** - oldest batch prices used for sales
- Tracks **exact profit** per sale transaction
- Supports **price history** - see all purchase prices over time

---

### 3. PurchaseOrder (`backend/models/PurchaseOrder.js`)

Manages the purchase workflow from creation to stock receipt.

```javascript
{
  orderNumber: String,      // Auto-generated: POyymmddNNN
  supplier: ObjectId,       // Reference to Supplier (required)
  
  items: [{
    product: ObjectId,      // Reference to Product
    quantity: Number,       // Quantity ordered
    costPrice: Number,      // Cost per unit
    sellingPrice: Number,   // Intended selling price
    mrp: Number,            // MRP
    expiryDate: Date,       // Expected expiry date
    totalAmount: Number     // quantity × costPrice
  }],
  
  // Financials
  subtotal: Number,         // Sum of item totals
  taxAmount: Number,        // Tax amount
  discountAmount: Number,   // Discount applied
  totalAmount: Number,      // Final total
  
  // Status
  status: String,           // 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled'
  
  // Dates
  orderDate: Date,
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  
  // Payment
  paymentMethod: String,    // 'cash' | 'credit' | 'cheque' | 'online' | 'other'
  paymentStatus: String,    // 'pending' | 'partial' | 'paid'
  
  // Metadata
  notes: String,
  createdBy: ObjectId,
  approvedBy: ObjectId,
  approvedAt: Date
}
```

**Status Flow:**
```
pending → approved → ordered → received
    ↓                            ↑
    └──────── cancelled ─────────┘
```

---

### 4. Bill (`backend/models/Bill.js`)

Records completed sales transactions with FIFO cost tracking.

```javascript
{
  billNumber: String,       // Unique bill number
  
  items: [{
    product: ObjectId,      // Reference to Product
    productName: String,    // Snapshot of product name
    productSku: String,     // Snapshot of SKU
    quantity: Number,       // Quantity sold
    unitPrice: Number,      // Actual selling price (may be edited)
    totalPrice: Number,     // quantity × unitPrice
    costPrice: Number,      // FIFO cost from batch
    batchNumber: String     // Which batch was used
  }],
  
  // Financials
  subtotal: Number,         // Sum before tax/discount
  taxAmount: Number,
  discountAmount: Number,
  totalAmount: Number,      // Final amount paid
  
  // FIFO Profit Tracking
  totalCost: Number,        // Sum of (costPrice × quantity) from batches
  profit: Number,           // totalAmount - totalCost
  profitMargin: Number,     // (profit / totalAmount) × 100
  
  // Payment
  paymentMethod: String,    // 'Cash' | 'UPI' | 'Card' | 'Wallet'
  amountReceived: Number,
  change: Number,
  
  // Metadata
  cashier: ObjectId,
  cashierName: String,
  referenceNumber: String,
  notes: String
}
```

---

### 5. StockMovement (`backend/models/StockMovement.js`)

Audit trail for all inventory changes.

```javascript
{
  product: ObjectId,        // Reference to Product
  movementType: String,     // 'purchase' | 'sale' | 'adjustment' | 'return' | 'damage' | 'transfer' | 'expired'
  
  quantity: Number,         // Positive = in, Negative = out
  previousStock: Number,    // Stock before movement
  newStock: Number,         // Stock after movement
  
  // Reference
  referenceId: ObjectId,    // Reference to PO, Bill, etc.
  referenceNumber: String,
  referenceType: String,    // 'purchase_order' | 'sale' | 'adjustment' | 'return' | 'transfer'
  
  // Details
  reason: String,
  notes: String,
  unitCost: Number,
  totalCost: Number,
  batchNumber: String,
  expiryDate: Date,
  
  createdBy: ObjectId
}
```

---

### 6. Supporting Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Supplier` | Vendor management | name, code, email, phone, gstNumber, address |
| `Category` | Product categories | name, slug, description, productCount |
| `Brand` | Product brands | name, description, isActive |
| `User` | User accounts | name, email, password, role, permissions |
| `BarcodeCounter` | Auto-increment for barcodes | prefix, currentNumber |

---

## Purchase Order Workflow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PURCHASE ORDER LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────────┘

1. CREATE PO                    2. APPROVE PO                3. RECEIVE STOCK
   ┌─────────────┐                 ┌─────────────┐              ┌─────────────┐
   │   pending   │ ───────────────>│  approved   │ ────────────>│  received   │
   └─────────────┘                 └─────────────┘              └─────────────┘
         │                               │                             │
         │ POST                          │ PATCH                       │ PATCH
         │ /purchase-orders              │ .../approve                 │ .../receive
         │                               │                             │
         ▼                               ▼                             ▼
   ┌─────────────────┐           ┌─────────────────┐          ┌──────────────────┐
   │ • Select supplier│           │ • Verify items  │          │ • Create batches │
   │ • Add items     │           │ • Set approver  │          │ • Update stock   │
   │ • Set prices    │           │ • Record time   │          │ • Record movement│
   │ • Set expiry    │           │                 │          │ • Mark completed │
   └─────────────────┘           └─────────────────┘          └──────────────────┘
```

### Step 1: Create Purchase Order

**Endpoint:** `POST /api/v1/purchase-orders`

**Required Data:**
```javascript
{
  supplier: "supplierId",
  items: [{
    product: "productId",
    quantity: 100,
    costPrice: 20.00,
    sellingPrice: 25.00,  // For batch creation
    mrp: 30.00,
    expiryDate: "2025-12-31"
  }],
  expectedDeliveryDate: "2024-12-20",
  paymentMethod: "credit",
  notes: "Urgent order"
}
```

**What Happens:**
1. Validates supplier and products exist
2. Generates unique orderNumber (POyymmddNNN)
3. Calculates subtotal and totalAmount
4. Sets status to 'pending'
5. Records createdBy user

---

### Step 2: Approve Purchase Order

**Endpoint:** `PATCH /api/v1/purchase-orders/:id/approve`

**Required Permission:** `approve_purchase_orders`

**What Happens:**
1. Validates order is in 'pending' status
2. Updates status to 'approved'
3. Sets approvedBy and approvedAt
4. Order is now ready for receiving

---

### Step 3: Receive Stock ⭐ CRITICAL OPERATION

**Endpoint:** `PATCH /api/v1/purchase-orders/:id/receive`

**Request Body:**
```javascript
{
  receivedItems: [{
    productId: "productId",
    quantity: 100,
    costPrice: 20.00,
    sellingPrice: 25.00,
    expiryDate: "2025-12-31",
    manufactureDate: "2024-06-01",
    notes: "Good condition"
  }]
}
```

**What Happens (Transactional):**

1. **Optimistic Locking:**
   - Atomically updates status to 'received' ONLY if currently 'approved' or 'ordered'
   - Prevents duplicate receives

2. **For Each Item - Create Batch:**
   ```javascript
   BatchService.createBatch({
     productId,
     quantity,
     costPrice,
     sellingPrice,
     purchaseOrderId,
     supplierId,
     expiryDate,
     manufactureDate,
     notes,
     createdBy
   })
   ```

3. **Inside createBatch():**
   - Generate batchNumber: `BATCHyymmddNNN`
   - Create InventoryBatch record
   - Update Product.currentStock (increment)
   - Update Product.costPrice and sellingPrice to latest
   - Create StockMovement record

4. **On Failure:**
   - Rollback PO status
   - Delete created batches
   - Restore product stock
   - Delete stock movements

---

## Batch Tracking System

### Batch Number Generation

Format: `BATCHyymmddNNN`

```javascript
// Example: BATCH24121401 (December 14, 2024, sequence 001)
const batchNumber = `BATCH${year}${month}${day}${sequence}`;
```

### FIFO (First-In-First-Out) Logic

When processing sales, batches are used in order of `purchaseDate` (oldest first):

```javascript
// Query to get batches for sale (FIFO order)
InventoryBatch.find({
  product: productId,
  status: 'active',
  currentQuantity: { $gt: 0 },
  $or: [
    { expiryDate: { $exists: false } },
    { expiryDate: null },
    { expiryDate: { $gt: new Date() } }  // Not expired
  ]
}).sort({ purchaseDate: 1, createdAt: 1 })  // Oldest first
```

### Multi-Batch Sale Example

```
Product: Coca Cola 500ml
Customer wants: 120 units

Available Batches (FIFO order):
┌─────────────────────────────────────────────────────┐
│ Batch 1 (Oct 7):  100 units @ Cost ₹20, Sell ₹25   │ ← Oldest
│ Batch 2 (Oct 17): 150 units @ Cost ₹22, Sell ₹28   │
└─────────────────────────────────────────────────────┘

Sale Processing:
1. Take 100 from Batch 1 @ ₹25 = ₹2500 revenue, ₹2000 cost
2. Take 20 from Batch 2 @ ₹28 = ₹560 revenue, ₹440 cost

Result:
- Total Revenue: ₹3060
- Total Cost: ₹2440
- Profit: ₹620
- Margin: 20.26%
```

### Batch Status Lifecycle

```
active → depleted (quantity = 0)
   ↓
expired (past expiry date)
   ↓
damaged (manual marking)
   ↓
returned (supplier return)
```

---

## Billing & Sales Flow

### Complete Billing Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    BILLING SCREEN FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. SCAN/SEARCH PRODUCT
        │
        ▼
2. FETCH BATCH INFORMATION
   GET /api/v1/batches/product/:productId
        │
        ▼
   ┌────────────────────────────────────────────────────┐
   │ Response: Batches in FIFO order                    │
   │ ┌────────────────────────────────────────────────┐ │
   │ │ Batch 1 (Oldest): Cost ₹20, Selling ₹25       │ │
   │ │ Batch 2:          Cost ₹22, Selling ₹28       │ │
   │ └────────────────────────────────────────────────┘ │
   └────────────────────────────────────────────────────┘
        │
        ▼
3. ADD TO CART (using FIFO batch prices)
   ┌─────────────────────────────────────────┐
   │ Item: Coca Cola 500ml                   │
   │ Quantity: 1                             │
   │ Unit Price: ₹25 (from oldest batch)     │
   │ Cost Price: ₹20 (from oldest batch)     │
   │ Profit Margin: 20%                      │
   │ Batch: BATCH241007001                   │
   └─────────────────────────────────────────┘
        │
        ▼
4. EDIT PRICE (Optional)
   - User can change selling price
   - Validation: Cannot be less than FIFO cost
        │
        ▼
5. PROCESS PAYMENT
   POST /api/v1/inventory/sales
        │
        ▼
6. BACKEND PROCESSING
   ┌─────────────────────────────────────────┐
   │ a. BatchService.processSaleFIFO()       │
   │    - Reduce batch quantities            │
   │    - Create StockMovement records       │
   │                                         │
   │ b. Update Product.currentStock          │
   │                                         │
   │ c. Create Bill record                   │
   │    - Store actual revenue               │
   │    - Store FIFO costs                   │
   │    - Calculate profit                   │
   └─────────────────────────────────────────┘
        │
        ▼
7. GENERATE RECEIPT
```

### Price Validation

```javascript
// User tries to set selling price below cost
if (newPrice < batchCostPrice) {
  // REJECT: "Selling price cannot be less than FIFO cost (₹20)"
  return false;
}
// ALLOW: Update price and recalculate profit
```

---

## Services Layer

### BatchService (`backend/services/batchService.js`)

| Method | Purpose |
|--------|---------|
| `createBatch(batchData)` | Creates batch, updates stock, records movement |
| `getBatchesByProduct(productId)` | Returns batches in FIFO order with summary |
| `processSaleFIFO(productId, quantity, userId, options)` | Processes sale using FIFO, returns profit breakdown |
| `getBatchDetails(identifier)` | Get batch by ID or batch number |
| `getExpiringBatches(daysAhead)` | Get batches expiring within N days |
| `updateBatchStatus(batchId, status, userId, reason)` | Update status (expired, damaged, etc.) |
| `getInventoryValuation()` | Complete inventory valuation report |
| `adjustBatchQuantity(batchId, adjustment, userId, reason)` | Manual quantity adjustment |

### InventoryService (`backend/services/inventoryService.js`)

| Method | Purpose |
|--------|---------|
| `updateStock(productId, quantity, type, options)` | Atomic stock update with audit |
| `processPurchaseReceipt(poId, items, userId)` | Process PO receipt |
| `processSale(saleItems, userId, refNumber)` | Wrapper for FIFO sale |
| `getLowStockAlerts()` | Products below minStockLevel |
| `getExpiringProducts(daysAhead)` | Products with expiring batches |
| `getInventorySummary()` | Overall inventory statistics |
| `getProductStockHistory(productId, options)` | Movement history for product |
| `getDailyStockSummary(date)` | Daily movement summary |
| `getCategoryWiseSummary()` | Category-wise inventory breakdown |

### PricingService (`backend/services/pricingService.js`)

| Method | Purpose |
|--------|---------|
| `calculateProfitMargin(cost, selling)` | Calculate margin percentage |
| `calculateMarkup(cost, selling)` | Calculate markup percentage |
| `calculateSellingPriceWithMargin(cost, margin)` | Price from margin |
| `updateProductPricing(productId, data, userId)` | Update product prices |
| `getPricingAnalytics()` | Overall pricing statistics |
| `findLowMarginProducts(threshold)` | Products with low margins |

### ExpiryCheckService (`backend/services/expiryCheckService.js`)

| Method | Purpose |
|--------|---------|
| `checkAndUpdateExpiredBatches()` | Auto-mark expired batches |
| `getExpiryStatistics()` | Expiry statistics |

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login and get JWT token |
| GET | `/api/v1/auth/me` | Get current user profile |
| POST | `/api/v1/auth/logout` | Logout |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products with pagination |
| GET | `/api/v1/products/:id` | Get single product |
| POST | `/api/v1/products` | Create product |
| PUT | `/api/v1/products/:id` | Update product |
| DELETE | `/api/v1/products/:id` | Delete product |

### Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/purchase-orders` | List POs with filters |
| GET | `/api/v1/purchase-orders/:id` | Get single PO |
| POST | `/api/v1/purchase-orders` | Create PO |
| PUT | `/api/v1/purchase-orders/:id` | Update PO |
| PATCH | `/api/v1/purchase-orders/:id/approve` | Approve PO |
| PATCH | `/api/v1/purchase-orders/:id/receive` | Receive stock |
| PATCH | `/api/v1/purchase-orders/:id/cancel` | Cancel PO |
| DELETE | `/api/v1/purchase-orders/:id` | Delete PO |

### Batches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/batches` | List batches with filters |
| GET | `/api/v1/batches/:id` | Get batch details |
| GET | `/api/v1/batches/product/:productId` | Get batches for product (FIFO) |
| GET | `/api/v1/batches/expiring` | Get expiring batches |
| GET | `/api/v1/batches/valuation` | Inventory valuation report |
| GET | `/api/v1/batches/expiry-stats` | Expiry statistics |
| POST | `/api/v1/batches` | Create batch manually |
| POST | `/api/v1/batches/sale` | Process FIFO sale |
| POST | `/api/v1/batches/check-expired` | Check and update expired |
| PATCH | `/api/v1/batches/:id/status` | Update batch status |
| PATCH | `/api/v1/batches/:id/adjust` | Adjust quantity |

### Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/inventory/movements` | Stock movement history |
| GET | `/api/v1/inventory/low-stock` | Low stock alerts |
| GET | `/api/v1/inventory/expiring` | Expiring products |
| GET | `/api/v1/inventory/daily-summary` | Daily summary |
| GET | `/api/v1/inventory/sales-history` | Sales/bill history |
| GET | `/api/v1/inventory/analytics` | Inventory analytics |
| POST | `/api/v1/inventory/movements` | Create movement |
| POST | `/api/v1/inventory/sales` | Process sale |
| POST | `/api/v1/inventory/adjustments` | Bulk adjustment |

### Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/suppliers` | List suppliers |
| GET | `/api/v1/suppliers/:id` | Get supplier |
| POST | `/api/v1/suppliers` | Create supplier |
| PUT | `/api/v1/suppliers/:id` | Update supplier |
| DELETE | `/api/v1/suppliers/:id` | Delete supplier |

---

## Key Screens & Components

### Mobile App Screens

| Screen | File | Purpose |
|--------|------|---------|
| Dashboard | `DashboardScreen.tsx` | Overview and quick actions |
| Product List | `ProductListScreen.tsx` | Browse and search products |
| Product Form | `ProductFormScreen.tsx` | Add/edit products |
| Product Detail | `ProductDetailScreen.tsx` | View product with batches |
| PO List | `PurchaseOrderListScreen.tsx` | List purchase orders |
| PO Form | `PurchaseOrderFormScreen.tsx` | Create/edit PO |
| PO Detail | `PurchaseOrderDetailScreen.tsx` | View PO, approve/receive |
| Billing | `BillingScreen.tsx` | POS with scanner, FIFO pricing |
| Barcode Scanner | `BarcodeScannerScreen.tsx` | Scan and lookup products |
| Expiring Products | `ExpiringProductsScreen.tsx` | Products expiring soon |
| Batch History | `BatchHistoryScreen.tsx` | Batch movement history |
| Batch Valuation | `BatchValuationScreen.tsx` | Inventory valuation |
| Inventory Tracking | `InventoryTrackingScreen.tsx` | Stock movements |

### Website Pages

| Page | File | Purpose |
|------|------|---------|
| Dashboard | `Dashboard.jsx` | Overview |
| Product List | `products/ProductList.jsx` | Browse products |
| Product Form | `products/ProductForm.jsx` | Add/edit products |
| PO List | `purchase-orders/PurchaseOrderList.jsx` | List POs |
| PO Form | `purchase-orders/PurchaseOrderForm.jsx` | Create/edit PO |
| Billing | `billing/BillingScreen.jsx` | POS interface |
| Sales History | `billing/SalesHistory.jsx` | View past sales |
| Batch List | `batches/BatchList.jsx` | All batches |
| Batch History | `batches/BatchHistory.jsx` | Movement history |
| Expiring Products | `batches/ExpiringProducts.jsx` | Expiry alerts |

---

## Permissions System

### Available Permissions

| Permission | Description |
|------------|-------------|
| `read_products` | View products |
| `write_products` | Create/edit products |
| `read_purchase_orders` | View purchase orders |
| `write_purchase_orders` | Create/edit purchase orders |
| `approve_purchase_orders` | Approve purchase orders |
| `read_inventory` | View inventory and movements |
| `write_inventory` | Create stock movements, process sales |
| `adjust_inventory` | Make inventory adjustments |
| `read_reports` | View analytics and reports |
| `manage_users` | User management |

### Role-Based Access

```javascript
// Middleware usage
router.get('/products', 
  protect,                              // Require authentication
  requirePermission('read_products'),   // Check permission
  handler
);

router.patch('/purchase-orders/:id/approve',
  protect,
  requirePermission('approve_purchase_orders'),
  handler
);
```

---

## Profit Calculation

### Formula

```
Profit = ActualRevenue - FIFOCosts
ProfitMargin = (Profit / ActualRevenue) × 100
```

### Components

| Component | Source |
|-----------|--------|
| **ActualRevenue** | Bill.totalAmount (what customer paid) |
| **FIFOCosts** | Sum of (batch.costPrice × quantity) for each batch used |
| **Profit** | Stored in Bill.profit |
| **ProfitMargin** | Stored in Bill.profitMargin |

### Why FIFO Matters

```
WITHOUT FIFO (using product default price):
  Product shows: Cost ₹22, Sell ₹28
  Sale of 120 units:
    Revenue: 120 × ₹28 = ₹3360
    Cost:    120 × ₹22 = ₹2640  ← WRONG! Uses latest price
    Profit:  ₹720               ← INACCURATE

WITH FIFO (using actual batch costs):
  Batch 1: 100 units @ ₹20 cost
  Batch 2: 150 units @ ₹22 cost
  
  Sale of 120 units:
    From Batch 1: 100 × ₹25 = ₹2500 revenue, 100 × ₹20 = ₹2000 cost
    From Batch 2: 20 × ₹28 = ₹560 revenue, 20 × ₹22 = ₹440 cost
    
    Total Revenue: ₹3060
    Total Cost:    ₹2440        ← CORRECT! Uses actual batch costs
    Profit:        ₹620         ← ACCURATE
```

---

## Data Flow Diagrams

### Complete Purchase-to-Sale Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Supplier   │────>│ Purchase    │────>│  Inventory  │
│             │     │   Order     │     │   Batch     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               │ Updates
                                               ▼
                                        ┌─────────────┐
                                        │   Product   │
                                        │ (stock +)   │
                                        └──────┬──────┘
                                               │
                                               │ Sale
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Bill     │<────│   Billing   │<────│  Customer   │
│  (profit)   │     │   Screen    │     │             │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │
       │ Audit
       ▼
┌─────────────┐
│    Stock    │
│  Movement   │
└─────────────┘
```

### Entity Relationships

```
Supplier ─────────────────┐
                          │
                          ▼
Product ──────────> PurchaseOrder
    │                     │
    │                     │ Receive
    │                     ▼
    └──────────────> InventoryBatch
                          │
                          │ FIFO Sale
                          ▼
                        Bill
                          │
                          ▼
                    StockMovement
```

---

## Quick Reference

### Batch Number Format
`BATCHyymmddNNN` → `BATCH24121401` (Dec 14, 2024, sequence 1)

### PO Number Format
`POyymmddNNN` → `PO24121401` (Dec 14, 2024, sequence 1)

### Key Environment Variables
```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/shivik_mart
JWT_SECRET=your_secret
JWT_EXPIRE=30d
```

### Common Status Values

| Entity | Statuses |
|--------|----------|
| PurchaseOrder | pending, approved, ordered, received, cancelled |
| InventoryBatch | active, depleted, expired, damaged, returned |
| Bill.paymentMethod | Cash, UPI, Card, Wallet |
| StockMovement.type | purchase, sale, adjustment, return, damage, transfer, expired |

---

## File Structure Summary

```
/backend
  /config          - Database configuration
  /middleware      - Auth, validation, rate limiting
  /models          - Mongoose schemas
  /routes          - API endpoints
  /services        - Business logic
  /scripts         - Utility scripts
  server.js        - Entry point

/mobile
  /src
    /components    - Reusable UI components
    /contexts      - React contexts (Auth, Theme)
    /screens       - App screens
    /services      - API service layer
    /types         - TypeScript types

/website
  /src
    /components    - Reusable components
    /pages         - Page components
    /services      - API services
    /hooks         - Custom hooks
```

---

*This document serves as the comprehensive reference for the Shivik Mart inventory and billing system. For specific implementation details, refer to the source code files mentioned throughout.*










