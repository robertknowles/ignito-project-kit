# Quick Reference: Data Persistence & Debugging

## 🚀 Quick Start

### Test All Fields
```javascript
// 1. Open browser console (F12)
// 2. Copy/paste test-all-39-fields.js
// 3. Run:
testAllFields()
```

### Check Console Logs
```
✓ = Success
✗ = Error
⚠ = Warning
```

---

## ✅ All 39 Fields

### Property Overview (6)
```
state, purchasePrice, valuationAtPurchase,
rentPerWeek, growthAssumption, minimumYield
```

### Contract & Loan (8)
```
daysToUnconditional, daysForSettlement, lvr,
lmiWaiver, loanProduct, interestRate,
loanTerm, loanOffsetAccount
```

### Purchase Costs (12)
```
engagementFee, conditionalHoldingDeposit,
buildingInsuranceUpfront, buildingPestInspection,
plumbingElectricalInspections, independentValuation,
unconditionalHoldingDeposit, mortgageFees,
conveyancing, ratesAdjustment,
maintenanceAllowancePostSettlement, stampDutyOverride
```

### Cashflow (8)
```
vacancyRate, propertyManagementPercent,
buildingInsuranceAnnual, councilRatesWater,
strata, maintenanceAllowanceAnnual,
landTaxOverride, potentialDeductionsRebates
```

---

## 🔍 What to Look For

### ✅ Success Indicators
- Fields are editable
- Save button works
- Toast: "Property Saved"
- Console: `✓ All 39 fields present`
- Data persists after refresh

### ❌ Problem Indicators
- Fields grayed out (when not saving)
- No toast after save
- Console errors (✗)
- Data lost after refresh
- UI freezing/lag

---

## 🐛 Common Issues

### Issue: Fields Not Editable
**Check:** Are you currently saving?  
**Fix:** Close and reopen modal

### Issue: Data Not Persisting
**Check:** Did you click main "Save" button?  
**Fix:** Save in modal, then click main Save

### Issue: Console Errors
**Check:** What's the error message?  
**Fix:** See `DATA_PERSISTENCE_DEBUGGING_GUIDE.md`

### Issue: UI Freezing
**Check:** React DevTools for re-renders  
**Fix:** Refresh page, check console

---

## 📝 Testing Workflow

1. Open property details modal
2. Edit some fields (5-10)
3. Check for "Unsaved changes" badge
4. Click "Save Changes"
5. See "Saving..." spinner
6. See success toast
7. Click main "Save" button
8. Refresh page (F5)
9. Reopen modal
10. Verify changes persisted

**Expected Time:** < 1 minute per property

---

## 🎯 Key Features

- ✅ All 39 fields working
- ✅ Comprehensive logging
- ✅ Loading states during save
- ✅ Error handling with toasts
- ✅ Race condition prevention
- ✅ Unsaved changes indicator
- ✅ Confirmation on close
- ✅ Test script included

---

## 📂 Key Files

```
src/components/PropertyDetailModal.tsx     - Main modal
src/contexts/PropertyInstanceContext.tsx   - Instance storage
src/contexts/ScenarioSaveContext.tsx       - DB persistence
test-all-39-fields.js                      - Test script
DATA_PERSISTENCE_DEBUGGING_GUIDE.md        - Full guide
```

---

## 🚨 Emergency Checklist

If something breaks:

- [ ] Check console for errors (✗)
- [ ] Run test script: `testAllFields()`
- [ ] Refresh page (F5)
- [ ] Clear browser cache
- [ ] Check Supabase connection
- [ ] Review `DATA_PERSISTENCE_DEBUGGING_GUIDE.md`

---

## 💡 Pro Tips

1. **Always check console** - Logs show exactly what's happening
2. **Use test script** - Fastest way to verify all fields
3. **Watch for badge** - "Unsaved changes" shows when data modified
4. **Save early, save often** - Click Save after each property edit
5. **Check database** - Supabase dashboard shows actual saved data

---

## 📊 Success Metrics

Your implementation is working if:

- ✅ Test script: "ALL TESTS PASSED"
- ✅ Console: No ✗ errors
- ✅ Toast: "Property Saved" appears
- ✅ Data persists after refresh
- ✅ All 39 fields editable

---

## 🎓 Learn More

- **Full Guide:** `DATA_PERSISTENCE_DEBUGGING_GUIDE.md`
- **Implementation Details:** `DATA_PERSISTENCE_IMPLEMENTATION_COMPLETE.md`
- **Test Script:** `test-all-39-fields.js`

---

**Quick Reference v1.0**  
Last Updated: November 15, 2025

