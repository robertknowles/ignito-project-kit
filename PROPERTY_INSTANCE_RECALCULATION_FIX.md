# Property Instance Changes Now Trigger Timeline Recalculation - FIXED ✅

**Status:** COMPLETE  
**Date:** November 18, 2025  
**File Modified:** `src/hooks/useAffordabilityCalculator.ts`

## Problem Solved

Previously, when you edited property instance data (e.g., changed purchase price from $350k to $900k), the timeline wouldn't update because:

1. The `calculateTimelineProperties` useMemo had `getInstance` in its dependency array
2. `getInstance` is just a function reference that doesn't change when data changes
3. When `instances` state changed, `getInstance` reference stayed the same
4. Therefore the memoized calculation never reran
5. Timeline stayed frozen with old data

## The Fix

Added `instances` to the dependency array on **line 1247**:

```typescript
}, [
  selectionsHash,
  propertyTypes.length,
  profile.timelineYears,
  profile.borrowingCapacity,
  profile.depositPool,
  profile.annualSavings,
  calculatedValues.availableDeposit,
  globalFactors.interestRate,
  getPropertyData,
  propertyAssumptions,
  pauseBlocks,
  timelineLoanTypes,
  getInstance,
  instances, // ✅ FIXED: Actual data that changes when properties are edited
]);
```

## Why This Works

- `instances` is the state object from `PropertyInstanceContext`
- When you call `updateInstance()`, it creates a new `instances` object
- Adding `instances` to the dependency array makes `useMemo` detect the change
- Timeline recalculates with new property data
- UI updates immediately to reflect changes

## Performance Impact

This causes recalculation whenever ANY property instance changes. **This is correct behavior** because:

- Changing one property's price affects affordability for all subsequent properties
- It impacts equity calculations, cashflow, and deposit pool availability
- The existing debounce logic (lines 1411-1419) already handles rapid updates efficiently

## Testing Verification

To verify the fix works:

1. ✅ Add a property to the timeline (e.g., $350k property in 2025)
2. ✅ Note the timeline shows subsequent properties
3. ✅ Edit the first property's price to $900k
4. ✅ Verify the timeline IMMEDIATELY updates
5. ✅ Later properties should become unaffordable or shift to later years
6. ✅ Summary bar should also update with new values

## Technical Details

### Location
- **File:** `src/hooks/useAffordabilityCalculator.ts`
- **Function:** `calculateTimelineProperties` useMemo hook
- **Lines:** 773-1249
- **Fix Applied:** Line 1247

### Before (Broken)
```typescript
getInstance, // ❌ Function reference doesn't change
// Missing instances dependency
]);
```

### After (Fixed)
```typescript
getInstance, // Keep getInstance as it depends on instances state
instances, // CRITICAL: Trigger recalculation when property instances change
]);
```

## Related Systems

This fix ensures proper updates across:
- Timeline visualization
- Property cards
- Summary bar
- Affordability calculations
- Equity release tracking
- Cashflow projections

## Impact

**High Priority Fix** - This was a critical bug that made property editing appear broken. Users would change values but see no response from the system, creating a very poor user experience.

Now property instance changes propagate immediately through the entire affordability calculation engine.

