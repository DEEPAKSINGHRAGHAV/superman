# Search Functionality - Testing Guide

## Quick Test Checklist

### Product List Screen

#### Basic Search
- [ ] Open Products screen
- [ ] Type "coca" in search box
- [ ] Wait 500ms - verify products with "coca" appear
- [ ] Type more characters "cola"
- [ ] Verify search is debounced (waits for you to stop typing)
- [ ] Clear search using X button
- [ ] Verify all products return immediately

#### Search + Category Filter
- [ ] Search for "drink"
- [ ] Select "Beverages" category
- [ ] Verify results show drinks in beverages category only
- [ ] Clear filters button should appear
- [ ] Click clear filters
- [ ] Verify all products return

#### Edge Cases
- [ ] Type in search box and immediately navigate away
- [ ] Return to products - verify no crash or memory leak
- [ ] Type very fast in search box
- [ ] Verify only one API call after you stop typing
- [ ] Search with no results
- [ ] Verify empty state shows with clear button

### Supplier List Screen

#### Basic Search
- [ ] Open Suppliers screen
- [ ] Type supplier name in search box
- [ ] Wait 500ms - verify matching suppliers appear
- [ ] Clear search
- [ ] Verify all suppliers return immediately

#### Search Accuracy
- [ ] Search by supplier name
- [ ] Search by supplier code (if applicable)
- [ ] Search by email
- [ ] Verify all search methods work

### Purchase Order List Screen

#### Basic Search
- [ ] Open Purchase Orders screen
- [ ] Type order number in search box
- [ ] Wait 500ms - verify matching orders appear
- [ ] Clear search
- [ ] Verify all orders return immediately

#### Search + Status Filter
- [ ] Search for an order number
- [ ] Select "Pending" status filter
- [ ] Verify results show only pending orders matching search
- [ ] Clear all filters
- [ ] Verify all orders return

#### Combined Filters
- [ ] Search for order
- [ ] Change status filter multiple times
- [ ] Verify search persists across status changes
- [ ] Clear all filters at once
- [ ] Verify complete reset

## Performance Testing

### Debounce Verification
1. Open any list screen
2. Open browser DevTools Network tab (if testing web)
3. Or use React Native Debugger to monitor API calls
4. Type in search box character by character
5. **Expected**: Only ONE API call after 500ms of inactivity
6. **Fail**: Multiple API calls for each character

### Memory Leak Check
1. Open Products screen
2. Type in search box (creates timeout)
3. Navigate away BEFORE 500ms passes
4. Navigate back to Products
5. Repeat 10 times
6. **Expected**: No performance degradation
7. **Fail**: App becomes slow or crashes

### Race Condition Test
1. Open Products screen
2. Type search query quickly
3. Immediately change category filter
4. Immediately pull to refresh
5. **Expected**: Results show correct combination
6. **Fail**: Results show old/incorrect data

## Backend Testing

### Purchase Order Search
Test the new search functionality added to purchase orders:

#### Setup
```bash
# In backend directory
npm start
```

#### Test Cases

**Test 1: Search by Order Number**
```bash
# Create test order first
POST /api/v1/purchase-orders
{
  "orderNumber": "PO-2024-001",
  "supplier": "...",
  "items": [...]
}

# Search for it
GET /api/v1/purchase-orders?search=PO-2024
# Expected: Returns orders with matching order numbers
```

**Test 2: Search by Notes**
```bash
# Create order with notes
POST /api/v1/purchase-orders
{
  "orderNumber": "PO-2024-002",
  "notes": "Urgent delivery required",
  ...
}

# Search for it
GET /api/v1/purchase-orders?search=urgent
# Expected: Returns orders with matching notes
```

**Test 3: Case Insensitive Search**
```bash
GET /api/v1/purchase-orders?search=URGENT
GET /api/v1/purchase-orders?search=urgent
GET /api/v1/purchase-orders?search=Urgent
# Expected: All return same results
```

**Test 4: Combined Filters**
```bash
GET /api/v1/purchase-orders?search=urgent&status=pending
# Expected: Returns only pending orders matching "urgent"
```

## Common Issues & Solutions

