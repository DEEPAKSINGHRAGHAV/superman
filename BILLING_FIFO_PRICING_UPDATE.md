# Billing Screen FIFO Pricing Implementation

## Problem
Previously, the billing screen showed the **latest batch prices** (product's default cost/selling price) instead of the **actual FIFO prices** that would be used during the sale. This caused:
- ❌ Inaccurate profit calculations
- ❌ Misleading pricing information
- ❌ Discrepancy between displayed prices and actual sale prices

### Example of the Issue:
- **Old Batch:** Cost ₹20, Selling ₹25 (100 units available)
- **New Batch:** Cost ₹22, Selling ₹28 (150 units available)

**Before Fix:**
- Billing screen showed: Cost ₹22, Selling ₹28 (latest prices)
- Actual sale used: Cost ₹20, Selling ₹25 (FIFO - oldest first)
- Result: Wrong profit calculation!

## Solution Implemented
Updated the billing screen to fetch and display **actual FIFO prices** when adding products to cart.

### Changes Made

#### 1. Updated CartItem Interface
```typescript
interface CartItem {
    product: Product;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    costPrice: number; // ✅ NEW: Actual FIFO cost price
    isEditingPrice?: boolean;
    batchInfo?: {      // ✅ NEW: Batch information
        batchNumber: string;
        availableQuantity: number;
    };
}
```

#### 2. Modified addToCart Function
- Fetches batch information when adding product
- Extracts FIFO prices from the oldest batch
- Falls back to product prices if no batches exist

```typescript
const addToCart = async (product: Product) => {
    try {
        // Fetch batch information for accurate FIFO pricing
        const batchResponse = await apiService.getBatchesByProduct(product._id);
        
        if (batchResponse.success && batchResponse.data?.batches?.length > 0) {
            // Get oldest (FIFO) batch
            const oldestBatch = batchResponse.data.batches[0];
            unitPrice = oldestBatch.sellingPrice;
            costPrice = oldestBatch.costPrice;
            batchInfo = {
                batchNumber: oldestBatch.batchNumber,
                availableQuantity: oldestBatch.currentQuantity
            };
        }
    } catch (error) {
        // Fallback to product's default prices
        unitPrice = product.sellingPrice;
        costPrice = product.costPrice || 0;
    }
}
```

#### 3. Updated Price Display
- Shows FIFO cost price from cart item (not product)
- Displays "(FIFO)" indicator when batch info is available
- Shows batch number for transparency

```typescript
const renderCartItem = ({ item }: { item: CartItem }) => {
    const costPrice = item.costPrice; // ✅ Use FIFO cost price
    const profitPerUnit = item.unitPrice - costPrice;
    
    return (
        <Text>
            Cost: {formatCurrency(costPrice)} {item.batchInfo && '(FIFO)'}
        </Text>
        {item.batchInfo && (
            <Text>Batch: {item.batchInfo.batchNumber}</Text>
        )}
    );
};
```

#### 4. Updated Price Validation
When user edits selling price, validation uses FIFO cost price:

```typescript
const updateSellingPrice = (productId: string, newPrice: string) => {
    const itemCostPrice = item.costPrice; // ✅ FIFO cost price
    
    if (price < itemCostPrice) {
        Alert.alert('Invalid Price', 
            `Selling price cannot be less than FIFO cost price (₹${itemCostPrice})`
        );
    }
};
```

## Benefits

### ✅ Accurate Profit Calculation
- Shows real profit based on FIFO pricing
- No surprises during actual sale
- Profit margin reflects actual cost

### ✅ Transparent Pricing
- Users see exact prices that will be used
- Batch information displayed
- "(FIFO)" indicator for clarity

### ✅ Better Decision Making
- Cashiers see real margins
- Can adjust prices knowing true cost
- Prevents selling below cost

### ✅ Matches Backend Logic
- Billing preview matches actual sale
- FIFO logic consistent across system
- No discrepancies in reporting

## How It Works

### Scenario: Multiple Batches with Different Prices

**Product: Coca Cola 500ml**
- Batch 1 (Oct 1): 100 units @ Cost ₹20, Selling ₹25
- Batch 2 (Oct 10): 150 units @ Cost ₹22, Selling ₹28

### Flow:

1. **Scan Barcode or Add Product**
   - System fetches batch information
   - Finds oldest batch (Batch 1)
   
2. **Display in Cart**
   ```
   Coca Cola 500ml
   SKU: COKE-500ML • 8901234567890
   Cost: ₹20.00 (FIFO)
   Batch: BATCH241001001
   Selling Price: ₹25.00
   Profit: 20% profit
   ```

3. **If User Tries to Edit Price**
   - Validates against FIFO cost (₹20)
   - Prevents selling below ₹20
   - Shows accurate profit margin

4. **During Payment**
   - Profit shown: (₹25 - ₹20) × quantity
   - Matches backend sale calculation
   - Accurate revenue reporting

## Edge Cases Handled

### 1. No Batches Available
- Falls back to product's default prices
- No batch info displayed
- Works seamlessly

### 2. API Error Fetching Batches
- Gracefully handles errors
- Uses product prices as fallback
- Logs error for debugging

### 3. Multiple Items from Same Product
- First add: Fetches batch info
- Subsequent adds: Uses existing cart item prices
- Quantity updates maintain FIFO price

### 4. Price Editing
- Always validates against FIFO cost
- Prevents loss-making sales
- Clear error messages

## Testing Checklist

- [x] Add product with single batch - shows batch price
- [x] Add product with multiple batches - shows oldest batch price
- [x] Add product without batches - uses product price
- [x] Edit selling price above FIFO cost - allows
- [x] Edit selling price below FIFO cost - blocks with alert
- [x] Increase quantity - maintains FIFO price
- [x] Display batch number when available
- [x] Show "(FIFO)" indicator for batch items
- [x] Accurate profit calculation
- [x] Handle API errors gracefully

## User Experience

### Visual Indicators
- **"(FIFO)"** label next to cost price
- **Batch number** displayed below product info
- **Profit badge** shows accurate margin

### Information Hierarchy
```
Product Name
SKU • Barcode
Cost: ₹20.00 (FIFO)    [20% profit]
Batch: BATCH241001001
```

### Price Editing Flow
1. Tap on selling price
2. Input shows in edit mode
3. Enter new price
4. Validates against FIFO cost
5. Updates or shows error

## Files Modified
- `mobile/src/screens/BillingScreen.tsx`
  - Updated CartItem interface
  - Modified addToCart function
  - Updated renderCartItem function
  - Updated updateSellingPrice validation
  - Added batchInfoLabel style

## API Dependency
Uses existing endpoint:
```
GET /api/v1/batches/product/:productId
```
Returns batches in FIFO order (oldest first).

## Backward Compatibility
✅ Fully backward compatible:
- Works with products that have batches
- Works with products without batches
- Falls back gracefully on errors
- No breaking changes

## Future Enhancements
1. **Multi-Batch Sales Warning**
   - Alert when quantity spans multiple batches
   - Show breakdown of batches used

2. **Batch Selection**
   - Allow manual batch selection (override FIFO)
   - For special pricing needs

3. **Price History**
   - Show price trends for product
   - Historical batch prices

4. **Expiry Warnings**
   - Alert if FIFO batch is expiring soon
   - Suggest discounts for near-expiry items

## Conclusion
The billing screen now accurately reflects FIFO pricing, providing transparent and accurate cost/profit information. This ensures cashiers make informed decisions and eliminates discrepancies between displayed and actual sale prices.

**Key Achievement:** What you see in billing is exactly what happens in the sale! 🎉

