# Cursor Prompt: Restore Original Timeline with Expandable Decision Engine

## Context

We have an `InvestmentTimeline` component that displays property purchase cards. We've just added decision engine functionality (three-funnel analysis) but the property cards have been simplified too much. We need to restore the original detailed property cards while keeping the new expandable decision engine features.

## Reference Image

[User will attach screenshot showing the original property card design with full details]

The original card shows:
- Property icon, type, state, year, growth assumption
- **PROPERTY DETAILS** section: State, Yield, Rent
- **PURCHASE** section: Price, Valuation, %MV
- **FINANCE** section: LVR, Interest rate, Loan term, Loan amount, LMI, Offset
- Editable fields (click to edit)
- "Save Changes" and "Expand Full Details" buttons

## Task: Restore Property Cards and Add Subtle Expandable Features

Complete these 3 tasks:

### Task 1: Restore Original Property Card Design

**File:** `src/components/InvestmentTimeline.tsx` (or wherever `TimelineItem`/`PurchaseEventCard` is defined)

**Current Problem:** Property cards are showing minimal information (just "Property #1 • Units/Apartments • Year 2025" with basic price/deposit/loan)

**Required Fix:** Restore the full property card layout exactly as shown in the reference image.

**Implementation:**

1. **Restore the card structure:**
   ```tsx
   <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm p-6">
     {/* Header */}
     <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
       <div className="flex items-center gap-1">
         {getPropertyTypeIcon(type, 16, 'text-gray-600')}
       </div>
       <span className="font-medium text-gray-800">{type}</span>
       <span>({propertyData.state})</span>
       <span>|</span>
       <span>Year: {year}</span>
       <span>|</span>
       <span>Growth: {propertyData.growthAssumption}</span>
     </div>
     
     {/* PROPERTY DETAILS Section */}
     <div className="mb-3">
       <div className="text-xs font-semibold text-green-700 mb-1">PROPERTY DETAILS</div>
       <div className="text-sm text-gray-700">
         <span>State: </span>
         <EditableField label="State" value={propertyData.state} field="state" type="text" />
         <span className="mx-2">|</span>
         <span>Yield: </span>
         <span>{yieldCalc}%</span>
         <span className="mx-2">|</span>
         <span>Rent: </span>
         <EditableField label="Rent" value={propertyData.rentPerWeek} field="rentPerWeek" prefix="$" suffix="/wk" />
       </div>
     </div>
     
     {/* PURCHASE Section */}
     <div className="mb-3">
       <div className="text-xs font-semibold text-green-700 mb-1">PURCHASE</div>
       <div className="text-sm text-gray-700">
         <span>Price: </span>
         <EditableField 
           label="Price" 
           value={(propertyData.purchasePrice / 1000).toFixed(0)} 
           field="purchasePrice" 
           prefix="$" 
           suffix="k" 
         />
         <span className="mx-2">|</span>
         <span>Valuation: </span>
         <EditableField 
           label="Valuation" 
           value={(propertyData.valuationAtPurchase / 1000).toFixed(0)} 
           field="valuationAtPurchase" 
           prefix="$" 
           suffix="k" 
         />
         <span className="mx-2">|</span>
         <span>%MV: </span>
         <span>{mvPercentage}%</span>
       </div>
     </div>
     
     {/* FINANCE Section */}
     <div className="mb-3">
       <div className="text-xs font-semibold text-green-700 mb-1">FINANCE</div>
       <div className="text-sm text-gray-700">
         <span>LVR: </span>
         <EditableField label="LVR" value={propertyData.lvr} field="lvr" suffix="%" />
         <span className="mx-2">|</span>
         <span>IO @ </span>
         <EditableField label="Interest" value={propertyData.interestRate} field="interestRate" suffix="%" />
         <span> </span>
         <EditableField label="Term" value={propertyData.loanTerm} field="loanTerm" suffix=" yrs" />
         <span className="mx-2">|</span>
         <span>Loan: </span>
         <EditableField 
           label="Loan" 
           value={(loanAmount / 1000).toFixed(0)} 
           field="loanAmount" 
           prefix="$" 
           suffix="k" 
         />
         <span className="mx-2">|</span>
         <span>LMI: </span>
         <span>${lmi.toLocaleString()}</span>
         <span className="mx-2">|</span>
         <span>Offset: </span>
         <EditableField 
           label="Offset" 
           value={propertyData.loanOffsetAccount} 
           field="loanOffsetAccount" 
           prefix="$" 
         />
       </div>
     </div>
     
     {/* Buttons */}
     <div className="flex gap-2 mt-4">
       <button className="text-sm text-green-600 hover:text-green-700">
         [ Save Changes ]
       </button>
       <button className="text-sm text-green-600 hover:text-green-700">
         [ Expand Full Details → ]
       </button>
     </div>
   </div>
   ```

