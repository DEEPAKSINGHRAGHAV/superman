# 🚀 Quick Test Guide for Expiry Fixes

## 1️⃣ Test Backend First (2 minutes)

```bash
cd backend

# Step 1: Test date handling and batch status
npm run test-expiry

# Step 2: Check and update any expired batches
npm run check-expired
```

**Expected Output:**
- ✅ Shows date handling is working
- ✅ Lists expired batches (if any)
- ✅ Lists expiring soon batches
- ✅ Shows statistics

---

## 2️⃣ Test Mobile App (5 minutes)

### Rebuild the app with fixes:

**For Android:**
```bash
cd mobile
npx react-native run-android
```

**For iOS:**
```bash
cd mobile
npx react-native run-ios
```

---

## 3️⃣ Create Test Batches

### Option A: Using Postman/API Tool

**Create Expired Batch:**
```http
POST http://localhost:8001/api/v1/batches
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "productId": "YOUR_PRODUCT_ID",
  "quantity": 10,
  "costPrice": 100,
  "sellingPrice": 150,
  "expiryDate": "2024-12-01",
  "manufactureDate": "2024-11-01"
}
```

**Create Expiring Soon Batch (2 days):**
```http
POST http://localhost:8001/api/v1/batches
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "productId": "YOUR_PRODUCT_ID",
  "quantity": 10,
  "costPrice": 100,
  "sellingPrice": 150,
  "expiryDate": "2025-01-12",  // Adjust to 2 days from today
  "manufactureDate": "2024-12-01"
}
```

**Create Valid Batch:**
```http
POST http://localhost:8001/api/v1/batches
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "productId": "YOUR_PRODUCT_ID",
  "quantity": 10,
  "costPrice": 100,
  "sellingPrice": 150,
  "expiryDate": "2025-12-31",
  "manufactureDate": "2025-01-01"
}
```

---

## 4️⃣ Test in Mobile App

### Test Case 1: Expired Batch ❌
1. Go to **Billing Screen**
2. Scan or search for product with expired batch
3. Try to add to cart
4. **✅ PASS:** Alert shows "All batches expired and cannot be sold"
5. **✅ PASS:** Product NOT added to cart

### Test Case 2: Expiring Soon Batch ⚠️
1. Go to **Billing Screen**
2. Scan or search for product with expiring batch (≤3 days)
3. Try to add to cart
4. **✅ PASS:** Alert shows "Warning: Expiring Soon" with days left
5. Click "**Cancel**"
6. **✅ PASS:** Product NOT added to cart
7. Try again and click "**Add Anyway**"
8. **✅ PASS:** Product IS added to cart

### Test Case 3: Valid Batch ✅
1. Go to **Billing Screen**
2. Scan or search for product with valid batch (>3 days)
3. Try to add to cart
4. **✅ PASS:** No warning
5. **✅ PASS:** Product added to cart immediately

---

## 5️⃣ What Fixed?

### ✅ Fixed Bug #1: Alert Now Actually Blocks
**Before:** Alert showed but item was added anyway  
**After:** Alert waits for user decision

### ✅ Fixed Bug #2: Date Comparison Works
**Before:** Dates with time caused wrong comparisons  
**After:** Dates compared at day-level (00:00:00)

### ✅ Fixed Bug #3: Backend Consistent
**Before:** Backend used different date logic  
**After:** Backend normalized dates like mobile app

---

## 6️⃣ Troubleshooting

### Issue: "All batches expired" but product is new
**Fix:** Run `npm run check-expired` to update batch statuses

### Issue: Warning not showing for expiring batch
**Check:**
1. Is expiry date within 3 days?
2. Is batch status 'active'?
3. Run `npm run test-expiry` to verify dates

### Issue: Can't add valid product
**Check:**
1. Does product have batches?
2. Run: `GET /api/batches/product/:productId`
3. Verify batches have `currentQuantity > 0`

---

## 🎯 Success Criteria

✅ All 3 test cases pass  
✅ No console errors in mobile app  
✅ No errors in backend logs  
✅ Backend test script runs successfully  
✅ Expired batches cannot be sold  
✅ Warnings show for expiring batches  
✅ Valid batches add without issues  

---

## 📞 If You Still Have Issues

1. **Check backend is running:** `http://localhost:8001/api/v1/health`
2. **Check mobile console:** `npx react-native log-android` or `log-ios`
3. **Verify token:** Make sure you're logged in
4. **Clear cache:** Delete app and reinstall

---

**Testing Time:** ~10 minutes  
**Expected Result:** ✅ All tests pass  
**Status:** Ready to test!

