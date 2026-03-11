# Property Instance Recalculation - Test Guide

## Quick Verification Steps

This guide helps you verify that property instance changes now trigger immediate timeline recalculation.

### Test 1: Purchase Price Change

1. **Setup:**
   - Open the app and ensure you're on the timeline view
   - Add a property to period 1 (2025) with a purchase price of $350,000
   - Note how many additional properties appear on the timeline

2. **Action:**
   - Click on the property card in period 1
   - Change the purchase price from $350,000 to $900,000
   - Save/close the modal

3. **Expected Result:**
   - ✅ Timeline immediately updates (no page refresh needed)
   - ✅ Later properties become unaffordable or shift to later years
   - ✅ Summary bar updates to reflect new values
   - ✅ Deposit pool changes reflected in calculations

### Test 2: Multiple Property Cascade

1. **Setup:**
   - Add 3 properties to the timeline:
     - Period 1: $400k
     - Period 2: $500k  
     - Period 3: $600k

2. **Action:**
   - Edit the first property, change price to $800k

3. **Expected Result:**
   - ✅ Property 2 and 3 positions/affordability update immediately
   - ✅ May shift to later periods due to reduced deposit pool
   - ✅ Equity release calculations update
   - ✅ Cashflow projections recalculate

### Test 3: Rental Income Change

1. **Setup:**
   - Add an investment property with rental income to period 1

2. **Action:**
   - Edit the property instance
   - Change the rental income amount
   - Save changes

3. **Expected Result:**
   - ✅ Timeline recalculates immediately
   - ✅ Later properties show updated affordability based on new cashflow
   - ✅ Summary bar reflects new rental income totals

### Test 4: Equity Release Toggle

1. **Setup:**
   - Add a property with equity release enabled

2. **Action:**
   - Edit the property instance
   - Toggle equity release on/off
   - Save changes

3. **Expected Result:**
   - ✅ Timeline immediately updates
   - ✅ Later properties show different affordability
   - ✅ Deposit pool calculations reflect equity availability

## What to Look For

### ✅ Success Indicators
- Changes apply instantly (within ~100ms due to debounce)
- No need to refresh the page
- All dependent calculations update together
- Summary bar stays in sync with timeline
- No console errors

### ❌ Failure Indicators
- Timeline stays frozen after edits
- Need to refresh page to see changes
- Summary bar shows old values
- Console errors about state updates
- Properties don't reposition after affordability changes

## Technical Validation

If you want to verify the fix technically:

1. Open browser DevTools
2. Search for "CRITICAL: Trigger recalculation" in the Sources tab
3. Find `useAffordabilityCalculator.ts` line 1247
4. Set a breakpoint on line 1247
5. Edit a property instance
6. Verify the breakpoint hits (useMemo dependency array is being evaluated)

## Performance Check

The fix should NOT cause performance issues:

- ✅ Edits feel responsive (debounced to ~100ms)
- ✅ No lag when typing in input fields
- ✅ Smooth updates, no flickering
- ✅ Works well with multiple properties

## Common Issues

### Issue: Changes don't update immediately
**Cause:** May be due to modal not calling `updateInstance` properly  
**Check:** Verify the modal's save handler calls the update function

### Issue: Timeline updates but summary bar doesn't
**Cause:** Separate dependency issue in SummaryBar component  
**Check:** Verify SummaryBar dependencies include latest calculations

### Issue: Console warnings about dependencies
**Cause:** ESLint exhaustive-deps rule  
**Resolution:** The `instances` dependency is intentionally added and correct

## Related Documentation

- `PROPERTY_INSTANCE_RECALCULATION_FIX.md` - Implementation details
- `COMPLETE_SYSTEM_LOGIC_GUIDE.md` - Overall system architecture
- `useAffordabilityCalculator.ts` line 1247 - The actual fix

## Summary

The fix ensures that **any property instance data change triggers immediate recalculation** of the entire timeline. This creates a responsive, real-time editing experience where users see the impact of their changes instantly.

