# Property Price Timeline Bug Fix - Quick Reference

## What Was Fixed

**Bug:** Property price changes in the property details modal were not affecting timeline calculations.

**Root Cause:** Timeline calculations used `property.cost` (template default) instead of `propertyInstance.purchasePrice` (user-updated value).

**Solution:** Extract correct purchase price at the start of the calculation loop and use it consistently throughout.

## Code Changes Summary

### File Modified
- `src/hooks/useAffordabilityCalculator.ts`

### Key Change Pattern

**Before (lines 900-905):**
```typescript
allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
  const propertyWithInstance = { ...property, instanceId };
  const result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
  const loanAmount = property.cost - property.depositRequired; // ❌ Wrong
```

**After (lines 901-914):**
```typescript
allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
  // Get correct purchase price from instance
  const propertyInstance = getInstance(instanceId);
  const correctPurchasePrice = propertyInstance?.purchasePrice ?? property.cost;
  
  // Recalculate deposit and loan based on correct price
  const depositPercentage = property.depositRequired / property.cost;
  const correctDepositRequired = correctPurchasePrice * depositPercentage;
  const correctLoanAmount = correctPurchasePrice - correctDepositRequired;
  
  // Pass correct values to all calculations
  const propertyWithInstance = { ...property, instanceId, cost: correctPurchasePrice, depositRequired: correctDepositRequired };
  const result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
  const loanAmount = correctLoanAmount; // ✅ Correct
```

## All Updated Locations

1. **Line 902-914:** Extract correct purchase price and calculate correct deposit/loan
2. **Line 959:** Portfolio value calculation
3. **Line 1027-1041:** Acquisition costs calculation (LVR, stamp duty, LMI)
4. **Line 1104-1106:** Timeline property object (display values)
5. **Line 1139-1141:** Portfolio state before purchase
6. **Line 1168-1170:** Adding to purchase history (critical for subsequent calculations)
7. **Line 978:** Cashflow calculation loop

## Testing Quick Check

1. Add property (default price: $500,000)
2. Open property details modal
3. Change purchase price to $600,000
4. Close modal

**Expected Results:**
- ✅ Property card shows $600,000
- ✅ Deposit increased by 20% (e.g., $80k → $96k)
- ✅ Loan increased by 20% (e.g., $400k → $480k)
- ✅ Stamp duty recalculated for $600k
- ✅ LMI recalculated for new loan
- ✅ Purchase period may shift
- ✅ Subsequent properties adjust accordingly

## Key Technical Points

### Deposit Percentage Preservation
```typescript
const depositPercentage = property.depositRequired / property.cost;
const correctDepositRequired = correctPurchasePrice * depositPercentage;
```
If template has 20% deposit, updating price maintains that 20% ratio.

### Fallback to Template Default
```typescript
const correctPurchasePrice = propertyInstance?.purchasePrice ?? property.cost;
```
If instance doesn't exist or hasn't been customized, uses template default.

### Consistency Guarantee
All values calculated once at loop start (`correctPurchasePrice`, `correctDepositRequired`, `correctLoanAmount`) ensures consistency across:
- Affordability checks
- Portfolio calculations
- Acquisition costs
- Timeline display
- Purchase history

## Impact Areas

✅ **Fixed:**
- Timeline purchase periods
- Deposit and loan calculations
- Acquisition costs (stamp duty, LMI)
- Portfolio value tracking
- Equity release calculations
- Cashflow projections
- Available funds calculations

## Documents Created

1. **PROPERTY_PRICE_TIMELINE_BUG_FIX.md** - Complete technical documentation
2. **PROPERTY_PRICE_BUG_FIX_TEST_GUIDE.md** - Comprehensive testing guide
3. **PROPERTY_PRICE_BUG_FIX_QUICK_REFERENCE.md** - This document (quick summary)

## Related Systems

- **PropertyInstanceContext** - Stores user-customized property values
- **PropertyInstanceDetails** - Interface with `purchasePrice` field
- **Auto-create instances** - Ensures instances exist for calculations
- **Timeline recalculation** - Triggered on instance updates (500ms debounce)

## Verification

Run linter:
```bash
# No errors expected
```

Check console logs:
- Look for "Auto-creating X missing property instances"
- No errors about undefined properties
- Timeline recalculation triggers on price updates

## Notes for Future Development

- Property growth calculations still use `purchase.cost` (the actual purchase price stored in history) ✅
- This is correct - growth is calculated from the price paid
- All equity, cashflow, and value calculations compound from this base
- The fix ensures the "purchase price stored in history" IS the user's updated price, not the template default