2. **Keep all existing functionality:**
   - EditableField component with inline editing
   - Property instance data loading
   - Save changes functionality
   - Expand Full Details modal

**Requirements:**
- Match the exact layout from the reference image
- Keep all green section headers (PROPERTY DETAILS, PURCHASE, FINANCE)
- Maintain all editable fields
- Keep the white card with border and shadow
- Don't remove any existing functionality

---

### Task 2: Add Subtle "Expand Decision Engine" Button

**File:** Same file as Task 1

**Add below the existing buttons:**

```tsx
{/* Buttons */}
<div className="flex gap-2 mt-4">
  <button className="text-sm text-green-600 hover:text-green-700">
    [ Save Changes ]
  </button>
  <button className="text-sm text-green-600 hover:text-green-700">
    [ Expand Full Details → ]
  </button>
</div>

{/* NEW: Decision Engine Expand Button */}
<div className="mt-3 text-center">
  <button 
    onClick={() => setDecisionEngineExpanded(!decisionEngineExpanded)}
    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
  >
    {decisionEngineExpanded ? '▼' : '▶'} Expand Decision Engine Analysis
  </button>
</div>

{/* NEW: Decision Engine Funnels (when expanded) */}
{decisionEngineExpanded && (
  <div className="mt-4 pt-4 border-t border-gray-200">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <DepositTestFunnel yearData={yearDataForThisProperty} />
      <ServiceabilityTestFunnel yearData={yearDataForThisProperty} />
      <BorrowingCapacityTestFunnel yearData={yearDataForThisProperty} />
    </div>
  </div>
)}
```

**Styling Requirements:**
- Light grey text: `text-gray-400`
- Small font: `text-sm`
- No border, no background
- Simple hover effect: `hover:text-gray-600`
- Centered alignment
- Small chevron arrow (▶ collapsed, ▼ expanded)

**Data Requirements:**
- Get the `yearDataForThisProperty` from the `fullYearlyBreakdown` array (generated in DecisionEngineView logic)
- Match the year of the property purchase to the correct `YearBreakdownData` object

---

### Task 3: Add Subtle Gap Period Expandable

**File:** `src/components/InvestmentTimeline.tsx`

**Between property cards, add:**

```tsx
{/* Gap Period (if exists) */}
{nextPurchaseYear && nextPurchaseYear > currentYear + 1 && (
  <div className="my-4 text-center">
    <button 
      onClick={() => toggleGapExpanded(`${currentYear}-${nextPurchaseYear}`)}
      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
    >
      {isGapExpanded ? '▼' : '▶'} Show {currentYear + 1}-{nextPurchaseYear - 1} progression ({nextPurchaseYear - currentYear - 1} years)
    </button>
    
    {isGapExpanded && (
      <div className="mt-4 space-y-2">
        {/* AI Summary */}
        <div className="text-sm text-gray-400 italic">
          <AISummaryForGap gapYears={gapYearData} />
        </div>
        
        {/* Year-by-year rows */}
        {gapYearData.map(yearData => (
          <GapYearRow key={yearData.year} yearData={yearData} />
        ))}
      </div>
    )}
  </div>
)}
```

**Styling Requirements:**
- Light grey text: `text-gray-400`
- Small font: `text-sm`
- No box, no border, no background
- No emoji icons (use simple text chevrons: ▶ ▼)
- Centered on page
- Subtle hover effect

**Logic Requirements:**
- Calculate gaps between purchase years
- Only show if gap is 2+ years
- Filter `fullYearlyBreakdown` to get data for gap years
- Pass to `GapYearRow` component

---

## New Components Needed

### Component: `GapYearRow.tsx` (new file)

