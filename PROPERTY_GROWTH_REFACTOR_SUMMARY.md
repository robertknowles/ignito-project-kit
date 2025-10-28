# Property Growth Rate Refactor - Implementation Summary

## Overview
Successfully refactored the property growth rate logic from a single global curve to per-property-type tiered curves. This change provides more granular and realistic growth modeling for different property types.

## Changes Made

### Part 1: Data Model Updates (DataAssumptionsContext.tsx)

#### PropertyAssumption Interface
**Before:**
```typescript
export interface PropertyAssumption {
  type: string;
  averageCost: string;
  yield: string;
  growth: string;  // Single growth rate
  deposit: string;
  loanType?: 'IO' | 'PI';
}
```

**After:**
```typescript
export interface PropertyAssumption {
  type: string;
  averageCost: string;
  yield: string;
  growthYear1: string;        // Year 1 growth rate
  growthYears2to3: string;    // Years 2-3 growth rate
  growthYear4: string;        // Year 4 growth rate
  growthYear5plus: string;    // Year 5+ growth rate
  deposit: string;
  loanType?: 'IO' | 'PI';
}
```

#### Default Property Assumptions
Updated all 9 property types with default tiered growth rates:
- **Year 1:** 12.5%
- **Years 2-3:** 10%
- **Year 4:** 7.5%
- **Year 5+:** 6%

Special case: Granny Flats maintain 0% growth across all periods.

### Part 2: UI Updates (DataAssumptions.tsx)

#### Removed Global Growth Curve Section
- Deleted the entire "Property Growth Curve" UI section
- Removed the 4 input fields for global growth rates
- Removed the bar chart visualization

#### Updated Property-Specific Assumptions Table
**Table Headers:**
- Removed: "Growth %"
- Added: "Growth Y1 %", "Growth Y2-3 %", "Growth Y4 %", "Growth Y5+ %"

**Table Body:**
- Removed: Single growth input field
- Added: Four separate input fields for each growth tier
- Each input field properly binds to its respective property assumption field

### Part 3: Affordability Calculator Updates (useAffordabilityCalculator.ts)

#### calculatePropertyGrowth Function
**Before:**
```typescript
const calculatePropertyGrowth = (initialValue: number, periods: number) => {
  // Used global profile.growthCurve
  const growthCurve = profile.growthCurve;
  // ...
}
```

**After:**
```typescript
const calculatePropertyGrowth = (
  initialValue: number, 
  periods: number, 
  assumption: PropertyAssumption
) => {
  // Uses per-property tiered growth rates
  const year1Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear1) / 100);
  const years2to3Rate = annualRateToPeriodRate(parseFloat(assumption.growthYears2to3) / 100);
  const year4Rate = annualRateToPeriodRate(parseFloat(assumption.growthYear4) / 100);
  const year5plusRate = annualRateToPeriodRate(parseFloat(assumption.growthYear5plus) / 100);
  // ...
}
```

#### Updated All Function Calls
Updated **12 calls** to `calculatePropertyGrowth` throughout the file:
1. Line 189: Available funds calculation (cashflow reinvestment)
2. Line 243: Existing portfolio equity calculation
3. Line 252: Previous purchases equity calculation
4. Line 285: Property score calculation
5. Line 336: Affordability check - rental income calculation
6. Line 374: Portfolio value calculation (existing portfolio)
7. Line 387: Portfolio value calculation (previous purchases)
8. Line 818: Timeline property - existing portfolio value
9. Line 831: Timeline property - previous purchases value
10. Line 863: Timeline property - cashflow calculation
11. Line 923: Timeline property - equity release calculation
12. Line 1072: Affordability for period - rental income calculation

#### Special Handling for Existing Portfolio
For `profile.portfolioValue` (existing portfolio before simulation):
- Uses the first property type's growth rates as a default
- Applied consistently across all calculations

#### Dependency Updates
- Added `propertyAssumptions` to useMemo dependency array
- Removed obsolete `globalFactors.growthRate` dependency
- Added `PropertyAssumption` type import

#### Removed Obsolete Function
Deleted `getGrowthRateForPeriod` helper function (no longer needed)

### Part 4: Additional Updates

#### PropertySelectionContext.tsx
Updated property type mapping to use Year 1 growth rate for display purposes:
```typescript
growthPercent: parseFloat(assumption.growthYear1), // Use Year 1 growth rate for display
```

This maintains backward compatibility with custom blocks that still use a single `growthPercent` value.

## Impact Analysis

### Improved Accuracy
- Each property type now has its own independent growth curve
- More realistic modeling of different market segments
- Granny Flats correctly model zero capital growth

### Calculation Consistency
- All affordability calculations now use property-specific growth rates
- Equity calculations reflect accurate property value growth
- Cashflow projections use correct property appreciation

### User Experience
- Cleaner UI without redundant global growth curve
- All growth rates visible and editable in one table
- More intuitive property-specific configuration

## Testing Recommendations

1. **Data Migration**: Verify existing client data loads correctly
2. **Growth Calculations**: Test that different property types apply different growth rates
3. **UI Functionality**: Confirm all four growth inputs update correctly
4. **Affordability Timeline**: Verify property purchases still calculate correctly
5. **Equity Calculations**: Test that equity recycling uses correct growth rates
6. **PDF Reports**: Check if any reports reference old growth structure

## Files Modified

1. `src/contexts/DataAssumptionsContext.tsx` - Data model
2. `src/pages/DataAssumptions.tsx` - UI components
3. `src/hooks/useAffordabilityCalculator.ts` - Core calculator logic
4. `src/contexts/PropertySelectionContext.tsx` - Property type mapping

## Files Not Modified (May Need Future Updates)

The following files still reference `profile.growthCurve` and may need similar updates for full consistency:
- `src/components/DecisionEngineView.tsx`
- `src/hooks/useChartDataGenerator.ts`
- `src/utils/pdfEnhancedGenerator.tsx`
- `src/hooks/useGrowthProjections.ts`
- `src/components/CashFlowAnalysis.tsx`
- `src/components/SummaryBar.tsx`

These files appear to have their own local implementations of property growth calculations.

## Migration Notes

For existing users with saved scenarios:
- Old single `growth` field values will be undefined in the new structure
- The default tiered values (12.5%, 10%, 7.5%, 6%) will be used
- Users should review and adjust growth rates for their property types
- Custom blocks continue to work with their existing single growth percentage

## Completion Status

✅ All requested changes implemented
✅ No linting errors
✅ All function calls updated
✅ Type safety maintained
✅ Backward compatibility preserved for custom blocks

