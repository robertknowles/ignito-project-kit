# Stamp Duty Calculation Simplification

## Summary

Successfully replaced the complex state-specific stamp duty calculation with a simple flat percentage of 4% of the property price. This simplification aligns with the goal of creating a planning tool rather than a detailed cost calculator, and removes the dependency on investment state.

## Changes Made

### 1. Modified `src/utils/costsCalculator.ts`

#### Removed Complex State-Based Logic
- **Deleted** the entire `STAMP_DUTY_RATES` constant object (lines 24-47) containing progressive bracket rates for NSW, VIC, and QLD
- **Deleted** the `calculateStampDuty()` function (lines 52-75) which handled state-based calculations and first home buyer exemptions
- **Deleted** the `calculateStampDutyProgressive()` function (lines 80-100) which implemented the progressive bracket system

#### Updated Interface
- **Removed** `state: string` parameter from `CostCalculationParams` interface
- Kept `isFirstHomeBuyer?: boolean` as optional parameter (though it's no longer used in stamp duty calculation)

#### Simplified Calculation
Replaced the complex calculation:
```typescript
const stampDuty = calculateStampDuty(propertyPrice, state, isFirstHomeBuyer);
```

With a simple flat percentage:
```typescript
// 1. Stamp Duty (simplified as a flat percentage)
const STAMP_DUTY_AVERAGE_RATE = 0.04; // 4%
const stampDuty = propertyPrice * STAMP_DUTY_AVERAGE_RATE;
```

**File reduction**: Reduced from 194 lines to 114 lines (80 lines removed, ~41% reduction)

### 2. Updated `src/hooks/useAffordabilityCalculator.ts`

#### Removed State Parameter from Function Calls
Updated **three instances** where `calculateAcquisitionCosts()` is called:

1. **Line 416-421**: In `checkAffordability()` function
2. **Line 843-848**: In `calculateTimelineProperties()` - when calculating acquisition costs for timeline properties
3. **Line 1004-1009**: In `calculateAffordabilityForPeriod()` callback function

**Before:**
```typescript
const acquisitionCosts = calculateAcquisitionCosts({
  propertyPrice: property.cost,
  loanAmount: newLoanAmount,
  lvr: lvr,
  state: property.state || 'NSW',
  isFirstHomeBuyer: false,
});
```

**After:**
```typescript
const acquisitionCosts = calculateAcquisitionCosts({
  propertyPrice: property.cost,
  loanAmount: newLoanAmount,
  lvr: lvr,
  isFirstHomeBuyer: false,
});
```

## What Remains Unchanged

### Type Definitions
- The `TimelineProperty` interface in `src/types/property.ts` still includes an optional `state?: string` field (line 114)
- The `PropertyPurchase` interface still includes an optional `state?: string` field (line 17)
- **Reason**: These fields are optional and may still be useful for display purposes or future enhancements

### Usage of Stamp Duty Values
- All components that display stamp duty values continue to work unchanged
- The `stampDuty` field in `AcquisitionCosts` interface remains unchanged
- Components like `DecisionEngineView.tsx` and `AffordabilityBreakdownTable.tsx` continue to display stamp duty correctly

## Impact

### Functional Changes
1. **Stamp duty is now calculated as exactly 4% of property price** for all properties, regardless of:
   - Property location/state
   - Property price (no progressive brackets)
   - First home buyer status

2. **Example Calculations:**
   - £500,000 property → £20,000 stamp duty (was previously £16,410 in NSW for non-FHB)
   - £750,000 property → £30,000 stamp duty (was previously £27,585 in NSW)
   - £1,000,000 property → £40,000 stamp duty (was previously £39,985 in NSW)

### Benefits
1. **Simplified data requirements**: No need to capture or maintain property state information for cost calculations
2. **Easier to understand**: Users can quickly estimate costs without complex brackets
3. **More maintainable**: No need to update state-specific rates when legislation changes
4. **Planning-focused**: Provides reasonable averages for strategic planning rather than precise quotations
5. **Reduced code complexity**: 41% reduction in `costsCalculator.ts` file size

### Considerations
- The 4% flat rate is an average that may:
  - Over-estimate for lower-value properties or first home buyers
  - Under-estimate for very high-value properties in some states
  - Vary from actual costs that depend on specific state regulations
- This is acceptable for a planning tool but users should be aware they need to get exact quotes for real transactions

## Testing

✅ **Build Status**: Successful compilation with no TypeScript errors
✅ **Linter Status**: No linter errors detected
✅ **Function Calls**: All 3 call sites updated successfully

## Related Files

- `src/utils/costsCalculator.ts` - Core calculation logic (modified)
- `src/hooks/useAffordabilityCalculator.ts` - Affordability calculator hook (modified)
- `src/types/property.ts` - Type definitions (unchanged, state field remains optional)
- `src/components/DecisionEngineView.tsx` - Uses stamp duty values (unchanged)
- `src/components/AffordabilityBreakdownTable.tsx` - Displays stamp duty (unchanged)

## Future Enhancements

If state-specific calculations are needed in the future:
1. The optional `state` field is still available in type definitions
2. Could implement as a user preference or advanced setting
3. Could provide a range (min/max) rather than state-specific brackets
4. Could add a "Get Accurate Quote" feature that redirects to state-specific calculators

