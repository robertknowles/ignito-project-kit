# Acquisition Costs Implementation Summary

## Overview
Successfully replaced the hardcoded £40,000 deposit buffer with a detailed costs calculation engine that calculates stamp duty, LMI (Lenders Mortgage Insurance), legal fees, inspection fees, and other acquisition costs based on property-specific parameters.

## Changes Made

### 1. New Cost Calculator Utility
**File**: `src/utils/costsCalculator.ts` (NEW)

**Features**:
- **Stamp Duty Calculation**: Progressive bracket-based calculation for NSW, VIC, and QLD
- **LMI Calculation**: Tiered rates based on LVR (Loan-to-Value Ratio)
  - LVR ≤ 80%: No LMI
  - LVR 80-85%: 1% of loan amount
  - LVR 85-90%: 2% of loan amount
  - LVR 90-95%: 4% of loan amount
- **Fixed Costs**:
  - Legal Fees: £2,000
  - Inspection Fees: £650 (building + pest)
  - Other Fees: £1,500 (searches, registration, settlement)
- **First Home Buyer Exemptions**: Built-in support for FHB concessions (simplified)

**Key Functions**:
```typescript
calculateAcquisitionCosts(params: CostCalculationParams): AcquisitionCosts
calculateLVR(propertyPrice: number, deposit: number): number
formatCostsBreakdown(costs: AcquisitionCosts): string
```

### 2. Type Definitions Updated
**Files**: 
- `src/types/property.ts`
- `src/contexts/PropertySelectionContext.tsx`

**Changes**:
- Added `state?: string` field to `PropertyPurchase`, `PropertyType`, and `TimelineProperty` interfaces
- Added `acquisitionCosts` object to `TimelineProperty` with breakdown of all costs
- Added `totalCashRequired` field (deposit + acquisition costs)

### 3. Affordability Calculator Integration
**File**: `src/hooks/useAffordabilityCalculator.ts`

**Changes** (4 locations updated):
1. **Line ~360**: In `checkAffordability()` function - Calculate acquisition costs for affordability test
2. **Line ~792**: In main timeline calculation - Calculate costs when creating timeline properties
3. **Line ~846**: Add acquisition costs to `TimelineProperty` object
4. **Line ~950**: In `calculateAffordabilityForPeriod()` callback - Calculate costs for period-specific checks

**Key Implementation**:
```typescript
const acquisitionCosts = calculateAcquisitionCosts({
  propertyPrice: property.cost,
  loanAmount: newLoanAmount,
  lvr: (newLoanAmount / property.cost) * 100,
  state: property.state || 'NSW',
  isFirstHomeBuyer: false,
});

const totalCashRequired = property.depositRequired + acquisitionCosts.total;
```

### 4. Property State Configuration
**File**: `src/contexts/PropertySelectionContext.tsx`

**Changes**:
- All properties now default to `state: 'NSW'`
- Can be customized per property type in the future

### 5. UI Updates - Decision Engine
**File**: `src/components/DecisionEngineView.tsx`

**Changes**:
- Added acquisition cost fields to the `purchases` array in year breakdown data:
  - `stampDuty`
  - `lmi`
  - `legalFees`
  - `inspectionFees`
  - `otherFees`
  - `totalAcquisitionCosts`

### 6. UI Updates - Breakdown Table
**File**: `src/components/AffordabilityBreakdownTable.tsx`

**Changes**:
1. **"This Purchase Funding" Section**: Added detailed acquisition costs breakdown
   - Stamp Duty
   - LMI (conditionally displayed if > 0)
   - Legal & Inspections (combined)
   - Other Fees
   - Total Costs
   
2. **Updated Calculations**: Replaced all hardcoded `40000` references with dynamic `totalAcquisitionCosts`
   - Total Funds Used
   - Total Sourced
   - Remaining After Purchase calculations

3. **Key Assumptions Section**: Changed "Deposit Buffer: £40,000" to "Acquisition Costs: Stamp Duty + LMI + Fees"

## Cost Calculation Examples

### Scenario 1: NSW Property, £350k, 80% LVR
- **Stamp Duty**: ~£10,000 (NSW progressive rates)
- **LMI**: £0 (LVR = 80%, no LMI required)
- **Legal Fees**: £2,000
- **Inspection Fees**: £650
- **Other Fees**: £1,500
- **Total Costs**: ~£14,150

### Scenario 2: VIC Property, £500k, 90% LVR
- **Stamp Duty**: ~£25,000 (VIC progressive rates)
- **LMI**: ~£9,000 (2% of £450k loan)
- **Legal Fees**: £2,000
- **Inspection Fees**: £650
- **Other Fees**: £1,500
- **Total Costs**: ~£38,150

### Scenario 3: First Home Buyer, NSW, £600k
- **Stamp Duty**: £0 (FHB exemption for properties < £650k in NSW)
- **LMI**: Varies based on LVR
- **Other Fees**: £4,150
- **Total Costs**: ~£4,150 (plus LMI if LVR > 80%)

## Impact on Affordability Tests

### Before:
- Fixed £40,000 buffer subtracted from available funds
- No differentiation between property values or states
- LMI and stamp duty not calculated

### After:
- Dynamic calculation based on:
  - Property price
  - Loan amount
  - LVR
  - State/region
  - First home buyer status
- More accurate cash requirements
- Better representation of actual acquisition costs

## Deposit Test Formula

**Old**:
```
canAffordDeposit = (availableFunds - 40000) >= property.depositRequired
```

**New**:
```
totalCashRequired = property.depositRequired + acquisitionCosts.total
canAffordDeposit = availableFunds >= totalCashRequired
```

## Future Enhancements

1. **State Selection**: Add UI to select property state (currently defaults to NSW)
2. **First Home Buyer Toggle**: Add profile setting to enable FHB concessions
3. **Custom Cost Overrides**: Allow manual override of legal/inspection/other fees
4. **More States**: Add stamp duty rates for SA, WA, NT, TAS, ACT
5. **LMI Provider Selection**: Different LMI providers have different rate structures
6. **Stamp Duty Concessions**: More detailed implementation of state-specific concessions
7. **Foreign Buyer Surcharge**: Add calculation for foreign investor stamp duty surcharge
8. **Off-the-Plan Concessions**: Some states offer concessions for new builds

## Testing Recommendations

1. Test with various property prices across different states
2. Verify LMI calculation at different LVR thresholds
3. Test first home buyer exemptions
4. Ensure UI displays costs correctly in Decision Engine
5. Verify deposit test calculations match new formula
6. Check that timeline calculations still work correctly
7. Test with multiple properties purchased in same year

## Files Modified

1. ✅ `src/utils/costsCalculator.ts` (NEW)
2. ✅ `src/types/property.ts`
3. ✅ `src/contexts/PropertySelectionContext.tsx`
4. ✅ `src/hooks/useAffordabilityCalculator.ts`
5. ✅ `src/components/DecisionEngineView.tsx`
6. ✅ `src/components/AffordabilityBreakdownTable.tsx`

## No Breaking Changes

All changes are backward compatible:
- Optional fields use `?` notation
- Fallback values provided where needed
- Existing functionality preserved
- UI gracefully handles missing cost data

## Linter Status

✅ All files pass linting with no errors or warnings.

