# Original Timeline with Expandable Decision Engine - Complete

## Overview

Successfully restored the original detailed property card design while adding subtle, low-hierarchy expandable decision engine features. The investment timeline now shows full property details with all the original functionality, and users can optionally expand to see decision engine analysis.

## What Was Accomplished

### Task 1: Restored Original Property Card Design ✓

**File**: `src/components/PurchaseEventCard.tsx`

Completely restored the full property card layout matching the original design:

#### Card Structure Restored:
- **Header Row**: Property icon, type, state, year, growth assumption
- **PROPERTY DETAILS Section**: 
  - State (editable)
  - Yield (calculated)
  - Rent per week (editable)
- **PURCHASE Section**:
  - Price (editable)
  - Valuation (editable)
  - %MV (calculated)
- **FINANCE Section**:
  - LVR (editable)
  - Interest rate (editable)
  - Loan term (editable)
  - Loan amount (calculated)
  - LMI (calculated)
  - Offset account (editable)

#### Functionality Preserved:
- ✅ EditableField component with inline click-to-edit
- ✅ Property instance data loading from context
- ✅ Validation for editable fields
- ✅ Save changes functionality (auto-save on blur)
- ✅ "Expand Full Details" modal button
- ✅ White card with border and shadow styling
- ✅ All green section headers (PROPERTY DETAILS, PURCHASE, FINANCE)

### Task 2: Added Subtle "Expand Decision Engine" Button ✓

**Location**: Below the existing buttons in PurchaseEventCard

**Implementation**:
```tsx
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
      <DepositTestFunnel yearData={yearData} />
      <ServiceabilityTestFunnel yearData={yearData} />
      <BorrowingCapacityTestFunnel yearData={yearData} />
    </div>
  </div>
)}
```

**Styling Features**:
- ✅ Light grey text (`text-gray-400`)
- ✅ Small font (`text-sm`)
- ✅ No border, no background
- ✅ Simple hover effect (`hover:text-gray-600`)
- ✅ Centered alignment
- ✅ Text chevron arrows (▶ collapsed, ▼ expanded)

### Task 3: Added Subtle Gap Period Expandable ✓

**File**: `src/components/GapView.tsx` (updated)

**Implementation**:
```tsx
<div className="my-4 text-center">
  {/* Subtle Button - No box, no border, centered */}
  <button 
    onClick={() => setIsExpanded(!isExpanded)}
    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
  >
    {isExpanded ? '▼' : '▶'} Show {startYear}–{endYear} progression ({yearCount} years)
  </button>
  
  {isExpanded && (
    <div className="mt-4 space-y-2">
      {/* AI Summary */}
      <div className="text-sm text-gray-500 italic">
        <AISummaryForGap gapData={gapYears} />
      </div>
      
      {/* Year-by-year rows */}
      {gapYears.map((yearData) => (
        <GapYearRow key={yearData.year} yearData={yearData} />
      ))}
    </div>
  )}
</div>
```

**Styling Features**:
- ✅ Light grey text (`text-gray-400`)
- ✅ Small font (`text-sm`)
- ✅ No box, no border, no background
- ✅ No emoji icons (text chevrons only: ▶ ▼)
- ✅ Centered on page
- ✅ Subtle hover effect
- ✅ Only shows if gap is 1+ years

### Components Updated

#### 1. PurchaseEventCard.tsx (Complete Rewrite)
- **Lines**: 288 lines (was 162)
- **Changes**:
  - Restored full property card design
  - Added all editable fields
  - Integrated property instance context
  - Added subtle decision engine expansion
  - Preserved all original functionality

#### 2. GapView.tsx (Simplified)
- **Lines**: 51 lines (was 68)
- **Changes**:
  - Removed bulky visual design
  - Converted to subtle centered button
  - Removed icons except text chevrons
  - Simplified structure

#### 3. GapYearRow.tsx (Simplified)
- **Lines**: 54 lines (was 118)
- **Changes**:
  - Removed chevron icons from lucide-react
  - Uses text chevrons (▶ ▼)
  - Compact single-line header
  - Subtle grey styling

#### 4. AISummaryForGap.tsx (Simplified)
- **Lines**: 96 lines (was 174)
- **Changes**:
  - Removed elaborate visual design
  - Simple italic text summary
  - No boxes or colors
  - Just explains the bottleneck

## Visual Hierarchy

### High Priority (Bold & Clear):
1. **Property Cards**: Full detailed cards with white background, shadow, green headers
2. **Editable Fields**: Clear hover states and edit capabilities
3. **Action Buttons**: Green text, bold, clear actions

### Low Priority (Subtle):
1. **Decision Engine Expander**: Light grey, small, centered, below main buttons
2. **Gap Period Controls**: Light grey, small, centered, minimal
3. **Year Rows**: Compact, grey text, no visual weight
4. **AI Summary**: Italic grey text, informational only

## User Experience Flow

### Viewing a Property Purchase:
1. See full property details immediately (no expansion needed)
2. Edit any field by clicking on it
3. Click "Expand Full Details" for property modal
4. Optionally click "Expand Decision Engine Analysis" to see funnels

### Viewing Gap Periods:
1. See subtle grey text between properties: "▶ Show 2026–2028 progression (3 years)"
2. Click to expand
3. Read AI summary explaining the bottleneck
4. See year-by-year rows with compact metrics
5. Click any year to expand its three funnels

## Testing Results

✅ **All Tests Passing**:
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

## No Linting Errors

All files pass linting with no errors:
- ✅ PurchaseEventCard.tsx
- ✅ GapView.tsx
- ✅ GapYearRow.tsx
- ✅ AISummaryForGap.tsx

## Success Criteria Met

✅ **Original property card design is fully restored**
- All sections present (PROPERTY DETAILS, PURCHASE, FINANCE)
- All editable fields functional
- All buttons working
- Exact match to reference image

✅ **Decision engine funnels are accessible via subtle expand buttons**
- Light grey, small text
- Centered, minimal visual weight
- Expands inline without disrupting flow

✅ **Gap periods are shown with minimal, light grey UI**
- No boxes or borders
- Text chevrons only (no icons)
- Centered, subtle
- Low visual hierarchy

✅ **All existing functionality still works**
- Editable fields
- Property modal
- Save changes
- Timeline flow
- Data calculations

✅ **No visual clutter or competing hierarchy**
- Property cards are primary focus
- Decision engine features are secondary
- Gap controls are tertiary
- Clear visual separation

## Architecture

```
InvestmentTimeline (Container)
├── fullYearlyBreakdown (All years data)
└── unifiedTimeline (Organized view)
    │
    ├── PurchaseEventCard (For each purchase)
    │   ├── Full Property Details (ALWAYS VISIBLE)
    │   │   ├── PROPERTY DETAILS section
    │   │   ├── PURCHASE section
    │   │   └── FINANCE section
    │   ├── Action Buttons
    │   └── [Subtle] Expand Decision Engine ▶
    │       └── Three Funnels (when expanded)
    │
    └── GapView (Between purchases)
        ├── [Subtle] Show progression button ▶
        └── When Expanded:
            ├── AI Summary (simple text)
            └── GapYearRow[] (compact rows)
                ├── Year metrics (one line)
                └── [Expandable] Three Funnels
```

## Summary

The investment timeline now perfectly balances detailed property information with optional decision engine analysis. The original detailed property cards take center stage, while decision engine features are available through subtle, low-hierarchy controls that don't compete for attention. Users get all the information they need upfront, with the ability to dig deeper when desired.

