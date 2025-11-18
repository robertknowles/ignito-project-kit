# Multiple Properties Rendering + Year-End Decision Engine

## Implementation Summary

This document outlines the fixes implemented to render multiple properties in the same year and add year-end decision engine analysis.

---

## Problem Solved

### Issue 1: Multiple Properties in Same Year
Previously, when multiple properties were purchased in the same year (e.g., 3 properties in 2025), only one property card was displayed. This was because the rendering logic grouped properties by year.

### Issue 2: Decision Engine Placement
The decision engine needed to be shown only on the last property card of each year, displaying the year-end portfolio state after all purchases in that year.

---

## Changes Made

### 1. InvestmentTimeline.tsx - Timeline Generation Logic

**File**: `src/components/InvestmentTimeline.tsx`

#### Before:
- Timeline was built by grouping properties into purchase years
- One `PurchaseEventCard` per year
- Gap controls between years

#### After:
- Timeline is built by iterating over individual properties
- One `PurchaseEventCard` per property
- Each property card tracks if it's the last property in its year
- Gap controls only appear after the last property of a year (when there's a gap)

**Key Changes**:

```typescript
const unifiedTimeline = useMemo(() => {
  // Sort properties by affordable year
  const sortedProperties = [...timelineProperties].sort((a, b) => a.affordableYear - b.affordableYear);

  // Build timeline with individual property cards and gaps
  sortedProperties.forEach((property, index) => {
    const currentYear = Math.round(property.affordableYear);
    const nextProperty = sortedProperties[index + 1];
    const nextYear = nextProperty ? Math.round(nextProperty.affordableYear) : null;
    
    // Check if this is the last property in this year
    const isLastPropertyInYear = !nextProperty || nextYear !== currentYear;
    
    // Add the property card
    timelineElements.push({
      type: 'purchase',
      property,
      yearData,
      isLastPropertyInYear,
    });

    // Add gap only after the last property of a year, if there's a gap to the next year
    if (isLastPropertyInYear && nextYear && nextYear > currentYear + 1) {
      timelineElements.push({
        type: 'gap',
        startYear: currentYear + 1,
        endYear: nextYear - 1,
      });
    }
  });
}, [timelineProperties, fullYearlyBreakdown]);
```

#### Rendering Logic:

```typescript
{unifiedTimeline.map((element, index) => {
  if (element.type === 'purchase' && element.property && element.yearData) {
    return (
      <PurchaseEventCard
        key={`purchase-${element.property.id}-${index}`}
        yearData={element.yearData}
        property={element.property}
        showDecisionEngine={element.isLastPropertyInYear || false}
      />
    );
  } else if (element.type === 'gap' && element.startYear && element.endYear) {
    return (
      <GapView
        key={`gap-${element.startYear}-${element.endYear}`}
        startYear={element.startYear}
        endYear={element.endYear}
        allYearData={fullYearlyBreakdown}
      />
    );
  }
  return null;
})}
```

---

### 2. PurchaseEventCard.tsx - Individual Property Cards

**File**: `src/components/PurchaseEventCard.tsx`

#### New Props:

```typescript
interface PurchaseEventCardProps {
  yearData: YearBreakdownData;
  property?: any; // Individual property from timelineProperties
  showDecisionEngine?: boolean; // Only show on last card of each year
}
```

#### Property Identification:

```typescript
// Use individual property data if provided, otherwise fall back to yearData
const instanceId = property?.id || (yearData.purchases?.[0]?.propertyId) || `property_${yearData.year}`;
const propertyType = property?.title || yearData.propertyType || 'House';
const year = Math.floor(property?.affordableYear || yearData.year);
```

#### Conditional Decision Engine Display:

```typescript
{/* Decision Engine (only on last card of year) */}
{showDecisionEngine && (
  <>
    <div className="mt-3 pt-3 text-center border-t border-gray-100">
      <button 
        onClick={() => setDecisionEngineExpanded(!decisionEngineExpanded)}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        {decisionEngineExpanded ? '▼' : '▶'} Expand Decision Engine Analysis for {year}
      </button>
    </div>

    {/* Decision Engine Funnels (when expanded) */}
    {decisionEngineExpanded && (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DepositTestFunnel yearData={yearData} />
          <ServiceabilityTestFunnel yearData={yearData} />
          <BorrowingCapacityTestFunnel yearData={yearData} />
        </div>
      </div>
    )}
  </>
)}
```

---

## Visual Flow

### Example: 3 Properties in 2025, 1 Property in 2029

```
┌─────────────────────────────────────┐
│ Property 1 - House (VIC) - 2025    │
│ [Property details...]               │
│ [Save] [Expand Details]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Property 2 - Apartment (NSW) - 2025│
│ [Property details...]               │
│ [Save] [Expand Details]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Property 3 - House (QLD) - 2025    │
│ [Property details...]               │
│ [Save] [Expand Details]            │
│ ─────────────────────────────────── │
│ ▶ Expand Decision Engine Analysis   │
│   for 2025                          │  ← Only on last card
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔵 Gap Period: 2026-2028            │  ← Gap control appears
│ [Collapse/Expand years...]          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Property 4 - House (VIC) - 2029    │
│ [Property details...]               │
│ [Save] [Expand Details]            │
│ ─────────────────────────────────── │
│ ▶ Expand Decision Engine Analysis   │
│   for 2029                          │  ← Only on last card
└─────────────────────────────────────┘
```

---

## Testing Checklist

Use the following checklist to verify the implementation:

### ✅ Multiple Properties in Same Year
- [ ] Add 3 properties that can all be purchased in 2025
- [ ] Verify 3 separate property cards are displayed (not just 1)
- [ ] Verify each card shows the correct property details
- [ ] Verify cards are displayed in order

### ✅ Decision Engine on Last Card Only
- [ ] Verify only the 3rd card (last in 2025) has "Expand Decision Engine Analysis for 2025"
- [ ] Verify cards 1 and 2 do NOT have the decision engine button
- [ ] Click to expand decision engine - verify it shows:
  - Deposit Test Funnel
  - Serviceability Test Funnel
  - Borrowing Capacity Test Funnel
- [ ] Verify the decision engine shows year-end state (3 properties owned)

### ✅ Gap Control Placement
- [ ] Add a 4th property in 2029
- [ ] Verify gap control appears AFTER card #3 (the last 2025 card)
- [ ] Verify gap control does NOT appear between cards 1-2 or 2-3 (same year)
- [ ] Verify gap shows years 2026-2028

### ✅ Decision Engine on 2029 Property
- [ ] Verify card #4 (2029 property) has "Expand Decision Engine Analysis for 2029"
- [ ] Expand it and verify it shows the correct year-end state for 2029

---

## Technical Details

### isLastPropertyInYear Logic

The logic to determine if a property is the last in its year:

```typescript
const currentYear = Math.round(property.affordableYear);
const nextProperty = sortedProperties[index + 1];
const nextYear = nextProperty ? Math.round(nextProperty.affordableYear) : null;

// Check if this is the last property in this year
const isLastPropertyInYear = !nextProperty || nextYear !== currentYear;
```

This returns `true` when:
1. There is no next property (last property overall)
2. The next property is in a different year

### Gap Control Logic

Gap controls only appear:
1. After the last property of a year (`isLastPropertyInYear === true`)
2. When there's actually a gap (next year > current year + 1)

```typescript
if (isLastPropertyInYear && nextYear && nextYear > currentYear + 1) {
  timelineElements.push({
    type: 'gap',
    startYear: currentYear + 1,
    endYear: nextYear - 1,
  });
}
```

---

## Benefits

### 1. Accurate Property Representation
- Every property gets its own card with full details
- No information is hidden or grouped
- Clear visual separation between properties

### 2. Year-End Portfolio State
- Decision engine shows the portfolio state after ALL purchases in a year
- Users can see the cumulative impact of multiple purchases
- Tests (deposit, serviceability, borrowing capacity) reflect year-end position

### 3. Improved User Experience
- Easier to track individual property details
- Clear indication of which properties can be edited
- Decision engine only appears where relevant (year boundaries)

### 4. Better Gap Period Handling
- Gaps only appear between different years
- No confusing gap controls between properties in the same year
- Clear visual separation between purchase periods

---

## Files Modified

1. **src/components/InvestmentTimeline.tsx**
   - Updated `unifiedTimeline` generation to iterate over individual properties
   - Added `isLastPropertyInYear` tracking
   - Updated rendering logic to pass property and showDecisionEngine props

2. **src/components/PurchaseEventCard.tsx**
   - Added `property` and `showDecisionEngine` props
   - Updated property identification to use individual property data
   - Made decision engine conditional based on `showDecisionEngine` prop
   - Added year to decision engine button text

---

## Next Steps

1. Test with various property combinations:
   - Multiple properties in one year
   - Properties spread across multiple years
   - Mix of same and different years
   
2. Verify decision engine calculations are correct for year-end state

3. Check responsiveness on different screen sizes

4. Verify property detail modal works for each individual property card

---

## Notes

- The `yearData` prop still contains aggregated year-end data (used by decision engine)
- Individual `property` prop contains specific property instance data
- This approach maintains backward compatibility while fixing the rendering issue
- No breaking changes to existing components (GapView, decision engine funnels)



