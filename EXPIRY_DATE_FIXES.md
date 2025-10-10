# Expiry Date Fixes in Purchase Orders

## Problem Summary

The expiry date functionality in purchase orders was experiencing several bugs:

1. **No Validation**: Backend wasn't validating expiry dates in purchase order items
2. **Incorrect Date Format**: Mobile app was sending dates in `YYYY-MM-DD` format instead of ISO 8601
3. **Data Loss on Edit**: Expiry dates were not loaded when editing existing purchase orders
4. **Missing in Receive Flow**: Expiry dates weren't being passed when receiving orders and creating batches

## Fixes Applied

### 1. Backend Validation (✅ Fixed)

**File**: `backend/middleware/validators.js`

Added validation for expiry dates in purchase order items:

```javascript
body('items.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value) => {
        if (value && new Date(value) < new Date()) {
            throw new Error('Expiry date cannot be in the past');
        }
        return true;
    }),
```

**What this does:**
- Validates that expiry date is in ISO 8601 format
- Ensures expiry date is not in the past
- Makes the field optional (as not all products have expiry dates)

### 2. Date Format Conversion (✅ Fixed)

**File**: `mobile/src/screens/PurchaseOrderFormScreen.tsx`

Fixed the date conversion when adding items to purchase orders:

```typescript
if (expiryDate) {
    // Convert YYYY-MM-DD to ISO 8601 format (set time to noon UTC to avoid timezone issues)
    const date = new Date(expiryDate + 'T12:00:00.000Z');
    newItem.expiryDate = date.toISOString();
}
```

**What this does:**
- Converts the date picker's `YYYY-MM-DD` format to proper ISO 8601 format
- Sets time to noon UTC to avoid timezone-related date shifts
- Sends properly formatted date to backend

### 3. Load Expiry Dates on Edit (✅ Fixed)

**File**: `mobile/src/screens/PurchaseOrderFormScreen.tsx`

Added expiry date loading when editing purchase orders:

```typescript
items: order.items.map(item => ({
    product: typeof item.product === 'string' ? item.product : item.product._id,
    quantity: item.quantity,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice || item.costPrice * 1.2,
    mrp: item.mrp,
    expiryDate: item.expiryDate, // ✅ Now included
})),
```

**What this does:**
- Loads expiry dates from existing purchase orders
- Allows editing purchase orders without losing expiry date information

### 4. Improved Date Display (✅ Fixed)

**File**: `mobile/src/screens/PurchaseOrderFormScreen.tsx`

Enhanced the `formatDisplayDate` function to handle both formats:

```typescript
const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';

    // Handle both YYYY-MM-DD and ISO 8601 formats
    const date = dateString.includes('T') ? new Date(dateString) : new Date(dateString + 'T00:00:00');
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
};
```

**What this does:**
- Handles both `YYYY-MM-DD` and ISO 8601 date formats
- Validates date before displaying
- Shows user-friendly formatted dates

### 5. Receive Order Flow (✅ Fixed)

**File**: `backend/routes/purchaseOrderRoutes.js`

Enhanced the receive order endpoint to use PO item expiry dates:

```javascript
const batch = await BatchService.createBatch({
    productId,
    quantity,
    costPrice: costPrice || poItem.costPrice,
    sellingPrice: sellingPrice || poItem.sellingPrice || poItem.costPrice * 1.2,
    purchaseOrderId: purchaseOrder._id,
    supplierId: purchaseOrder.supplier._id,
    expiryDate: expiryDate || poItem.expiryDate, // ✅ Falls back to PO item expiry
    manufactureDate,
    location,
    notes: notes || `Received from PO ${purchaseOrder.orderNumber}`,
    createdBy: req.user._id
});
```

**File**: `mobile/src/screens/PurchaseOrderDetailScreen.tsx`

Updated mobile app to pass expiry dates when receiving:

```typescript
const receivedItem: any = {
    productId: productId,
    quantity: item.quantity,
    costPrice: item.costPrice,
    sellingPrice: sellingPrice,
};

// Include expiry date if present in order item
if (item.expiryDate) {
    receivedItem.expiryDate = item.expiryDate;
}
```

**What this does:**
- Passes expiry date from PO items to batch creation
- Falls back to PO item expiry if not explicitly provided during receiving
- Ensures batches inherit expiry dates from purchase orders

## How to Test

### Test Script

Run the provided test script to verify all fixes:

```bash
cd backend
node scripts/testExpiryInPurchaseOrder.js
```

