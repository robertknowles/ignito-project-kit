# Per-Property Tracking Implementation Summary

## Overview

Successfully implemented a dedicated `usePerPropertyTracking` hook to provide accurate, per-property calculations for the "Per-Property Tracking" tab. This fixes the issue where charts and metrics were showing portfolio-level data instead of individual property data.

## Changes Made

### 1. New Hook: `usePerPropertyTracking.ts`

**Location:** `src/hooks/usePerPropertyTracking.ts`

**Key Features:**
- Takes a `propertyInstanceId` and calculates metrics for that single property over 10 years
- Uses the same tiered growth rates from the main affordability calculator
- Applies property-specific customizations from the PropertyInstanceContext
- Calculates detailed cashflow using the `calculateDetailedCashflow` utility
- Handles both Interest-Only (IO) and Principal & Interest (P&I) loan types
- Returns comprehensive tracking data including:
  - Current property value (Year 10)
  - Current equity (Year 10)
  - Total cash invested (deposit + acquisition costs)
  - Cash-on-Cash return (Year 1 cashflow / total invested)
  - Annualized ROIC (Return on Invested Capital over 10 years)
  - Years held (fixed at 10 for projections)
  - Equity over time (property value, loan balance, equity for each year)
  - Cashflow over time (gross income, expenses, net cashflow for each year)

**Calculation Logic:**

1. **Property Value Growth:** Uses tiered growth rates based on property assumptions:
   - Year 1: Growth rate from property assumption
   - Years 2-3: Different growth rate
   - Year 4: Another growth rate
   - Year 5+: Long-term growth rate

2. **Loan Balance:** 
   - For IO loans: Remains constant
   - For P&I loans: Reduces by annual principal payment using standard amortization formula

3. **Cashflow Calculation:**
   - Uses `calculateDetailedCashflow` for accurate expense breakdown
   - Accounts for land tax (calculated or overridden)
   - Adjusts rent based on property value growth
   - Includes vacancy rates, management fees, insurance, rates, strata, maintenance

4. **Key Metrics:**
   - **Cash-on-Cash Return:** First year net cashflow / total cash invested × 100
   - **ROIC:** (Current Equity - Total Invested + Total Cashflow) / Total Invested / Years Held × 100

### 2. Updated Component: `PerPropertyTracking.tsx`

**Location:** `src/components/PerPropertyTracking.tsx`

**Changes:**
- Removed old `usePropertyInstance` import (no longer needed)
- Added `usePerPropertyTracking` hook import
- Replaced hardcoded projection generation with hook data
- Updated to use `trackingData` from the hook instead of calculating locally
- Fixed property dropdown to show `prop.title` and `prop.displayPeriod` instead of non-existent `prop.propertyType`

**UI Improvements:**
- Reorganized metrics into two rows of 3 cards each
- Top row: Current Property Value, Current Equity, Total Cash Invested
- Bottom row: Annualized Return % (ROIC), Cash-on-Cash Return %, Years Held
- All metrics use the hook's calculated values
- Charts now use accurate per-property data from the hook

### 3. Key Metrics Display

All 6 metrics are now displayed correctly:

1. **Current Property Value** - Value at Year 10 after tiered growth
2. **Current Equity** - Property Value - Loan Balance at Year 10
3. **Total Cash Invested** - Deposit + Acquisition Costs (stamp duty, LMI, legal fees, etc.)
4. **Annualized Return % (ROIC)** - Total return annualized over 10 years
5. **Cash-on-Cash Return %** - Year 1 net cashflow as % of total invested
6. **Years Held** - 10 (for projection purposes)

### 4. Chart Updates

**Equity Growth Chart:**
- X-axis: Years (purchase year through year 10)
- Three lines:
  - Property Value (blue) - Shows property appreciation
  - Equity (green) - Shows equity buildup
  - Loan Balance (red, dashed) - Shows loan reduction (if P&I)

**Cashflow Chart:**
- X-axis: Years (purchase year through year 10)
- Three bars per year:
  - Rental Income (green) - Adjusted gross income after vacancy
  - Expenses (red) - All operating and non-deductible expenses
  - Net Cashflow (blue) - Net annual cashflow

## Integration with Existing System

The hook integrates seamlessly with:

1. **useAffordabilityCalculator:** Gets timeline properties to find the selected property
2. **PropertyInstanceContext:** Retrieves user customizations for the property
3. **DataAssumptionsContext:** Gets property data and growth assumptions
4. **calculateDetailedCashflow:** Uses the same cashflow calculation as other parts of the app
5. **calculateLandTax:** Applies accurate land tax calculations per state
6. **applyPropertyOverrides:** Respects user customizations to property details

## Technical Details

### Period Alignment
- Uses the same period conversion constants as the main calculator (PERIODS_PER_YEAR = 2)
- Ensures consistency with the rest of the application

### Growth Rate Application
- Annual rates are converted to per-period rates using compound interest formula
- Growth is applied period-by-period for accuracy, then aggregated to years for display

### Rent Adjustment
- Rent grows proportionally with property value
- Formula: `adjustedRent = baseRent × (currentValue / purchasePrice)`

### Error Handling
- Returns `null` if property instance ID is not provided
- Returns `null` if property is not found in timeline
- Returns `null` if property is not feasible
- Returns `null` if property data cannot be retrieved

## Testing Checklist

✅ New hook created at `src/hooks/usePerPropertyTracking.ts`
✅ Hook correctly calculates all metrics for a single property
✅ Component updated to use the new hook
✅ All 6 metrics display correctly formatted ($, %)
✅ Equity Chart visualizes property value, loan balance, and equity correctly
✅ Cashflow Chart visualizes gross income, expenses, and net cashflow correctly
✅ Dropdown property selector works correctly
✅ Selecting different properties updates all metrics and charts
✅ TypeScript compilation successful (no errors)
✅ No linter errors

## Benefits

1. **Accuracy:** Uses the same calculation methods as the main affordability calculator
2. **Consistency:** Respects user customizations and property overrides
3. **Maintainability:** Centralized calculation logic in a dedicated hook
4. **Reusability:** Hook can be used in other components if needed
5. **Type Safety:** Full TypeScript support with proper interfaces
6. **Performance:** Memoized calculations prevent unnecessary recalculations

## Usage Example

```typescript
// In any component
const { trackingData } = usePerPropertyTracking(propertyInstanceId);

if (trackingData) {
  console.log('Current Equity:', trackingData.currentEquity);
  console.log('ROIC:', trackingData.roic);
  console.log('Equity Over Time:', trackingData.equityOverTime);
  console.log('Cashflow Over Time:', trackingData.cashflowOverTime);
}
```

## Future Enhancements

Potential improvements for future iterations:

1. **Adjustable Time Horizon:** Allow users to select projection period (5, 10, 15, 20 years)
2. **Comparison Mode:** Compare multiple properties side-by-side
3. **Scenario Analysis:** Show optimistic/pessimistic scenarios
4. **Export Functionality:** Export data to CSV or PDF
5. **Tax Calculations:** Add after-tax cashflow projections
6. **Depreciation:** Include depreciation benefits in calculations
7. **Capital Gains:** Project capital gains tax on sale
8. **Refinancing Events:** Model potential refinancing scenarios

## Conclusion

The Per-Property Tracking feature now provides accurate, detailed insights into individual property performance over a 10-year period. All calculations align with the main affordability calculator, ensuring consistency across the application. The implementation is type-safe, well-tested, and ready for production use.

