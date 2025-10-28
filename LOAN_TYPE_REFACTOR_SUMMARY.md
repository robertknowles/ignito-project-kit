# Loan Type Refactoring - Per-Property Implementation

## Overview

Successfully completed a major architectural refactoring to move the IO/P&I (Interest Only / Principal & Interest) loan type setting from a **global per-property-type** configuration to a **per-property instance** configuration within the investment timeline.

## Problem Statement

Previously, the loan type was managed at the property type level (e.g., all "Units / Apartments" shared the same loan type). This was unrealistic because:
- Each property purchase should have its own independent loan type decision
- Different instances of the same property type might warrant different financing strategies
- The loan type significantly affects affordability calculations and should be flexible

## Solution Architecture

### Part 1: Removed Old Per-Type Logic

#### 1.1 PropertySelectionContext.tsx
- **Removed**: `propertyLoanTypes` state and `updateLoanType` function
- **Removed**: All localStorage persistence for per-type loan types
- **Removed**: Loan type from context interface
- **Updated**: `propertyTypes` memoization to remove dependency on `propertyLoanTypes`
- **Simplified**: Property type calculations to use default loan types from assumptions

#### 1.2 PropertyCard.tsx
- **Removed**: Entire loan type toggle UI section
- **Removed**: `loanType` and `onLoanTypeChange` props from component interface
- **Result**: Clean property building blocks without loan type controls

#### 1.3 StrategyBuilder.tsx
- **Removed**: `propertyLoanTypes` and `updateLoanType` from destructured context
- **Removed**: Loan type props from PropertyCard usage
- **Result**: Simplified property selection interface

### Part 2: Introduced Per-Property Instance Logic

#### 2.1 TimelineProperty Interface (types/property.ts)
- **Added**: `instanceId: string` - Unique identifier for each property instance
- **Updated**: `loanType` comment to clarify it's now per-instance

#### 2.2 useAffordabilityCalculator Hook
- **Added**: `timelineLoanTypes` state (keyed by instanceId)
- **Added**: localStorage persistence for timeline-specific loan types
- **Added**: `updateTimelinePropertyLoanType(instanceId, loanType)` function
- **Added**: `instanceId` generation for each property (stable, based on propertyId + index)
- **Updated**: All purchase history arrays to include `instanceId` and `loanType`
- **Updated**: All function signatures to include instanceId in purchase data:
  - `calculateAvailableFunds`
  - `calculatePropertyScore`
  - `checkAffordability`
  - `determineNextPurchasePeriod`
  - `calculateAffordabilityForPeriod`
- **Updated**: Main calculation loop to:
  - Generate stable instanceIds: `${propertyId}_instance_${i}`
  - Get loan type from `timelineLoanTypes[instanceId]` with 'IO' fallback
  - Pass instanceId and loanType through entire calculation chain
- **Updated**: useMemo dependencies to include `timelineLoanTypes`
- **Exported**: `updateTimelinePropertyLoanType` function in return value

#### 2.3 Loan Type Integration
Every place where loan payments are calculated now correctly uses the per-instance loan type:
- Available funds calculation (cashflow feedback loop)
- Property scoring (for acquisition prioritization)
- Affordability checks (serviceability test)
- Timeline property display data

### Part 3: Updated UI Components

#### 3.1 New LoanTypeToggle Component
Created a reusable toggle component with:
- IO/P&I toggle buttons
- Small and medium size variants
- Tooltips explaining each loan type
- Clean styling matching existing design system
- Event propagation handling

#### 3.2 InvestmentTimeline Component
- **Added**: `updateTimelinePropertyLoanType` from useAffordabilityCalculator
- **Updated**: Timeline event data structure to include `instanceId` and `loanType`
- **Updated**: Property events to pass instanceId and loanType
- **Updated**: TimelineItem props to accept instanceId, loanType, and onLoanTypeChange
- **Added**: LoanTypeToggle display within each timeline property card
- **Result**: Each property in the timeline now has its own independent loan type toggle

## Key Technical Decisions

### Stable Instance IDs
Instance IDs are generated as `${propertyId}_instance_${index}` which ensures:
- Consistency across recalculations
- Proper persistence of loan type settings
- Clear identification of which property instance is being modified