The script will:
1. Create a test purchase order with expiry date
2. Approve the order
3. Receive the order and create a batch
4. Verify the batch has the correct expiry date
5. Check if the batch appears in expiring batches list
6. Test update scenarios

### Manual Testing Steps

#### 1. Create Purchase Order with Expiry Date

1. Open the mobile app
2. Navigate to Purchase Orders → Create New
3. Add a product
4. Set an expiry date (e.g., 6 months from now)
5. Complete and create the order
6. Verify the expiry date appears in the item list

#### 2. Edit Purchase Order

1. Open an existing purchase order with expiry dates
2. Click Edit
3. Verify expiry dates are loaded correctly
4. Make changes and save
5. Verify expiry dates are preserved

#### 3. Receive Purchase Order

1. Approve a purchase order with expiry dates
2. Click "Receive Stock"
3. Verify batches are created successfully
4. Check batch details to confirm expiry dates are set

#### 4. Check Expiry Reports

1. Navigate to Dashboard
2. Click on "Expiring Products"
3. Verify products with expiry dates from POs appear
4. Check that days until expiry are calculated correctly

## API Endpoints Updated

### POST `/api/v1/purchase-orders`
- Now validates `items[].expiryDate` field
- Accepts ISO 8601 date format
- Returns validation error if date is invalid or in the past

### PATCH `/api/v1/purchase-orders/:id/receive`
- Now properly uses expiry dates from PO items when creating batches
- Falls back to PO item expiry if not provided in receivedItems

## Data Model

### PurchaseOrder Item Schema
```javascript
{
    product: ObjectId,
    quantity: Number,
    costPrice: Number,
    sellingPrice: Number,
    mrp: Number,
    totalAmount: Number,
    expiryDate: Date  // Optional, ISO 8601 format
}
```

### InventoryBatch Schema
```javascript
{
    product: ObjectId,
    batchNumber: String,
    quantity: Number,
    costPrice: Number,
    sellingPrice: Number,
    expiryDate: Date,  // Inherited from PO item
    purchaseOrder: ObjectId,
    supplier: ObjectId,
    // ... other fields
}
```

## Best Practices

1. **Always Set Expiry Dates**: For products with limited shelf life, always set expiry dates during PO creation
2. **Use Date Picker**: Don't manually type dates - use the date picker to ensure correct format
3. **Check Before Receiving**: Review expiry dates before receiving orders to catch any errors
4. **Monitor Expiring Products**: Regularly check the expiring products screen to manage inventory

## Timezone Handling

The system uses UTC noon (12:00:00) for all expiry dates to avoid timezone-related issues where dates might shift by a day. This ensures:
- Dates are consistent across different timezones
- No unexpected date changes when data travels between client and server
- Expiry checks work reliably

## Technical Notes

### Date Format Standards

- **Storage**: All dates stored in MongoDB as ISO 8601 format
- **API Communication**: ISO 8601 format with timezone (e.g., `2024-10-10T12:00:00.000Z`)
- **Mobile Display**: User-friendly format (e.g., "Oct 10, 2024")
- **Mobile Input**: `YYYY-MM-DD` from date picker, converted to ISO 8601

### Validation Rules

1. Expiry date must be a valid date
2. Expiry date cannot be in the past (at creation time)
3. Expiry date is optional (not all products have expiry)
4. Date must be in ISO 8601 format for API calls

## Files Modified

### Backend
- `backend/middleware/validators.js` - Added expiry date validation
- `backend/routes/purchaseOrderRoutes.js` - Enhanced receive order flow

### Mobile App
- `mobile/src/screens/PurchaseOrderFormScreen.tsx` - Fixed date formatting and loading
- `mobile/src/screens/PurchaseOrderDetailScreen.tsx` - Added expiry in receive flow

### Testing
- `backend/scripts/testExpiryInPurchaseOrder.js` - New test script

### Documentation
- `EXPIRY_DATE_FIXES.md` - This document

## Summary

All expiry date bugs in purchase orders have been fixed. The system now:
- ✅ Validates expiry dates properly
- ✅ Stores dates in correct ISO 8601 format
- ✅ Loads expiry dates when editing
- ✅ Displays dates in user-friendly format
- ✅ Passes expiry dates through the entire flow (PO → Receive → Batch)
- ✅ Handles timezones correctly
- ✅ Includes comprehensive testing

The expiry tracking functionality is now reliable and can be used in production with confidence.