```tsx
import React, { useState } from 'react';
import type { YearBreakdownData } from '@/types/property';
import { DepositTestFunnel } from './DepositTestFunnel';
import { ServiceabilityTestFunnel } from './ServiceabilityTestFunnel';
import { BorrowingCapacityTestFunnel } from './BorrowingCapacityTestFunnel';

interface GapYearRowProps {
  yearData: YearBreakdownData;
}

export const GapYearRow: React.FC<GapYearRowProps> = ({ yearData }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toLocaleString()}`;
  };
  
  return (
    <div className="border-t border-gray-100 py-2">
      {/* Compact Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="mr-2">{isExpanded ? '▼' : '▶'}</span>
        Year {Math.floor(yearData.year)} | 
        Portfolio: {formatCurrency(yearData.portfolioValue)} | 
        Equity: {formatCurrency(yearData.totalEquity)} | 
        LVR: {yearData.lvr.toFixed(1)}% | 
        Available: {formatCurrency(yearData.availableDeposit)} | 
        Deposit: <span className={yearData.depositTest.pass ? 'text-green-600' : 'text-red-600'}>
          {yearData.depositTest.pass ? 'PASS' : 'FAIL'}
        </span> | 
        Serviceability: <span className={yearData.serviceabilityTest.pass ? 'text-green-600' : 'text-red-600'}>
          {yearData.serviceabilityTest.pass ? 'PASS' : 'FAIL'}
        </span> | 
        Borrowing: <span className={yearData.borrowingCapacityTest.pass ? 'text-green-600' : 'text-red-600'}>
          {yearData.borrowingCapacityTest.pass ? 'PASS' : 'FAIL'}
        </span>
      </button>
      
      {/* Expanded: Three Funnels */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-50 p-4 rounded">
          <DepositTestFunnel yearData={yearData} />
          <ServiceabilityTestFunnel yearData={yearData} />
          <BorrowingCapacityTestFunnel yearData={yearData} />
        </div>
      )}
    </div>
  );
};
```

### Component: `AISummaryForGap.tsx` (new file)

```tsx
import React from 'react';
import type { YearBreakdownData } from '@/types/property';

interface AISummaryForGapProps {
  gapYears: YearBreakdownData[];
}

export const AISummaryForGap: React.FC<AISummaryForGapProps> = ({ gapYears }) => {
  if (gapYears.length === 0) return null;
  
  // Analyze which test was failing most
  const failingTests = { deposit: 0, serviceability: 0, borrowing: 0 };
  
  gapYears.forEach(year => {
    if (!year.depositTest.pass) failingTests.deposit++;
    if (!year.serviceabilityTest.pass) failingTests.serviceability++;
    if (!year.borrowingCapacityTest.pass) failingTests.borrowing++;
  });
  
  const primaryBottleneck = Object.keys(failingTests).reduce((a, b) => 
    failingTests[a as keyof typeof failingTests] > failingTests[b as keyof typeof failingTests] ? a : b
  );
  
  // Find when it was resolved
  const resolvedYear = gapYears.find(year => {
    if (primaryBottleneck === 'deposit') return year.depositTest.pass;
    if (primaryBottleneck === 'serviceability') return year.serviceabilityTest.pass;
    if (primaryBottleneck === 'borrowing') return year.borrowingCapacityTest.pass;
    return false;
  });
  
  const startYear = Math.floor(gapYears[0].year);
  const endYear = Math.floor(gapYears[gapYears.length - 1].year);
  const resolvedYearNum = resolvedYear ? Math.floor(resolvedYear.year) : endYear;
  
  return (
    <p className="text-sm text-gray-500 italic mb-3">
      The {gapYears.length}-year wait from {startYear} to {endYear} was primarily due to the{' '}
      <strong>{primaryBottleneck} test</strong>. This constraint was resolved in {resolvedYearNum}, 
      allowing the next purchase to proceed.
    </p>
  );
};
```

---

## Testing Checklist

After implementation, verify:

1. ✅ Property cards show full detail (PROPERTY DETAILS, PURCHASE, FINANCE sections)
2. ✅ All editable fields work (click to edit)
3. ✅ "Expand Decision Engine Analysis" button appears below property card
4. ✅ Clicking expands to show three funnels inline
5. ✅ Gap period buttons appear between properties (light grey, subtle)
6. ✅ Clicking gap button expands to show AI summary + year rows
7. ✅ Each gap year row is expandable to show funnels
8. ✅ No emoji icons in gap controls (only text chevrons: ▶ ▼)
9. ✅ All styling is subtle and low-hierarchy for new features
10. ✅ Original timeline functionality preserved

---

## Success Criteria

Task is complete when:
- Original property card design is fully restored
- Decision engine funnels are accessible via subtle expand buttons
- Gap periods are shown with minimal, light grey UI
- All existing functionality still works
- No visual clutter or competing hierarchy