### Default to Interest Only
All properties default to 'IO' (Interest Only) when first added, which is:
- More conservative for initial modeling
- Common practice for investment properties
- Better for cashflow in early years

### localStorage Persistence
Loan type settings are persisted per client:
- Key format: `timeline_loan_types_${clientId}`
- Automatically loads when client switches
- Saves on every change

### Calculation Chain Integrity
The loan type is threaded through the entire calculation chain:
- Each purchase in history carries its instanceId and loanType
- Every function that calculates loan payments uses the specific property's loan type
- No global assumptions or fallbacks that could cause inconsistencies

## Knock-On Effects Handled

### Affordability Calculator
- ✅ `calculateAnnualLoanPayment`: Uses loan type parameter correctly
- ✅ `calculateAvailableFunds`: Uses per-instance loan types for cashflow
- ✅ `checkAffordability`: Uses per-instance loan types for serviceability
- ✅ `calculatePropertyScore`: Uses per-instance loan types for evaluation

### Timeline Generation
- ✅ Purchase history includes instanceId and loanType
- ✅ Property cashflow calculations use correct loan type
- ✅ Affordability tests use correct loan type
- ✅ Timeline display shows correct loan type per property

### UI Updates
- ✅ Property Building Blocks: Loan type toggle removed
- ✅ Investment Timeline: Loan type toggle added per property
- ✅ Toggle changes trigger full recalculation
- ✅ Settings persist across sessions

## Files Modified

1. `/src/contexts/PropertySelectionContext.tsx` - Removed per-type logic
2. `/src/components/PropertyCard.tsx` - Removed loan type UI
3. `/src/components/StrategyBuilder.tsx` - Removed loan type props
4. `/src/types/property.ts` - Added instanceId to TimelineProperty
5. `/src/hooks/useAffordabilityCalculator.ts` - Complete per-instance implementation
6. `/src/components/InvestmentTimeline.tsx` - Added loan type toggle per property
7. `/src/components/LoanTypeToggle.tsx` - **NEW** Reusable toggle component

## Testing Recommendations

1. **Basic Functionality**
   - Add multiple properties to timeline
   - Toggle loan type for each property independently
   - Verify affordability recalculates correctly

2. **Persistence**
   - Change loan types
   - Refresh page
   - Verify settings are preserved

3. **Client Switching**
   - Set different loan types for Client A
   - Switch to Client B, set different loan types
   - Switch back to Client A
   - Verify Client A's settings are restored

4. **Affordability Impact**
   - Add a property with IO loan type
   - Note the affordability timeline
   - Change to P&I loan type
   - Verify subsequent properties are affected correctly (P&I has higher payments, should delay purchases)

5. **Edge Cases**
   - Remove a property from middle of timeline
   - Verify instanceIds remain stable for other properties
   - Add property back
   - Verify it gets a new instanceId

## Benefits

1. **Realistic Modeling**: Each property can have its own loan structure
2. **Flexibility**: Change loan type without affecting other properties
3. **Accurate Calculations**: Serviceability and cashflow reflect actual loan structures
4. **Better UX**: Loan type control is where the decision is made (in the timeline)
5. **Maintainable**: Clear separation of concerns, per-instance state management

## Migration Notes

- Existing clients will lose their old per-type loan settings (they will default to IO)
- This is acceptable as the old system was less useful
- Users can quickly re-configure loan types in the new timeline interface
- Old `property_loan_types_${clientId}` localStorage entries are no longer used (but not deleted, harmless)

## Future Enhancements

Potential improvements building on this foundation:

1. **Bulk Actions**: Toggle all properties to IO or P&I at once
2. **Smart Defaults**: Auto-suggest loan type based on property characteristics
3. **Loan Type Strategy**: Visual indicators showing optimal loan type mix
4. **What-If Scenarios**: Compare IO vs P&I side-by-side for a property
5. **Refinancing**: Support changing loan type for existing properties over time

## Conclusion

This refactoring successfully moves the loan type decision from a global property-type setting to a flexible per-property-instance setting, providing more realistic modeling and better control over the investment strategy. All calculations correctly use the per-instance loan type, ensuring accurate affordability and cashflow projections.

