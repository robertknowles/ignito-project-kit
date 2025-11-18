# Fix: Display "Not Feasible" Message Instead of "Infinity"

## Summary

Successfully replaced confusing "Year: Infinity" displays with clear "Cannot afford within timeline" messages for properties that cannot be afforded within the timeline period.

## Problem

When a property could not be afforded within the timeline period, the system correctly set `affordableYear = Infinity` in the calculator, but this was displayed to users as "Year: Infinity" which was confusing and not user-friendly.

## Solution

### 1. **Updated PurchaseEventCard.tsx**

#### Changes Made:
- ✅ Added check for `Infinity` before rounding the year
- ✅ Conditional rendering to display clear message when year is Infinity
- ✅ Uses red text to indicate the property cannot be afforded

**Code Changes:**

```typescript
// Before:
const year = Math.floor(property?.affordableYear || yearData.year);

// After:
const affordableYear = property?.affordableYear || yearData.year;
const year = affordableYear === Infinity ? Infinity : Math.floor(affordableYear);
```

**Display Logic:**

```typescript
{year === Infinity ? (
  <span className="text-red-600 font-medium">Cannot afford within timeline</span>
) : (
  <span className="text-gray-600">Year: {year}</span>
)}
```

### 2. **Updated InvestmentTimeline.tsx**

#### Changes Made:
- ✅ Filter out properties with `Infinity` affordableYear from main timeline
- ✅ Display unaffordable properties in a separate section at the end
- ✅ Added explanatory text about why properties can't be afforded
- ✅ Provide actionable suggestions to users

**Timeline Filtering:**

```typescript
// Filter out Infinity properties from the main sorted timeline
const sortedProperties = [...timelineProperties]
  .filter((p) => p.affordableYear !== Infinity)
  .sort((a, b) => a.affordableYear - b.affordableYear);
```

**Unaffordable Properties Section:**

Added a new section that displays:
- Properties that cannot be afforded (with red border)
- Each property shown in a PurchaseEventCard with "Cannot afford within timeline" message
- Explanatory text box with:
  - Why the property can't be afforded
  - Suggestions to fix the issue:
    - Extend timeline period
    - Increase deposit pool or annual savings
    - Select lower-priced properties
    - Improve borrowing capacity

**Visual Design:**

```typescript
<div className="mt-8 border-t-2 border-red-200 pt-6">
  <h4 className="text-sm font-medium text-red-600 mb-4">
    Properties That Cannot Be Afforded Within Timeline
  </h4>
  {/* Property cards */}
  <div className="mt-4 text-sm text-gray-600 bg-red-50 p-4 rounded-md">
    {/* Explanation and suggestions */}
  </div>
</div>
```

### 3. **Updated useTimelineData Hook**

#### Changes Made:
- ✅ Filter out Infinity properties when calculating purchase years
- ✅ Prevent Infinity from affecting progress bar and year circles

**Code Changes:**

```typescript
// Filter out properties with Infinity affordableYear
const affordableProperties = timelineProperties.filter(p => p.affordableYear !== Infinity);

// Use filtered list for calculations
const latestPurchaseYear = affordableProperties.length > 0
  ? Math.max(...affordableProperties.map(p => Math.round(p.affordableYear)))
  : startYear;

const purchaseYears = affordableProperties.length > 0
  ? [...new Set(affordableProperties.map(p => Math.round(p.affordableYear)))]
  : [];
```

### 4. **Updated fullYearlyBreakdown Calculation**

#### Changes Made:
- ✅ Filter out Infinity properties when creating year-to-property map

**Code Changes:**

```typescript
timelineProperties
  .filter(prop => prop.affordableYear !== Infinity)
  .forEach(prop => {
    const roundedYear = Math.round(prop.affordableYear);
    // ... map logic
  });
```

### 5. **Updated SummaryBar.tsx**

#### Changes Made:
- ✅ Added additional safety check to filter out Infinity from feasible properties

**Code Changes:**

```typescript
const feasibleProperties = timelineProperties.filter(
  p => p.status === 'feasible' && p.affordableYear !== Infinity
)
```

## Expected Outcome

✅ **Properties that cannot be afforded now show:**
- "Cannot afford within timeline" in red text instead of "Year: Infinity"
- Displayed in a separate section at the end of the timeline
- Clear explanation of why they can't be afforded
- Actionable suggestions to resolve the issue

✅ **Timeline remains clean and understandable:**
- No Infinity values displayed anywhere
- Progress bar and year circles only show affordable properties
- Main timeline only shows properties that can actually be purchased

✅ **User experience improved:**
- Users can clearly see which properties don't fit in their plan
- Understand why they can't afford them
- Know what actions to take to make them affordable

## Files Modified

1. `src/components/PurchaseEventCard.tsx`
2. `src/components/InvestmentTimeline.tsx`
3. `src/components/SummaryBar.tsx`

## Testing

To test the changes:

1. **Create a scenario where a property cannot be afforded:**
   - Select multiple expensive properties
   - Set a low deposit pool or borrowing capacity
   - Ensure at least one property gets `affordableYear = Infinity`

2. **Verify the display:**
   - Check that "Cannot afford within timeline" appears instead of "Year: Infinity"
   - Verify unaffordable properties section appears at the end
   - Confirm explanation text is helpful and actionable

3. **Verify timeline integrity:**
   - Check that affordable properties display correctly in the main timeline
   - Verify progress bar and year circles don't include Infinity values
   - Confirm no JavaScript errors in console

## Notes

- The affordability calculator (`useAffordabilityCalculator.ts`) correctly returns `Infinity` for unaffordable properties - this logic was NOT changed
- All comparison operations (`affordableYear < year`, `affordableYear <= year`) naturally handle Infinity correctly
- The changes are purely display-focused and don't affect the underlying calculation logic


