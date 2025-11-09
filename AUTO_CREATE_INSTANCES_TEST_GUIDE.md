# Auto-Create Property Instances - Testing Guide

## Overview

This guide provides step-by-step testing procedures to verify that property instances are automatically created during timeline generation, ensuring the affordability calculator never falls back to the 30% rule.

## Pre-Testing Setup

### 1. Enable Debug Mode (Optional)

To see detailed logs during testing, you can temporarily enable debug mode:

```typescript
// In src/hooks/useAffordabilityCalculator.ts (Line 105)
const DEBUG_MODE = true; // Change from false to true
```

This will show detailed console logs for:
- Available funds breakdown
- Cashflow calculations
- Serviceability tests
- Property instance lookups

### 2. Clear Existing Data

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Clear all existing client data (optional, for fresh start)
4. Reload the page

## Test Suite

---

## Test 1: Fresh Property Auto-Creation

**Objective**: Verify that instances are automatically created when properties are added to the timeline without opening modals.

### Steps

1. **Create a new scenario** or clear existing selections
2. **Select properties** (e.g., 3x Units/Apartments)
3. **Open browser console** (F12)
4. **Generate timeline** by clicking "Generate Timeline" or letting it auto-generate
5. **DO NOT** open any property detail modals

### Expected Results

✅ **Timeline generates successfully** with all properties showing purchase periods

✅ **Detailed cashflow calculations used** (not 30% rule fallback):
   - Check console logs - should show detailed expense breakdowns
   - Rental income, loan interest, and expenses should be itemized

✅ **Property instances created in context**:
   ```javascript
   // In console, check:
   // Open React DevTools → Components → PropertyInstanceProvider
   // Should see instances object with entries like:
   // { "property_type_id_instance_0": { ...39 fields... } }
   ```

✅ **No "fallback" code executed** - check console for any warnings

### Validation Queries (Console)

```javascript
// Check if instances exist
// In React DevTools, inspect PropertyInstanceProvider state
// Or add a temporary console.log in the code
```

---

## Test 2: Multiple Property Types

**Objective**: Verify that different property types get correct defaults.

### Steps

1. **Select a mix of property types**:
   - 2x Units/Apartments
   - 1x Houses (Regional VIC)
   - 1x Duplex (QLD)

2. **Generate timeline**

3. **Inspect each property instance** (via DevTools or by opening modals)

### Expected Results

✅ **Units/Apartments** have:
   - Property Management: ~6.6%
   - Strata: ~$2,700/year
   - Maintenance: ~$1,750/year

✅ **Houses** have:
   - Different strata/maintenance rates
   - State-specific defaults (VIC)

✅ **Duplexes** have:
   - Appropriate QLD-specific defaults
   - Correct expense profiles

---

## Test 3: Verify No 30% Rule Fallback

**Objective**: Confirm that the old 30% expense rule is never used.

### Steps

1. **Enable debug mode** (see Pre-Testing Setup)

2. **Add a search in the code** for "Fallback to old calculation":
   ```typescript
   // In src/hooks/useAffordabilityCalculator.ts
   // Add a console.warn before the fallback code:
   } else {
     console.warn('⚠️ FALLBACK TRIGGERED - Instance not found:', purchase.instanceId);
     // Fallback to old calculation if instance not found
   ```

3. **Generate timeline** with fresh properties

4. **Check console** for the warning message

### Expected Results

✅ **No warnings** appear in console (fallback never triggered)

✅ **All cashflow calculations** show detailed breakdowns:
   - Rental income (adjusted for portfolio size)
   - Loan interest
   - Operating expenses (itemized)
   - Non-deductible expenses

✅ **Timeline cashflow numbers** match detailed calculations (not 30% approximation)

---

## Test 4: Customization Preservation

**Objective**: Ensure that auto-created instances can still be customized and changes persist.

### Steps

1. **Generate timeline** with fresh properties (instances auto-created)

2. **Open property detail modal** for one property

3. **Customize values**:
   - Change rent per week (e.g., from $480 to $550)
   - Modify building insurance (e.g., from $350 to $500)
   - Adjust property management rate (e.g., from 6.6% to 7.0%)

4. **Save changes** and close modal

5. **Regenerate timeline** (e.g., by changing another property selection)

6. **Re-open the same property modal**

### Expected Results

✅ **Custom values are preserved**:
   - Rent: $550/week (custom value)
   - Building insurance: $500/year (custom value)
   - Property management: 7.0% (custom value)

✅ **Timeline calculations use custom values**:
   - Cashflow reflects the updated rent and expenses
   - Purchase timing may change due to different cashflow

✅ **Other auto-created properties unaffected** by customization

---

## Test 5: Timeline Recalculation Triggers Instance Creation

**Objective**: Verify that instances are created during timeline recalculation, not just initial generation.

