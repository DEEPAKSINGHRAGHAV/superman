# Billing / Point of Sale (POS) Feature

## Overview

The Billing/POS feature provides a complete point-of-sale solution for processing sales transactions with barcode scanning, manual product selection, multiple payment methods, and automatic inventory deduction using FIFO (First-In-First-Out) batch tracking.

## 🎯 Features

### 1. **Product Addition**
- **Barcode Scanner**: Scan product barcodes to add items quickly
- **Manual Selection**: Search and select products manually by name, SKU, or barcode
- **Real-time Stock Validation**: Prevents adding items that exceed available stock

### 2. **Shopping Cart**
- Display all added products with quantity and prices
- Adjust quantities with +/- buttons
- Remove items from cart
- Real-time total calculation

### 3. **Bill Calculation**
- **Subtotal**: Sum of all item prices
- **GST (18%)**: Automatic tax calculation
- **Total Amount**: Final payable amount
- **Item Count**: Total number of items

### 4. **Payment Processing**
- **Multiple Payment Methods**:
  - Cash (with change calculation)
  - Card
  - UPI
  - Wallet
- Payment confirmation and validation
- Automatic inventory deduction using FIFO

### 5. **Receipt Generation**
- Detailed receipt with all transaction information
- Bill number and timestamp
- Itemized list with quantities and prices
- Payment method and cashier details
- Change calculation for cash payments
- Print-ready format (print functionality coming soon)

## 🚀 How to Use

### Accessing the Billing Screen

1. **From Dashboard**: 
   - Tap the "Billing" quick action button (primary button with POS icon)

2. **Direct Navigation**:
   ```javascript
   navigation.navigate(SCREEN_NAMES.BILLING);
   ```

### Adding Products to Cart

#### Method 1: Barcode Scanning
1. Tap "Scan Barcode" button
2. Scan the product barcode
3. Product automatically added to cart
4. If product not found, an alert is shown

#### Method 2: Manual Selection
1. Tap "Manual Select" button
2. Search for product by:
   - Product name
   - SKU code
   - Barcode number
3. Tap on the desired product from search results
4. Product added to cart

### Managing Cart Items

- **Increase Quantity**: Tap the green "+" button
- **Decrease Quantity**: Tap the red "-" button
- **Remove Item**: Tap the delete icon
- **Clear All**: Tap the delete icon in the header (with confirmation)

### Processing Payment

1. Review cart items and total amount
2. Tap "Pay ₹X.XX" button
3. Select payment method:
   - **Cash**: Enter amount received, see change calculated
   - **Card/UPI/Wallet**: Just confirm
4. Tap "Complete Payment"
5. View receipt with transaction details
6. Option to print receipt (coming soon)

## 📊 Backend Integration

### API Endpoints Used

1. **Get Product by Barcode**
   ```
   GET /api/v1/products/barcode/:barcode
   ```

2. **Search Products**
   ```
   GET /api/v1/products/search?search=query&limit=20
   ```

3. **Process Sale**
   ```
   POST /api/v1/inventory/sales
   Body: {
     saleItems: [
       { productId, quantity, notes }
     ],
     referenceNumber: "BILL-timestamp"
   }
   ```

### FIFO Batch Tracking

When a sale is processed:

1. **Batch Selection**: System selects batches in FIFO order (oldest first)
2. **Multi-Batch Sales**: If one batch is insufficient, multiple batches are used
3. **Cost Tracking**: Each batch's cost price is tracked for accurate profit calculation
4. **Stock Deduction**: Inventory is automatically reduced from selected batches
5. **Profit Calculation**: Real profit is calculated based on actual batch costs

Example:
```
Product: Milk (10 units sold)
- Batch 1 (Oct 1): 5 units @ ₹40 cost → Used
- Batch 2 (Oct 5): 5 units @ ₹42 cost → Used
Total Cost: (5×40) + (5×42) = ₹410
Selling Price: 10×50 = ₹500
Profit: ₹90
```

## 💡 Key Features & Business Logic

### 1. Stock Validation
- Checks real-time stock before adding to cart
- Prevents overselling
- Shows "Out of Stock" or "Insufficient Stock" alerts

### 2. GST Calculation
- Automatic 18% GST applied on subtotal
- Clearly shown in bill summary
- Included in final receipt

### 3. Payment Methods

#### Cash Payment
- Enter amount received
- Automatic change calculation
- Validates that received amount ≥ total
- Shows change amount in green

#### Digital Payments (Card/UPI/Wallet)
- No additional input required
- Exact amount processing
- Quick checkout

### 4. Receipt Information
- **Bill Number**: Unique reference `BILL-{timestamp}`
- **Date & Time**: Transaction timestamp
- **Cashier**: Current logged-in user
- **Items**: Detailed list with quantities
- **Pricing Breakdown**: Subtotal, GST, Total
- **Payment Details**: Method, amount received, change

## 🛠️ Technical Implementation

### Components Structure

```
BillingScreen.tsx (Main Component)
├── Barcode Scanner Modal
├── Product Search Modal
├── Cart Display (FlatList)
├── Bill Summary
├── Payment Modal
└── Receipt Modal
```

