# Purchase Order Form - Testing Guide

## ✅ Fixed Issues

1. **Supplier Selection**: Changed from text input to searchable dropdown with actual supplier data
2. **Product Management**: Added complete product selection with quantity and cost price
3. **Items List**: Can now add/remove items dynamically
4. **Date Picker**: Integrated native date picker for delivery date selection
5. **Payment Method**: Changed to dropdown with predefined options (Cash, Credit, UPI, Bank Transfer)
6. **Real-time Validation**: Shows total amount and validates before submission

## 📋 End-to-End Testing Steps

### Prerequisites
1. Backend server must be running on http://localhost:5000
2. User must be logged in with `write_purchase_orders` permission
3. At least one supplier must exist in the database
4. At least one product must exist in the database

### Test Flow

#### 1. Navigate to Purchase Order Form
- From Dashboard → Tap "New Order" button
- OR From bottom tabs → Navigate to relevant section

#### 2. Fill Supplier Information
- Tap on "Supplier" dropdown
- Search for a supplier by name
- Select the desired supplier

#### 3. Set Expected Delivery Date (Optional)
- Tap on "Expected Delivery Date" field
- Select a future date from the date picker
- Confirm selection

#### 4. Select Payment Method
- Tap on "Payment Method" dropdown
- Choose from: Cash, Credit, UPI, or Bank Transfer

#### 5. Add Order Items
- In the "Add Product" section:
  - Tap "Product" dropdown
  - Search and select a product
  - Enter quantity (positive integer)
  - Enter cost price (positive number)
  - Tap "Add Item" button
- Repeat for multiple products
- See items listed with totals
- Remove items by tapping trash icon if needed

#### 6. Add Notes (Optional)
- Enter any additional notes in the notes field

#### 7. Submit Order
- Review the total amount displayed
- Tap "Create Order" button
- Wait for success confirmation
- Order will be created with status "pending"

### Expected API Request Format

```json
{
  "supplier": "64abc123def456789...",
  "items": [
    {
      "product": "64xyz789abc123456...",
      "quantity": 10,
      "costPrice": 50.00
    }
  ],
  "expectedDeliveryDate": "2025-10-15",
  "paymentMethod": "cash",
  "notes": "Urgent delivery required"
}
```

### Backend Validation

The backend validates:
- ✅ Supplier must be a valid MongoDB ObjectId
- ✅ Items array must have at least 1 item
- ✅ Each item must have valid product ID, quantity (≥1), and cost price (≥0)
- ✅ Expected delivery date must be in the future (if provided)
- ✅ User must have `write_purchase_orders` permission

### Success Response

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "orderNumber": "PO-2025-001",
    "supplier": {...},
    "items": [...],
    "status": "pending",
    "totalAmount": 500.00,
    ...
  }
}
```

## 🐛 Common Issues & Solutions

### Issue 1: "Validation Error" on Submit
**Cause**: Missing required fields or empty items array
**Solution**: Ensure supplier is selected and at least one item is added

### Issue 2: DateTimePicker not showing
**Cause**: Package not installed
**Solution**: Run `npm install @react-native-community/datetimepicker` in mobile directory

### Issue 3: "Authentication failed"
**Cause**: Token expired or user not logged in
**Solution**: Re-login to get fresh token

### Issue 4: "Permission denied"
**Cause**: User doesn't have `write_purchase_orders` permission
**Solution**: Update user permissions in database or use admin account

### Issue 5: No suppliers/products showing
**Cause**: No data in database
**Solution**: Create suppliers and products first using respective forms

## 📱 Mobile App Features

### UI Improvements
- ✅ Searchable dropdowns for suppliers and products
- ✅ Native date picker with future date validation
- ✅ Item management with add/remove functionality
- ✅ Real-time total amount calculation
- ✅ Visual feedback for selected items
- ✅ Error handling and validation messages
- ✅ Loading states for async operations

### User Experience
- Clean, intuitive interface
- Easy product search
- Quick item addition
- Visual total calculation
- Smooth navigation flow

## 🔄 Next Steps After Creating Order

1. **View Order**: Navigate to Purchase Orders list to see created order
2. **Approve Order**: Admin/Manager can approve the order
3. **Receive Order**: Mark items as received to update inventory
4. **Track Inventory**: Check inventory movements in tracking screen

## 🚀 Future Enhancements (Optional)

- Barcode scanning for product selection
- Bulk item import from CSV
- Order templates for recurring purchases
- Supplier-specific price history
- Auto-suggest based on low stock items
- Order draft saving