### Steps

1. **Start with empty timeline**

2. **Add property** (e.g., 1x Units/Apartments)

3. **Observe timeline generation** (instance should auto-create)

4. **Add another property** (e.g., 1x Houses)

5. **Timeline should recalculate** automatically

### Expected Results

✅ **Both properties have instances** after recalculation

✅ **Instance IDs are stable**:
   - First property: `property_id_instance_0`
   - Second property: `property_id_instance_1`

✅ **Changing property order** doesn't break instance references

---

## Test 6: Load Saved Scenario

**Objective**: Ensure auto-creation works with saved/loaded scenarios.

### Steps

1. **Create a scenario** with properties selected

2. **Save the scenario** (if save feature exists)

3. **Reload the page** or switch to another scenario

4. **Load the saved scenario**

### Expected Results

✅ **Timeline regenerates** with all properties

✅ **Instances are recreated** if they don't exist in saved data

✅ **Customized instances** (if any) are restored from saved data

✅ **No calculation errors** or fallbacks occur

---

## Test 7: Performance Check

**Objective**: Verify that auto-creation doesn't significantly impact performance.

### Steps

1. **Select many properties** (e.g., 10-15 properties)

2. **Open browser Performance tab** (DevTools)

3. **Start recording** performance

4. **Generate timeline**

5. **Stop recording** and analyze

### Expected Results

✅ **Timeline generates in reasonable time** (< 2 seconds)

✅ **No excessive re-renders** caused by instance creation

✅ **Memory usage remains stable** (no leaks)

---

## Debugging Tips

### If Instances Are Not Being Created

1. **Check the instanceId format**:
   ```javascript
   // Should be: "propertyId_instance_0", "propertyId_instance_1", etc.
   console.log('instanceId:', property.instanceId);
   ```

2. **Verify property.title matches property type**:
   ```javascript
   // Should match a key in property-defaults.json
   console.log('propertyType:', property.title);
   ```

3. **Check createInstance is being called**:
   ```javascript
   // Add log in PropertyInstanceContext.tsx
   const createInstance = useCallback((instanceId: string, propertyType: string, period: number) => {
     console.log('✅ Creating instance:', instanceId, propertyType, period);
     // ...
   });
   ```

### If Fallback Is Still Triggered

1. **Check property instance lookup**:
   ```javascript
   // Add log before fallback
   const propertyInstance = getInstance(purchase.instanceId);
   console.log('Instance lookup:', purchase.instanceId, propertyInstance ? '✅ Found' : '❌ Not found');
   ```

2. **Verify instanceId consistency**:
   - Instance ID used in creation should match ID used in lookup
   - Check for typos or format mismatches

3. **Ensure instance creation completed**:
   - React state updates are async
   - Second `getInstance()` call after `createInstance()` should find it

---

## Verification Checklist

After completing all tests, verify:

- [ ] ✅ Fresh properties auto-create instances
- [ ] ✅ Detailed cashflow (39 inputs) always used
- [ ] ✅ No 30% rule fallback triggered
- [ ] ✅ Multiple property types get correct defaults
- [ ] ✅ Customizations work and persist
- [ ] ✅ Timeline recalculation creates instances
- [ ] ✅ Performance remains acceptable
- [ ] ✅ No console errors or warnings

---

## Known Limitations

### Fallback Still Exists (By Design)

The fallback code to the 30% rule **remains in the codebase** as a safety net, but should **rarely/never be executed** with auto-creation enabled.

**Why keep it?**
- Defensive programming for edge cases
- Backwards compatibility
- Graceful degradation if instance creation fails

### When Fallback Might Still Trigger

1. **Race conditions** (very rare with current implementation)
2. **Manual instance deletion** (if user somehow deletes instance)
3. **Invalid property type** (property type not found in defaults)

---

## Success Criteria

The implementation is successful if:

1. ✅ **Zero fallbacks** occur during normal operation
2. ✅ **All properties** use detailed 39-input calculations
3. ✅ **User experience** unchanged (or improved)
4. ✅ **Performance** remains acceptable
5. ✅ **Customization** works as before

---

## Reporting Issues

If you find issues during testing:

1. **Document the steps** to reproduce
2. **Include console logs** (errors, warnings, debug output)
3. **Screenshot the timeline** showing the issue
4. **Note the property types** and configurations used
5. **Check React DevTools** for instance state

---

## Next Steps After Testing

Once testing is complete and successful:

1. **Disable debug mode** (set `DEBUG_MODE = false`)
2. **Remove temporary console.logs** added for debugging
3. **Consider adding automated tests** for instance creation
4. **Update user documentation** (if needed)
5. **Monitor production** for any unexpected fallbacks

---

**Status**: 📋 **Ready for Testing**

**Estimated Testing Time**: 30-45 minutes for complete test suite

