# React setState Fix - Testing Guide

## Quick Summary
Fixed React errors caused by calling `setState` during render by moving `createInstance()` calls from `useMemo` to `useEffect`.

## Changes Made

### 1. useAffordabilityCalculator.ts
- ✅ Removed `createInstance` calls from useMemo (line 858-867)
- ✅ Updated useMemo dependencies to remove `createInstance` (line 1175-1191)
- ✅ Enhanced useEffect for auto-creating instances (line 1296-1327)

### 2. PurchaseEventCard.tsx
- ✅ Fixed `handleFieldUpdate` to handle async instance creation (line 69-83)

### 3. PropertyDetailModal.tsx
- ✅ Fixed instance creation to use template defaults immediately (line 108-123)

## Testing Steps

### Test 1: Console Errors
**Expected:** No React errors about setState during render

1. Open the app in browser
2. Open Developer Console (F12)
3. Check for any React warnings or errors
4. **PASS**: No warnings like "Cannot update a component while rendering a different component"

### Test 2: Property Instance Creation
**Expected:** Instances auto-create when needed

1. Start with a fresh session
2. Add 2-3 properties to the timeline
3. Check console logs - should see: `Auto-creating X missing property instances`
4. Each instance should show: `Creating instance: [id] for [type] at period [n]`
5. **PASS**: Instances are created automatically after render

### Test 3: Property Card Editing
**Expected:** Editing fields works correctly

1. Find a property card in the timeline
2. Click on an editable field (e.g., LVR, Interest Rate)
3. Change the value and press Enter
4. **PASS**: Value updates without errors
5. Refresh page - value should persist

### Test 4: Property Detail Modal
**Expected:** Modal opens with correct data

1. Click "Expand Full Details" on any property card
2. Modal should open immediately with template defaults or instance data
3. Edit any field and save
4. Close and reopen modal
5. **PASS**: Changes persist correctly

### Test 5: Multiple Properties of Same Type
**Expected:** Each instance maintains separate data

1. Add 3 properties of the same type (e.g., 3x Units/Apartments)
2. Each should have unique instanceId: `propertyId_instance_0`, `propertyId_instance_1`, `propertyId_instance_2`
3. Edit field in first property card
4. Check that other properties are not affected
5. **PASS**: Each instance is independent

### Test 6: Timeline Recalculation
**Expected:** Timeline recalculates without errors

1. Add/remove properties
2. Change client profile settings (deposit, borrowing capacity)
3. Timeline should update automatically
4. Check console - should not see infinite loops or excessive re-renders
5. **PASS**: Timeline updates smoothly

### Test 7: State Field Verification
**Expected:** All properties have valid state values

1. Add different property types to timeline
2. Open each property detail modal
3. Check that State field is populated (VIC, NSW, QLD, etc.)
4. **PASS**: No properties have undefined or missing state

### Test 8: Performance Check
**Expected:** No performance degradation

1. Add 10+ properties to timeline
2. Scroll through timeline
3. Edit properties
4. Monitor console for performance warnings
5. **PASS**: App remains responsive

## Console Log Examples

### Good Logs (Expected)
```
Auto-creating 3 missing property instances
Creating instance: units-apartments_instance_0 for Units / Apartments at period 1
Creating instance: houses_instance_0 for Houses at period 3
Creating instance: units-apartments_instance_1 for Units / Apartments at period 5
```

### Bad Logs (Should NOT See)
```
Warning: Cannot update a component while rendering a different component
Property instance not found for [id], will be created after render (repeated many times)
Maximum update depth exceeded
```

## Debugging Tips

### If You See React Errors:
1. Check browser console for full error stack trace
2. Look for which component is causing the issue
3. Verify that no `createInstance` calls are happening during render
4. Check that all useEffect dependencies are correct

### If Instances Aren't Creating:
1. Check that `calculateTimelineProperties` is running
2. Verify `instanceId` format is correct: `${propertyId}_instance_${index}`
3. Look for the "Auto-creating" log message in console
4. Check PropertyInstanceContext is properly providing `createInstance`

### If Values Aren't Persisting:
1. Check localStorage in DevTools (Application tab)
2. Look for keys starting with `property_instances_`
3. Verify client ID is correct
4. Check that `updateInstance` is being called after changes

## Success Criteria

✅ **All tests pass**
✅ **No React errors in console**
✅ **No infinite render loops**
✅ **Property instances create and update correctly**
✅ **App performance is good**
✅ **All state fields are populated**

## Known Issues (If Any)

None expected. If you encounter issues, they are likely unrelated to this fix.

## Rollback Instructions

If needed, the changes can be reverted using git:

```bash
git checkout HEAD -- src/hooks/useAffordabilityCalculator.ts
git checkout HEAD -- src/components/PurchaseEventCard.tsx
git checkout HEAD -- src/components/PropertyDetailModal.tsx
```

However, this will bring back the React setState errors.