### Issue 1: Search Not Working
**Symptoms**: Typing in search box doesn't filter results
**Check**:
1. Is backend server running?
2. Check browser console for API errors
3. Verify network connectivity
4. Check if search parameter is being sent in API call

### Issue 2: Search Too Slow
**Symptoms**: Results take long time to appear
**Check**:
1. Check debounce timeout (should be 500ms)
2. Verify database has indexes on searchable fields
3. Check network speed
4. Look for excessive API calls

### Issue 3: Clear Button Not Working
**Symptoms**: Clicking X doesn't clear search
**Check**:
1. Verify `onClear` prop is passed to SearchBar
2. Check if timeout is being cleared
3. Verify `loadProducts/loadSuppliers/loadOrders` is called with empty string

### Issue 4: Stale Results
**Symptoms**: Old search results still showing after clearing
**Check**:
1. Verify dependencies in `useCallback` include `searchQuery`
2. Check if `customSearchQuery` parameter is being used
3. Verify API is receiving correct parameters

### Issue 5: Memory Leak
**Symptoms**: App becomes slow after multiple searches
**Check**:
1. Verify cleanup effect exists for search timeout
2. Check React DevTools for component unmounting
3. Look for uncancelled promises or subscriptions

## Automated Testing (Future)

### Unit Tests
```typescript
describe('ProductListScreen Search', () => {
  it('should debounce search input', async () => {
    // Test debouncing logic
  });
  
  it('should clear search on X click', async () => {
    // Test clear functionality
  });
  
  it('should clean up timeout on unmount', async () => {
    // Test cleanup
  });
});
```

### Integration Tests
```typescript
describe('Search API Integration', () => {
  it('should search products by name', async () => {
    // Test product search
  });
  
  it('should combine search with filters', async () => {
    // Test combined filtering
  });
});
```

## Success Criteria

### Functional
- ✅ Search works on all list screens
- ✅ Debouncing prevents excessive API calls
- ✅ Clear button immediately resets results
- ✅ Combined filters work correctly
- ✅ No console errors during search

### Performance
- ✅ Search response time < 1 second
- ✅ Only 1 API call per search query
- ✅ No memory leaks after 100 searches
- ✅ No UI lag during typing

### UX
- ✅ Visual feedback during search
- ✅ Empty state shows for no results
- ✅ Clear action is immediate
- ✅ Results update smoothly
- ✅ No flickering or jumping

## Test Data Setup

### Products
Create products with different names for testing:
- "Coca Cola 500ml"
- "Pepsi 500ml"  
- "Mountain Dew 500ml"
- "Sprite 500ml"
- "Fanta Orange 500ml"

### Suppliers
- "ABC Beverages Ltd"
- "XYZ Trading Co"
- "Global Supplies Inc"

### Purchase Orders
- Order with number "PO-2024-001"
- Order with notes "Urgent delivery"
- Order with notes "Regular shipment"

## Reporting Issues

If you find issues during testing, report with:

1. **Screen**: Which screen (Products, Suppliers, Orders)
2. **Action**: What you did (typed search, clicked clear, etc.)
3. **Expected**: What should have happened
4. **Actual**: What actually happened
5. **Console Errors**: Any errors in console
6. **API Logs**: What API calls were made
7. **Reproducibility**: Can you reproduce it consistently?

Example:
```
Screen: Product List
Action: Searched for "coca" then immediately changed category
Expected: Results show coca products in selected category
Actual: Results show all products (search was ignored)
Console: No errors
API: Two API calls made, second one missing search parameter
Reproducibility: 100% - happens every time
```

## Sign-off Checklist

Before considering search functionality complete:

- [ ] All basic search tests pass
- [ ] All combined filter tests pass
- [ ] All edge case tests pass
- [ ] Performance tests pass
- [ ] No memory leaks detected
- [ ] Backend search endpoints working
- [ ] No console errors
- [ ] UX is smooth and responsive
- [ ] Documentation is complete
- [ ] Code is reviewed and merged

## Contact

For questions or issues with testing:
- Check `SEARCH_FUNCTIONALITY_FIXES.md` for implementation details
- Review code changes in the PR
- Ask the development team

