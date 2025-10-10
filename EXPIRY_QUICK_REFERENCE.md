# 🚀 Expiry Functionality - Quick Reference Card

## For Developers

### Run Expiry Check Manually
```bash
cd backend
npm run check-expired
```

### Setup Daily Cron Job
```bash
crontab -e
# Add: 0 1 * * * cd /path/to/backend && npm run check-expired >> /var/log/expiry.log 2>&1
```

### API Endpoints
```
GET  /api/batches/expiring?days=30          # Get expiring batches
POST /api/batches/check-expired             # Run expiry check
GET  /api/batches/expiry-stats              # Get statistics
GET  /api/inventory/expiring?daysAhead=30   # Get expiring products
```

### Key Files
- `backend/services/expiryCheckService.js` - Expiry automation logic
- `backend/routes/batchRoutes.js` - Expiry API endpoints
- `backend/scripts/checkExpiredBatches.js` - Manual script
- `mobile/src/screens/BillingScreen.tsx` - Expiry checks in POS

---

## For Managers

### Check Expiry Status
1. Open admin panel
2. Navigate to Inventory → Batches
3. Filter by "Expiring Soon"
4. Review value at risk

### Trigger Manual Check
- Call API: `POST /api/batches/check-expired`
- Or ask developer to run: `npm run check-expired`

### What Happens Automatically
- Daily at 1 AM: System finds expired batches
- Marks them as 'expired'
- Removes from available stock
- Creates audit log
- Sends notifications

---

## For Cashiers (Mobile App)

### When Adding Products to Cart

**✅ Normal Product:**
- Adds to cart immediately
- Shows batch info

**⚠️ Expiring Soon (≤3 days):**
- Shows warning: "Expires in X days"
- Options: Cancel or "Add Anyway"
- Can proceed after acknowledgment

**❌ Expired Product:**
- Blocks adding to cart
- Shows: "All batches expired"
- Contact manager for resolution

### What to Do If Product Can't Be Added
1. Check expiry warning message
2. If expired: Don't sell, inform manager
3. If expiring soon: Can proceed with customer awareness
4. Create new batch if needed

---

## Validation Rules

### Creating New Batches
- ✅ Expiry date must be in future
- ✅ Manufacture date must be in past
- ✅ Manufacture date must be before expiry date
- ⚠️ System will reject invalid dates

---

## Troubleshooting

### "All batches expired" Error
**Solution:** Run expiry check, then create new batch
```bash
npm run check-expired
```

### Expired batches still showing as active
**Solution:** Run manual expiry check
```bash
cd backend && npm run check-expired
```

### Wrong expiry dates displaying
**Solution:** Check server timezone, verify database dates

---

## Contact

**Technical Issues:** Contact development team  
**Process Questions:** Contact inventory manager  
**Urgent:** Check documentation in `EXPIRY_FUNCTIONALITY_FIXES.md`

---

**Last Updated:** October 10, 2025  
**Version:** 1.0

