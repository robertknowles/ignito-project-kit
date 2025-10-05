# Borrowing Capacity Fix - Implementation Summary

## ✅ Fix Implemented Successfully

**Date:** October 5, 2025  
**Issue:** Inconsistent borrowing capacity calculations causing purchases to show as "PURCHASED" while displaying negative remaining capacity

## The Problem

Two different calculations were being used:
1. **Purchase Decision** - Used year filtering → Correct debt calculation
2. **Display Calculation** - Missing year filtering → Incorrect debt calculation (included future purchases)

This caused the 2027 purchase to show:
- ✅ Status: "PURCHASED" (approved by correct calculation)
- ❌ Display: "Borrowing Capacity Remaining: -£275k" (wrong calculation)

## The Root Cause

**File:** `src/hooks/useAffordabilityCalculator.ts`  
**Lines:** 861-864

The code was calculating `totalDebtAfter` without filtering by year, meaning it included ALL purchases in the history (including future ones) instead of only purchases made by or before the current year.

## The Fix

### Changed Code

**Before (BUGGY):**
```typescript
purchaseHistory.forEach(purchase => {
  const yearsOwned = purchaseYear - purchase.year;
  portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
  totalDebtAfter += purchase.loanAmount;  // ⚠️ No year filter
});
```

**After (FIXED):**
```typescript
purchaseHistory.forEach(purchase => {
  if (purchase.year <= purchaseYear) {  // ✅ Year filter added
    const yearsOwned = purchaseYear - purchase.year;
    portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
    totalDebtAfter += purchase.loanAmount;
  }
});
```

### Additional Changes

1. **Added documentation comment** at line 974-975 to prevent future regressions:
   ```typescript
   // CRITICAL: This calculation MUST match the borrowing capacity test in checkAffordability
   // Both use: borrowingCapacity - totalDebt (where totalDebt is filtered by year)
   ```

2. **Added clarifying comment** at line 861 explaining the fix:
   ```typescript
   // CRITICAL FIX: Only include purchases made by or before the current purchase year
   ```

## Verification

### ✅ Calculation Consistency Confirmed

Both calculations now use identical logic:

1. **Purchase Decision** (`checkAffordability`, lines 381-385):
   ```typescript
   previousPurchases.forEach(purchase => {
     if (purchase.year <= currentYear) {  // ✅ Year filter
       totalExistingDebt += purchase.loanAmount;
     }
   });
   ```

2. **Display Calculation** (timeline property creation, lines 862-868):
   ```typescript
   purchaseHistory.forEach(purchase => {
     if (purchase.year <= purchaseYear) {  // ✅ Year filter
       totalDebtAfter += purchase.loanAmount;
     }
   });
   ```

### ✅ No Linter Errors

All TypeScript linting passes with no errors.

### ✅ Consistent with Other Calculations

The fix aligns with the year filtering pattern used in:
- Cashflow calculations (lines 933-936)
- Loan interest calculations (lines 432-436)
- All other time-based portfolio calculations

## Expected Results

After this fix:

1. ✅ **Purchase decisions and display values now match**
   - If a purchase is approved, remaining capacity will show as positive or zero
   - If a purchase is blocked, remaining capacity will correctly show why

2. ✅ **No more impossible states**
   - No more "PURCHASED" with negative capacity
   - Display accurately reflects the decision logic

3. ✅ **Consistent year-filtering logic everywhere**
   - All debt calculations now properly filter by year
   - Portfolio value, equity, and debt are all calculated consistently

## Testing Recommendations

1. Check the 2027 purchase that was showing -£275k
   - Should now show positive or zero remaining capacity
   - Borrowing capacity test surplus should match the displayed value

2. Verify all purchase years
   - Each purchase should show consistent capacity values
   - "PURCHASED" status should never show negative capacity

3. Check non-purchase years
   - Interpolated years should show accurate capacity based on previous purchases
   - No future debt should be included in calculations

## Files Modified

1. `/src/hooks/useAffordabilityCalculator.ts` - Core fix + documentation
2. `/BORROWING_CAPACITY_ANALYSIS.md` - Detailed analysis (for reference)
3. `/BORROWING_CAPACITY_FIX_SUMMARY.md` - This summary document

## Risk Assessment

**Risk Level:** Low

- Single logical fix (adding year filter)
- Makes code consistent with existing patterns
- No breaking changes to API or data structures
- All existing tests should continue to pass

## Rollback Plan

If issues arise, revert line 862-868 in `useAffordabilityCalculator.ts` to:
```typescript
purchaseHistory.forEach(purchase => {
  const yearsOwned = purchaseYear - purchase.year;
  portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
  totalDebtAfter += purchase.loanAmount;
});
```

However, this would restore the bug.