### State Management

```typescript
- cart: CartItem[]                  // Shopping cart items
- showScanner: boolean              // Scanner modal visibility
- showProductSearch: boolean        // Search modal visibility
- showPaymentModal: boolean         // Payment modal visibility
- showReceiptModal: boolean         // Receipt modal visibility
- searchQuery: string               // Search input
- searchResults: Product[]          // Search results
- selectedPaymentMethod: string     // Selected payment method
- amountReceived: string            // Cash amount received
- receiptData: ReceiptData          // Receipt information
```

### Cart Item Interface

```typescript
interface CartItem {
    product: Product;        // Full product details
    quantity: number;        // Quantity in cart
    unitPrice: number;       // Selling price per unit
    totalPrice: number;      // quantity × unitPrice
}
```

## 📱 User Interface

### Quick Actions (Dashboard)
```
[Billing]  [Add Product]  [Barcode]
[New Order]
```

### Billing Screen Layout
```
┌─────────────────────────────────┐
│  ← Billing              🗑️       │
├─────────────────────────────────┤
│  [Scan Barcode]  [Manual Select]│
├─────────────────────────────────┤
│                                 │
│  Cart Items:                    │
│  ┌────────────────────────────┐│
│  │ Product Name               ││
│  │ ₹50 × 2         [-] 2 [+] ││
│  │                    ₹100  🗑️││
│  └────────────────────────────┘│
│                                 │
├─────────────────────────────────┤
│  Items (3)              ₹450.00 │
│  GST (18%)              ₹81.00  │
│  ─────────────────────────────  │
│  Total                  ₹531.00 │
│                                 │
│  [Pay ₹531.00]                  │
└─────────────────────────────────┘
```

## 🔐 Permissions Required

- **read_products**: To view and search products
- **read_inventory**: To check stock levels
- **write_inventory**: To process sales (deduct inventory)

## 🚨 Error Handling

### Common Errors & Solutions

1. **"Product not found with this barcode"**
   - Product doesn't exist or barcode not registered
   - Solution: Add product with correct barcode

2. **"Insufficient stock"**
   - Requested quantity exceeds available stock
   - Solution: Reduce quantity or check inventory

3. **"No active batches available"**
   - Product exists but no batches in system
   - Solution: Create purchase order to add stock

4. **"Amount received must be at least ₹X"**
   - Cash amount is less than total
   - Solution: Enter correct amount

## 📈 Future Enhancements

1. **Print Receipt**: Direct thermal printer integration
2. **Customer Management**: Link sales to customer accounts
3. **Discount/Promo Codes**: Apply discounts to bills
4. **Split Payment**: Multiple payment methods in one transaction
5. **Offline Mode**: Process sales offline, sync later
6. **Sales Reports**: Daily/monthly sales analytics
7. **Barcode Generation**: Generate barcodes for products
8. **Receipt Email/SMS**: Send receipt to customer

## 📝 Testing Guide

### Test Scenarios

1. **Barcode Scanning**
   - Scan valid product barcode
   - Scan invalid/unknown barcode
   - Scan out-of-stock product

2. **Manual Search**
   - Search by product name
   - Search by SKU
   - Search by barcode
   - Search with no results

3. **Cart Operations**
   - Add single item
   - Add multiple items
   - Increase quantity
   - Decrease quantity to 0 (should remove)
   - Exceed available stock
   - Clear entire cart

4. **Payment Processing**
   - Cash payment with exact amount
   - Cash payment with more (check change)
   - Cash payment with less (should error)
   - Card payment
   - UPI payment
   - Wallet payment

5. **FIFO Verification**
   - Create 3 batches with different prices
   - Sell quantity that uses multiple batches
   - Check batch deduction order
   - Verify profit calculation

### Test Product Setup

```javascript
// Create test product
{
  name: "Test Product",
  sku: "TEST001",
  barcode: "1234567890",
  sellingPrice: 100,
  currentStock: 10
}

// Create test batches
Batch 1: 5 units @ ₹60 cost, purchased Oct 1
Batch 2: 3 units @ ₹65 cost, purchased Oct 5
Batch 3: 2 units @ ₹70 cost, purchased Oct 8

// Test sale of 7 units
Expected: 5 from Batch 1, 2 from Batch 2
Cost: (5×60) + (2×65) = ₹430
Revenue: 7×100 = ₹700
Profit: ₹270
```

## 🔗 Related Features

- **Batch Tracking**: `/batches/product/:id` - View all batches
- **Inventory Valuation**: Batch-wise profit analysis
- **Stock Movements**: Track all inventory transactions
- **Purchase Orders**: Replenish stock when low

## 📞 Support

For issues or questions:
- Check backend logs for API errors
- Verify user permissions
- Ensure products have valid barcodes
- Check batch availability for products
- Review stock movement history

---

**Version**: 1.0.0  
**Last Updated**: October 8, 2024  
**Feature Status**: ✅ Complete and Production Ready

