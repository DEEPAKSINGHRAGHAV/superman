# Expiry Date UI Improvements

## Overview

Enhanced the visual display of expiry dates in both purchase orders and batch history to make them more prominent and informative.

## Changes Made

### 1. Purchase Order Form - Item List Display

**File**: `mobile/src/screens/PurchaseOrderFormScreen.tsx`

**Before**: Expiry dates were shown as small text below item details
**After**: Expiry dates are now displayed as a prominent badge with:
- ⚠️ Warning-colored background (yellow/amber)
- Calendar icon for quick recognition
- Larger, bold text for better readability
- Clear border to stand out from other information

**Visual Design**:
```
┌─────────────────────────────────────────┐
│ Product Name                         ⓧ  │
│ Qty: 50 • Cost: ₹60.00 • Sell: ₹80.00  │
│ Total: ₹3000 • Margin: 33.3%            │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 📅  Expiry Date: Oct 15, 2025        ││
│ └──────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Features**:
- Only shows when item has an expiry date
- Warning color scheme to draw attention
- Properly formatted date display
- Icon for visual recognition

### 2. Batch History Screen - Expiry Information

**File**: `mobile/src/screens/BatchHistoryScreen.tsx`

**Before**: Expiry dates shown as simple text
**After**: Expiry dates displayed as intelligent badges with:
- Color-coded by urgency
- Two-line layout with status and date
- Days remaining/expired indicator
- Different icons based on status

**Visual Design**:
```
Active Batch:
┌──────────────────────────────────────┐
│ 🔵  EXPIRES                          │
│     Oct 15, 2025 (45 days left)     │
└──────────────────────────────────────┘

Expiring Soon (≤7 days):
┌──────────────────────────────────────┐
│ ⚠️  EXPIRES                          │
│     Oct 15, 2025 (3 days left)      │
└──────────────────────────────────────┘

Expired:
┌──────────────────────────────────────┐
│ 🔴  EXPIRED                          │
│     Oct 01, 2024 (Expired)          │
└──────────────────────────────────────┘
```

**Color Coding**:
- **Blue (Info)**: More than 7 days until expiry - normal status
- **Yellow/Orange (Warning)**: 7 days or less until expiry - needs attention
- **Red (Error)**: Already expired - critical alert

**Features**:
- Smart color coding based on urgency
- "EXPIRED" label in uppercase for expired items
- Days remaining calculation
- Different icons for expired vs. active items
- Prominent badge layout for easy scanning

## Style Properties

### Purchase Order Expiry Badge

```typescript
expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: warning[50],  // Light yellow/amber
    borderColor: warning[200],     // Darker yellow border
}

expiryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: warning[700],           // Dark yellow text
    flex: 1,
}
```

### Batch History Expiry Badge

```typescript
expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    // Dynamic colors based on status
}

expiryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
}

expiryDate: {
    fontSize: 13,
    fontWeight: '600',
}
```

## User Benefits

### 1. **Better Visibility**
- Expiry dates stand out immediately
- No need to scan through dense text to find expiry information
- Clear visual hierarchy

### 2. **Quick Status Recognition**
- Color coding enables instant status assessment
- Icons provide visual cues without reading
- "EXPIRED" label is unmistakable

### 3. **Urgency Awareness**
- Different colors for different urgency levels
- Days remaining prominently displayed
- Warning colors for items needing attention

### 4. **Professional Appearance**
- Polished, modern UI design
- Consistent styling across screens
- Better user experience

## Screenshots Location

Screenshots showing before/after comparisons should be added to:
- `docs/screenshots/purchase-order-expiry-badge.png`
- `docs/screenshots/batch-history-expiry-display.png`

## Testing Checklist

- [✓] Expiry badge appears when adding item with expiry date in PO form
- [✓] Expiry badge does NOT appear when item has no expiry date
- [✓] Date formatting is correct and readable
- [✓] Colors are appropriate for theme
- [✓] Batch history shows expiry with correct color coding
- [✓] Blue badge for items expiring in > 7 days
- [✓] Yellow badge for items expiring in ≤ 7 days
- [✓] Red badge for expired items
- [✓] Days calculation is accurate
- [✓] Icons display correctly
- [✓] Text is readable on all backgrounds
- [✓] Layout is responsive on different screen sizes

## Implementation Notes

### Date Format Function

The `formatDisplayDate` function handles both date formats:
```typescript
const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    
    // Handle both YYYY-MM-DD and ISO 8601 formats
    const date = dateString.includes('T') 
        ? new Date(dateString) 
        : new Date(dateString + 'T00:00:00');
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};
```

### Days Until Expiry Calculation

Calculated server-side in batch data:
```javascript
daysUntilExpiry: Math.ceil((new Date(batch.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
```

### Urgency Threshold

- **Normal**: > 7 days (blue/info)
- **Warning**: ≤ 7 days (yellow/warning)
- **Critical**: Expired (red/error)

The 7-day threshold can be configured in the future if needed.

## Future Enhancements

Potential improvements for consideration:

1. **Customizable Urgency Thresholds**
   - Allow users to set their own warning periods
   - Different thresholds for different product categories

2. **Expiry Notifications**
   - Push notifications for expiring items
   - Email alerts for critical expiries

3. **Batch Actions**
   - Quick discount expired/expiring items
   - Bulk status updates

4. **Analytics**
   - Expiry trends and patterns
   - Waste reduction metrics

5. **Sorting/Filtering**
   - Sort batches by expiry date
   - Filter by urgency level

## Related Files

- `mobile/src/screens/PurchaseOrderFormScreen.tsx` - Purchase order form
- `mobile/src/screens/BatchHistoryScreen.tsx` - Batch history display
- `mobile/src/screens/ExpiringProductsScreen.tsx` - Expiring products list
- `backend/services/batchService.js` - Batch data service

## Summary

These UI improvements make expiry dates:
- ✅ More visible and prominent
- ✅ Easier to understand at a glance
- ✅ Color-coded for urgency
- ✅ Consistently styled across screens
- ✅ Professional and modern looking

The enhanced visual design helps prevent inventory waste by ensuring expiry dates are noticed and acted upon promptly.

