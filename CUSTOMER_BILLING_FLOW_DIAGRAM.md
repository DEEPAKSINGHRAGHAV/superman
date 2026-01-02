# Customer Billing Flow Diagram

## 📱 Complete Billing Flow with Customer Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BILLING SCREEN                                     │
│                     (Website or Mobile App)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ User scans/searches products
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADD PRODUCTS TO CART                                 │
│  • Scan barcode or search product                                           │
│  • System fetches batches (FIFO pricing)                                    │
│  • Add to cart with batch info                                              │
│  • User can edit prices (validated ≥ cost price)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Cart ready
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OPTIONAL: ENTER CUSTOMER PHONE                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │  Phone Number Input: [_______________]                      │            │
│  │  (e.g., 9876543210)                                         │            │
│  └────────────────────────────────────────────────────────────┘            │
│                              │                                               │
│                              │ User types phone (debounced 500ms)            │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────┐              │
│  │  System triggers: handleCustomerPhoneLookup(phone)        │              │
│  └──────────────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER LOOKUP/CREATION FLOW                             │
│                                                                              │
│  POST /api/v1/customers/find-or-create                                      │
│  {                                                                           │
│    phone: "9876543210",                                                     │
│    name: "John Doe" (optional)                                              │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  Customer.findOrCreateByPhone()         │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌─────────────────────┐    ┌─────────────────────┐
    │  Customer EXISTS?   │    │  Customer NOT FOUND │
    │  (phone matches)    │    │                     │
    └─────────────────────┘    └─────────────────────┘
                │                           │
                │ Yes                       │ No → Create New
                ▼                           ▼
    ┌─────────────────────┐    ┌─────────────────────────────┐
    │  Return existing    │    │  Customer.generateNumber()  │
    │  customer data      │    │                             │
    │                     │    │  ┌─────────────────────┐   │
    │  • customerNumber   │    │  │ CustomerCounter     │   │
    │  • name             │    │  │ Atomic $inc         │   │
    │  • phone            │    │  │ sequence++          │   │
    │  • email            │    │  └─────────────────────┘   │
    │  • address          │    │           │                 │
    └─────────────────────┘    │           ▼                 │
                               │  Format: CUST0001,          │
                               │         CUST0002, etc.      │
                               │           │                 │
                               │           ▼                 │
                               │  Create Customer:           │
                               │  {                          │
                               │    customerNumber: "CUST0001"│
                               │    phone: "9876543210",     │
                               │    name: "Walk-in Customer" │
                               │  }                          │
                               └─────────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DISPLAY CUSTOMER INFO                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────┐              │
│  │  ✓ CUST0001 - John Doe                                   │              │
│  │    9876543210                                            │              │
│  └─────────────────────────────────────────────────────────┘              │
│                                                                              │
│  • Auto-populate customer name if found                                     │
│  • User can edit name if needed                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "COMPLETE PAYMENT"
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROCESS PAYMENT                                         │
│                                                                              │
│  1. Validate payment (cash amount ≥ total)                                  │
│  2. Prepare receiptData object:                                             │
│     {                                                                        │
│       billNumber: "BILL-1234567890",                                        │
│       items: [...],                                                         │
│       subtotal: 500,                                                        │
│       total: 500,                                                           │
│       customerPhone: "9876543210",  ← Include customer data                 │
│       customerName: "John Doe",    ← Include customer data                  │
│       customerEmail: null,         ← Include customer data                  │
│       paymentMethod: "Cash",                                                │
│       ...                                                                   │
│     }                                                                        │
│                                                                              │
│  3. POST /api/v1/inventory/sales                                            │
│     {                                                                        │
│       saleItems: [{productId, quantity, notes}],                            │
│       referenceNumber: "BILL-...",                                          │
│       receiptData: {...}  ← Complete receipt with customer                  │
│     }                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND: SALES PROCESSING                                 │
│                                                                              │
│  1. Process Sale (FIFO batch deduction):                                    │
│     • BatchService.processSaleFIFO()                                        │
│     • Deduct from oldest batches                                            │
│     • Update Product.currentStock                                           │
│     • Create StockMovement records                                          │
│                                                                              │
│  2. Handle Customer (if phone provided):                                    │
│     ┌──────────────────────────────────────────┐                           │
│     │ Customer.findOrCreateByPhone(phone)      │                           │
│     │                                          │                           │
│     │ → Returns customer object with ID        │                           │
│     └──────────────────────────────────────────┘                           │
│                                                                              │
│  3. Create Bill Record:                                                     │
│     Bill.create({                                                            │
│       billNumber: "BILL-...",                                               │
│       items: [...],                                                         │
│       totalAmount: 500,                                                     │
│       totalCost: 400,        ← FIFO costs                                   │
│       profit: 100,           ← Calculated                                   │
│       customer: ObjectId(...),  ← Link to customer                          │
│       customerNumber: "CUST0001",  ← Store customer number                  │
│       customerName: "John Doe",    ← Store customer name                    │
│       customerPhone: "9876543210", ← Store customer phone                   │
│       cashier: user._id,                                                    │
│       ...                                                                   │
│     })                                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE TO FRONTEND                                 │
│                                                                              │
│  {                                                                           │
│    success: true,                                                           │
│    message: "Sales processed successfully",                                 │
│    data: [...sale results...],                                              │
│    bill: {                                                                  │
│      _id: "...",                                                            │
│      billNumber: "BILL-...",                                                │
│      customer: ObjectId("..."),                                             │
│      customerNumber: "CUST0001",                                            │
│      customerName: "John Doe",                                              │
│      customerPhone: "9876543210",                                           │
│      ...                                                                     │
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DISPLAY RECEIPT                                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────┐                   │
│  │            SHIVIK MART                              │                   │
│  │                                                     │                   │
│  │  Bill No: BILL-1234567890                          │                   │
│  │  Customer: CUST0001 - John Doe                     │  ← Customer info  │
│  │  Phone: 9876543210                                 │  ← Customer info  │
│  │  Date: 2025-01-15 10:30 AM                         │                   │
│  │                                                     │                   │
│  │  ─────────────────────────────────────             │                   │
│  │                                                     │                   │
│  │  Product A         2 × ₹100    ₹200                │                   │
│  │  Product B         3 × ₹100    ₹300                │                   │
│  │                                                     │                   │
│  │  ─────────────────────────────────────             │                   │
│  │  Subtotal:                  ₹500                   │                   │
│  │  Total:                     ₹500                   │                   │
│  │  Payment: Cash                                    │                   │
│  │                                                     │                   │
│  └─────────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ✅ Transaction Complete
                              │
                              │ Next Sale
                              ▼
                    (Clear cart, reset form)
```

---

## 🔄 Sequential Customer ID Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              Customer.generateCustomerNumber()                               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Start MongoDB Transaction                                 │
│                    (session.startTransaction())                              │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CustomerCounter.findByIdAndUpdate(                                         │
│    'customer_sequence',                                                     │
│    { $inc: { sequence: 1 } },  ← Atomic increment                           │
│    { upsert: true, new: true }                                              │
│  )                                                                           │
│                                                                              │
│  Collection: customercounters                                               │
│  Document: {                                                                │
│    _id: "customer_sequence",                                                │
│    sequence: 5  ← Increments atomically                                     │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Commit Transaction                                        │
│                    (session.commitTransaction())                             │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Format Customer Number                                          │
│                                                                              │
│  sequence = 5                                                                │
│  customerNumber = "CUST" + String(5).padStart(4, '0')                       │
│  customerNumber = "CUST0005"                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Return: "CUST0005"
```

---

## 📊 Database Schema Relationships

```
┌──────────────┐
│   Customer   │
├──────────────┤
│ _id          │
│ customerNumber (CUST0001) ──────┐
│ phone (unique)                   │
│ name                             │
│ email                            │
│ address                          │
│ isActive                         │
└──────────────┘                   │
                                   │
                                   │ References
                                   │
                                   ▼
┌──────────────┐           ┌──────────────────┐
│     Bill     │           │ CustomerCounter  │
├──────────────┤           ├──────────────────┤
│ _id          │           │ _id: "customer_  │
│ billNumber   │           │        sequence" │
│ items[]      │           │ sequence: 5      │
│ totalAmount  │           └──────────────────┘
│ totalCost    │
│ profit       │
│              │
│ customer (ObjectId) ──────┼──→ Customer._id
│ customerNumber            │
│ customerName              │
│ customerPhone             │
│                          │
│ cashier (ObjectId)       │
└──────────────┘           │
```

---

## 🔍 Customer Lookup Flow (Detailed)

```
User Enters Phone: "9876543210"
         │
         ▼
┌─────────────────────────────────────┐
│ Normalize Phone Number              │
│ (Remove spaces, dashes, etc.)       │
│ Result: "9876543210"                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Customer.findOne({                  │
│   phone: "9876543210"               │
│ })                                  │
└─────────────────────────────────────┘
         │
         ├──────────┬──────────┐
         │          │          │
         ▼          ▼          ▼
    FOUND      NOT FOUND   ERROR
         │          │          │
         │          ▼          │
         │   ┌────────────────────┐
         │   │ Generate Customer  │
         │   │ Number (CUST0001)  │
         │   └────────────────────┘
         │          │
         │          ▼
         │   ┌────────────────────┐
         │   │ Create Customer    │
         │   │ {                  │
         │   │   customerNumber,  │
         │   │   phone,           │
         │   │   name: provided   │
         │   │        || "Walk-in │
         │   │           Customer"│
         │   │ }                  │
         │   └────────────────────┘
         │          │
         └──────────┘
              │
              ▼
    Return Customer Object
              │
              ▼
    Display in UI & Link to Bill
```

---

## 🎯 Key Features Summary

### ✅ What Happens When Phone is Entered:
1. **Debounced Lookup** (500ms delay after typing stops)
2. **Auto-Customer Creation** if not found
3. **Sequential ID Assignment** (CUST0001, CUST0002, ...)
4. **Display Customer Info** in billing screen
5. **Link Bill to Customer** when payment is processed

### ✅ What Happens When Phone is NOT Entered:
1. Billing proceeds normally
2. No customer lookup/creation
3. Bill created without customer reference
4. All customer fields in Bill are null

### ✅ Customer ID Generation:
- **Format**: CUST0001, CUST0002, CUST0003, ...
- **Method**: Atomic MongoDB counter
- **Safety**: Uses transactions to prevent duplicates
- **Sequential**: Always increments, never reuses

### ✅ Bill-Customer Linking:
- Bill stores both ObjectId reference AND denormalized data
- Enables fast queries without joins
- Customer info preserved even if customer is deleted
- Supports searching bills by customer phone/number

---

## 🔗 API Endpoints Used

```
POST /api/v1/customers/find-or-create
  → Finds existing customer or creates new one
  → Returns customer object with sequential ID

POST /api/v1/inventory/sales
  → Processes sale with FIFO batch deduction
  → Creates Bill record
  → Links to customer if phone provided
```

---

## 💡 Example Scenarios

### Scenario 1: New Customer
```
1. User enters: 9876543210
2. System: Not found → Creates CUST0001
3. Bill: Linked to CUST0001
```

### Scenario 2: Returning Customer
```
1. User enters: 9876543210
2. System: Found → Returns CUST0001
3. Bill: Linked to existing CUST0001
```

### Scenario 3: No Phone Number
```
1. User: Skips phone field
2. System: No customer lookup
3. Bill: Created without customer link
```







