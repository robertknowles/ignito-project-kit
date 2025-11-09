# Quick Reference: Multiple Properties Fix

## TL;DR

**Problem**: Only 1 card showed when multiple properties purchased in same year
**Solution**: Iterate over properties (not years) and show decision engine only on last card of each year

---

## Key Changes

### 1. InvestmentTimeline.tsx

**Before**: Grouped by year → 1 card per year
**After**: Iterate by property → 1 card per property

```typescript
// NEW: Build timeline element per property
sortedProperties.forEach((property, index) => {
  const currentYear = Math.round(property.affordableYear);
  const nextProperty = sortedProperties[index + 1];
  const nextYear = nextProperty ? Math.round(nextProperty.affordableYear) : null;
  
  // Check if last property in year
  const isLastPropertyInYear = !nextProperty || nextYear !== currentYear;
  
  // Add property card
  timelineElements.push({
    type: 'purchase',
    property,
    yearData,
    isLastPropertyInYear,
  });

  // Add gap only after last property of year
  if (isLastPropertyInYear && nextYear && nextYear > currentYear + 1) {
    timelineElements.push({
      type: 'gap',
      startYear: currentYear + 1,
      endYear: nextYear - 1,
    });
  }
});
```

### 2. PurchaseEventCard.tsx

**New Props**:
```typescript
interface PurchaseEventCardProps {
  yearData: YearBreakdownData;
  property?: any;              // NEW: Individual property
  showDecisionEngine?: boolean; // NEW: Only on last card
}
```

**Conditional Rendering**:
```typescript
{showDecisionEngine && (
  <>
    <div className="mt-3 pt-3 text-center border-t border-gray-100">
      <button onClick={() => setDecisionEngineExpanded(!decisionEngineExpanded)}>
        {decisionEngineExpanded ? '▼' : '▶'} 
        Expand Decision Engine Analysis for {year}
      </button>
    </div>

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

## Logic Flow

```
1. Sort properties by affordableYear
2. For each property:
   a. Determine if last in year
   b. Create property card
   c. Pass showDecisionEngine flag
   d. If last in year AND gap to next year:
      - Add gap control
```

---

## Decision Logic

### When to Show Decision Engine?

```typescript
const isLastPropertyInYear = !nextProperty || nextYear !== currentYear;
```

**TRUE (show)** when:
- No next property (last overall)
- Next property is different year

**FALSE (hide)** when:
- Next property is same year

### When to Show Gap?

```typescript
if (isLastPropertyInYear && nextYear && nextYear > currentYear + 1)
```

**TRUE (show)** when:
- Is last property in year
- Next year exists
- Gap is > 1 year

---

## Examples

### Example 1: Multiple Same Year
```
Input: 3 properties in 2025

Output:
┌─────────────┐
│ Property 1  │ showDecisionEngine: false
└─────────────┘
┌─────────────┐
│ Property 2  │ showDecisionEngine: false
└─────────────┘
┌─────────────┐
│ Property 3  │ showDecisionEngine: true ✅
└─────────────┘
```

### Example 2: Gap Scenario
```
Input: 
- 3 properties in 2025
- 1 property in 2029

Output:
┌─────────────┐
│ Property 1  │ 2025, no decision engine
└─────────────┘
┌─────────────┐
│ Property 2  │ 2025, no decision engine
└─────────────┘
┌─────────────┐
│ Property 3  │ 2025, with decision engine ✅
└─────────────┘
┌─────────────┐
│ GAP 2026-28 │ Gap control
└─────────────┘
┌─────────────┐
│ Property 4  │ 2029, with decision engine ✅
└─────────────┘
```

---

## Testing Commands

### Quick Test
```bash
# 1. Add 3 properties in 2025
# 2. Check timeline shows 3 cards
# 3. Verify only card 3 has decision engine
# 4. Add 1 property in 2029
# 5. Verify gap appears after card 3
```

### Visual Checks
- ✅ All properties visible
- ✅ Decision engine on last card of each year
- ✅ No gaps between same-year properties
- ✅ Gaps appear between different years

---

## Common Issues

### Issue: Only 1 card shows for 3 properties
**Fix**: Ensure using property iteration, not year grouping

### Issue: Decision engine on all cards
**Fix**: Check `showDecisionEngine` prop is passed correctly

### Issue: Gaps between same-year properties
**Fix**: Verify gap logic checks `isLastPropertyInYear`

---

## Code Locations

| File | Lines | Purpose |
|------|-------|---------|
| InvestmentTimeline.tsx | 288-340 | Timeline generation |
| InvestmentTimeline.tsx | 367-389 | Rendering logic |
| PurchaseEventCard.tsx | 12-22 | Props interface |
| PurchaseEventCard.tsx | 249-272 | Decision engine |

---

## Related Files

- `MULTIPLE_PROPERTIES_FIX.md` - Full implementation details
- `MULTIPLE_PROPERTIES_VISUAL_GUIDE.md` - Visual examples
- `MULTIPLE_PROPERTIES_TEST_PLAN.md` - Complete test cases

---

## Quick Debug

### Not rendering properties?
```typescript
// Check in InvestmentTimeline.tsx
console.log('timelineProperties:', timelineProperties);
console.log('unifiedTimeline:', unifiedTimeline);
```

### Decision engine not showing?
```typescript
// Check in PurchaseEventCard.tsx
console.log('showDecisionEngine:', showDecisionEngine);
console.log('year:', year);
```

### Wrong year data?
```typescript
// Check year calculation
console.log('property.affordableYear:', property.affordableYear);
console.log('Math.round:', Math.round(property.affordableYear));
console.log('yearData:', yearData);
```

---

## Props Flow

```
InvestmentTimeline
  ↓ timelineProperties (array of properties)
  ↓ fullYearlyBreakdown (year-end data)
  ↓
unifiedTimeline (memo)
  ↓ creates timeline elements
  ↓ calculates isLastPropertyInYear
  ↓
map() → PurchaseEventCard
  ↓ property (individual)
  ↓ yearData (year-end state)
  ↓ showDecisionEngine (boolean)
  ↓
Decision Engine (conditional)
  ↓ DepositTestFunnel
  ↓ ServiceabilityTestFunnel
  ↓ BorrowingCapacityTestFunnel
```

---

## Styling Classes

### Decision Engine Button
```
text-sm text-gray-400 hover:text-gray-600 transition-colors
```

### Separator
```
border-t border-gray-100
```

### Expanded Section
```
mt-4 pt-4 border-t border-gray-200
```

### Grid Layout
```
grid grid-cols-1 lg:grid-cols-3 gap-6
```

---

This quick reference provides everything you need to understand and debug the multiple properties fix.

