# Visual Guide: Multiple Properties Rendering Fix

## Before vs After Comparison

### BEFORE (Broken) ❌

**Scenario**: 3 properties purchased in 2025

```
Investment Timeline
═══════════════════════════════════════

┌─────────────────────────────────────┐
│ 🏠 House (VIC) - Year 2025          │
│                                     │
│ PROPERTY DETAILS                    │
│ State: VIC | Yield: 5.4% | Rent... │
│                                     │
│ PURCHASE                            │
│ Price: $350k | Valuation: $378k... │
│                                     │
│ FINANCE                             │
│ LVR: 85% | IO @ 6.5% 30yrs...      │
│                                     │
│ [Save] [Expand Details]             │
│                                     │
│ ▶ Expand Decision Engine Analysis   │
└─────────────────────────────────────┘
   ↑
   Only shows 1 card for 3 properties!
   Properties 2 and 3 are missing!
```

---

### AFTER (Fixed) ✅

**Scenario**: 3 properties purchased in 2025

```
Investment Timeline
═══════════════════════════════════════

┌─────────────────────────────────────┐
│ 🏠 House (VIC) - Year 2025          │ ← Property 1
│                                     │
│ PROPERTY DETAILS                    │
│ State: VIC | Yield: 5.4% | Rent... │
│                                     │
│ PURCHASE                            │
│ Price: $350k | Valuation: $378k... │
│                                     │
│ FINANCE                             │
│ LVR: 85% | IO @ 6.5% 30yrs...      │
│                                     │
│ [Save] [Expand Details]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🏢 Apartment (NSW) - Year 2025      │ ← Property 2
│                                     │
│ PROPERTY DETAILS                    │
│ State: NSW | Yield: 6.2% | Rent... │
│                                     │
│ PURCHASE                            │
│ Price: $450k | Valuation: $486k... │
│                                     │
│ FINANCE                             │
│ LVR: 80% | IO @ 6.5% 30yrs...      │
│                                     │
│ [Save] [Expand Details]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🏠 House (QLD) - Year 2025          │ ← Property 3
│                                     │
│ PROPERTY DETAILS                    │
│ State: QLD | Yield: 5.8% | Rent... │
│                                     │
│ PURCHASE                            │
│ Price: $380k | Valuation: $410k... │
│                                     │
│ FINANCE                             │
│ LVR: 85% | IO @ 6.5% 30yrs...      │
│                                     │
│ [Save] [Expand Details]             │
│ ─────────────────────────────────── │
│ ▶ Expand Decision Engine Analysis   │ ← Only on last card!
│   for 2025                          │
└─────────────────────────────────────┘

All 3 properties are shown!
Decision engine only on the last one!
```

---

## Decision Engine Expansion

### When Expanded on Last Card of Year

```
┌─────────────────────────────────────┐
│ 🏠 House (QLD) - Year 2025          │
│                                     │
│ PROPERTY DETAILS                    │
│ State: QLD | Yield: 5.8% | Rent... │
│                                     │
│ PURCHASE                            │
│ Price: $380k | Valuation: $410k... │
│                                     │
│ FINANCE                             │
│ LVR: 85% | IO @ 6.5% 30yrs...      │
│                                     │
│ [Save] [Expand Details]             │
│ ─────────────────────────────────── │
│ ▼ Expand Decision Engine Analysis   │
│   for 2025                          │
│ ─────────────────────────────────── │
│                                     │
│ ┌───────────┬───────────┬─────────┐│
│ │ Deposit   │Serviceab. │Borrowing││
│ │ Test      │Test       │Capacity ││
│ │           │           │Test     ││
│ │           │           │         ││
│ │ ✅ PASS   │ ✅ PASS   │ ✅ PASS ││
│ │           │           │         ││
│ │ Available │Available  │Available││
│ │ $180k     │$125k      │$850k    ││
│ │           │           │         ││
│ │ Required  │Required   │Required ││
│ │ $155k     │$95k       │$680k    ││
│ │           │           │         ││
│ │ Surplus   │Surplus    │Surplus  ││
│ │ $25k      │$30k       │$170k    ││
│ └───────────┴───────────┴─────────┘│
│                                     │
│ Shows year-end state after ALL      │
│ 3 properties purchased in 2025!     │
└─────────────────────────────────────┘
```

---

## Gap Period Handling

### Scenario: 3 properties in 2025, 1 property in 2029

```
Investment Timeline
═══════════════════════════════════════

┌─────────────────────────────────────┐
│ 🏠 House (VIC) - Year 2025          │
│ [Property details...]               │
│ [Save] [Expand Details]             │
└─────────────────────────────────────┘
        ↓ No gap (same year)
┌─────────────────────────────────────┐
│ 🏢 Apartment (NSW) - Year 2025      │
│ [Property details...]               │
│ [Save] [Expand Details]             │
└─────────────────────────────────────┘
        ↓ No gap (same year)
┌─────────────────────────────────────┐
│ 🏠 House (QLD) - Year 2025          │
│ [Property details...]               │
│ [Save] [Expand Details]             │
│ ─────────────────────────────────── │
│ ▶ Expand Decision Engine for 2025   │
└─────────────────────────────────────┘
        ↓ GAP! (2026-2028)
┌─────────────────────────────────────┐
│ 🔵 Gap Period: 2026 - 2028          │ ← Gap control
│                                     │
│ ▶ Click to expand gap years         │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│ 🏠 House (VIC) - Year 2029          │
│ [Property details...]               │
│ [Save] [Expand Details]             │
│ ─────────────────────────────────── │
│ ▶ Expand Decision Engine for 2029   │
└─────────────────────────────────────┘
```

---

## Decision Engine Logic Flow

### Property Card Rendering Logic

```
For each property in timeline:
│
├─ Create property card
│  ├─ Show property details
│  ├─ Show finance details
│  └─ Show action buttons
│
├─ Is this the LAST property in this year?
│  │
│  ├─ YES ✅
│  │  └─ Show decision engine button
│  │     └─ "Expand Decision Engine Analysis for {year}"
│  │        │
│  │        └─ When expanded:
│  │           ├─ Deposit Test Funnel
│  │           ├─ Serviceability Test Funnel
│  │           └─ Borrowing Capacity Test Funnel
│  │
│  └─ NO ❌
│     └─ Don't show decision engine
│
└─ Is next year different AND has gap?
   │
   ├─ YES ✅
   │  └─ Show gap control
   │     └─ "Gap Period: {startYear} - {endYear}"
   │
   └─ NO ❌
      └─ Continue to next property
```

---

## Key Decision Points

### isLastPropertyInYear Determination

```typescript
// Current property year
const currentYear = Math.round(property.affordableYear);

// Next property year (if exists)
const nextProperty = sortedProperties[index + 1];
const nextYear = nextProperty ? Math.round(nextProperty.affordableYear) : null;

// Is this the last property in the year?
const isLastPropertyInYear = !nextProperty || nextYear !== currentYear;
```

**Examples**:

| Current Year | Next Year | isLastPropertyInYear | Reason                    |
|--------------|-----------|----------------------|---------------------------|
| 2025         | 2025      | false                | Same year, more coming    |
| 2025         | 2025      | false                | Same year, more coming    |
| 2025         | 2029      | **true** ✅          | Different year, last one  |
| 2029         | null      | **true** ✅          | No next property          |

---

### showDecisionEngine Propagation

```typescript
// In InvestmentTimeline.tsx
timelineElements.push({
  type: 'purchase',
  property,
  yearData,
  isLastPropertyInYear,  // ← Calculated here
});

// Rendered as:
<PurchaseEventCard
  yearData={element.yearData}
  property={element.property}
  showDecisionEngine={element.isLastPropertyInYear || false}  // ← Passed here
/>

// In PurchaseEventCard.tsx
{showDecisionEngine && (  // ← Used here
  <>
    <div className="mt-3 pt-3 text-center border-t border-gray-100">
      <button onClick={() => setDecisionEngineExpanded(!decisionEngineExpanded)}>
        ▶ Expand Decision Engine Analysis for {year}
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

## Styling Details

### Decision Engine Section Styling

```css
/* Separator before decision engine */
border-t border-gray-100  /* Light subtle border */

/* Button styling */
text-sm                   /* Small font size */
text-gray-400            /* Light grey text */
hover:text-gray-600      /* Darker on hover */
transition-colors        /* Smooth color transition */

/* Expanded section */
mt-4 pt-4                /* Margin and padding top */
border-t border-gray-200 /* Stronger border for expanded */

/* Grid layout for funnels */
grid grid-cols-1 lg:grid-cols-3 gap-6
/* 1 column on mobile, 3 on large screens */
```

---

## Testing Scenarios

### Scenario 1: Single Property Per Year
```
2025: Property 1 ← Decision engine ✅
2026: Property 2 ← Decision engine ✅
2027: Property 3 ← Decision engine ✅
```
**Expected**: Each card has decision engine

---

### Scenario 2: Multiple Properties Same Year
```
2025: Property 1 ← No decision engine ❌
2025: Property 2 ← No decision engine ❌
2025: Property 3 ← Decision engine ✅
```
**Expected**: Only last card (Property 3) has decision engine

---

### Scenario 3: Mixed Years with Gaps
```
2025: Property 1 ← No decision engine ❌
2025: Property 2 ← Decision engine ✅
[GAP: 2026-2028]
2029: Property 3 ← Decision engine ✅
```
**Expected**: 
- Property 2 has decision engine (last in 2025)
- Gap control between 2025 and 2029
- Property 3 has decision engine (last in 2029)

---

### Scenario 4: No Gaps
```
2025: Property 1 ← Decision engine ✅
2026: Property 2 ← Decision engine ✅
2027: Property 3 ← Decision engine ✅
```
**Expected**: 
- Each card has decision engine
- No gap controls (consecutive years)

---

## Common Issues & Solutions

### Issue: Decision engine appears on all cards
**Cause**: `showDecisionEngine` prop not being passed correctly
**Solution**: Check `isLastPropertyInYear` calculation in timeline generation

---

### Issue: No decision engine on any card
**Cause**: `showDecisionEngine` prop always false
**Solution**: Verify prop is being passed from InvestmentTimeline to PurchaseEventCard

---

### Issue: Gap appears between properties in same year
**Cause**: Gap logic not checking for year difference
**Solution**: Ensure gap only added when `isLastPropertyInYear && nextYear > currentYear + 1`

---

### Issue: Multiple properties not showing
**Cause**: Still using old year-grouped logic
**Solution**: Ensure using property-based iteration, not year-based

---

## Benefits Summary

| Before | After |
|--------|-------|
| 1 card per year | 1 card per property ✅ |
| Missing properties | All properties visible ✅ |
| Decision engine on every card | Only on year boundaries ✅ |
| Confusing gaps | Clear year gaps ✅ |
| Can't edit individual properties | Each property editable ✅ |

---

## Code References

### Key Files Modified
- `src/components/InvestmentTimeline.tsx` - Timeline generation logic
- `src/components/PurchaseEventCard.tsx` - Individual property card with conditional decision engine

### Key Functions
- `unifiedTimeline` memo - Generates timeline with individual properties
- `isLastPropertyInYear` - Determines decision engine visibility
- Gap logic - Shows gaps only between years

---

This visual guide helps developers and testers understand exactly how the multiple properties rendering works and where the decision engine should appear.

