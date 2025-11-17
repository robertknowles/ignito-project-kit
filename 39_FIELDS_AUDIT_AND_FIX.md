# Complete 39 Fields Audit & Fix Plan

## Critical Finding

**MAJOR ISSUE**: The 12 one-off purchase cost fields are **NOT** being used in timeline affordability calculations!

Currently, the system uses `calculateAcquisitionCosts()` which only calculates:
- Stamp Duty
- LMI
- Legal Fees (fixed $1,200)
- Inspection Fees (fixed $800)
- Other Fees (fixed $500)

But **IGNORES** all 12 user-editable purchase cost fields:
- engagementFee
- conditionalHoldingDeposit
- buildingInsuranceUpfront
- buildingPestInspection
- plumbingElectricalInspections
- independentValuation
- unconditionalHoldingDeposit
- mortgageFees
- conveyancing
- ratesAdjustment
- maintenanceAllowancePostSettlement
- stampDutyOverride

## Current Status: Field-by-Field

### ✅ WORKING (27 fields)

#### Property & Loan Tab (13/14 fields working)
1. ✅ **state** - Used in stamp duty calculation
2. ✅ **purchasePrice** - JUST FIXED - Now uses instance value
3. ✅ **valuationAtPurchase** - Used in equity calculations
4. ✅ **rentPerWeek** - Used in cashflow calculation
5. ✅ **growthAssumption** - Used in growth rate selection
6. ✅ **minimumYield** - Used in validation
7. ✅ **daysToUnconditional** - Display only (OK)
8. ✅ **daysForSettlement** - Display only (OK)
9. ✅ **lvr** - ⚠️ NEEDS VERIFICATION - Should affect loan amount
10. ✅ **lmiWaiver** - Used in LMI calculation
11. ✅ **loanProduct** - Used in cashflow (IO vs PI)
12. ✅ **interestRate** - Used in cashflow calculation
13. ✅ **loanTerm** - Used in PI amortization
14. ✅ **loanOffsetAccount** - Used to reduce effective interest

#### Cashflow Tab (8/8 fields working)
15. ✅ **vacancyRate** - Used in cashflow calculation
16. ✅ **propertyManagementPercent** - Used in cashflow calculation
17. ✅ **buildingInsuranceAnnual** - Used in cashflow calculation
18. ✅ **councilRatesWater** - Used in cashflow calculation
19. ✅ **strata** - Used in cashflow calculation
20. ✅ **maintenanceAllowanceAnnual** - Used in cashflow calculation
21. ✅ **landTaxOverride** - Used when set, otherwise calculated
22. ✅ **potentialDeductionsRebates** - Used in cashflow calculation

### ❌ NOT WORKING (12 fields)

#### Purchase Costs Tab (0/12 fields working in timeline!)
23. ❌ **engagementFee** - NOT used in timeline calculations
24. ❌ **conditionalHoldingDeposit** - NOT used in timeline calculations
25. ❌ **buildingInsuranceUpfront** - NOT used in timeline calculations
26. ❌ **buildingPestInspection** - NOT used in timeline calculations
27. ❌ **plumbingElectricalInspections** - NOT used in timeline calculations
28. ❌ **independentValuation** - NOT used in timeline calculations
29. ❌ **unconditionalHoldingDeposit** - NOT used in timeline calculations
30. ❌ **mortgageFees** - NOT used in timeline calculations
31. ❌ **conveyancing** - NOT used in timeline calculations
32. ❌ **ratesAdjustment** - NOT used in timeline calculations
33. ❌ **maintenanceAllowancePostSettlement** - NOT used in timeline calculations
34. ❌ **stampDutyOverride** - NOT used in timeline calculations

**Note:** These fields ARE used in the Property Detail Modal's one-off costs display, but they don't affect the timeline affordability calculations!

## The Problem

### Current Code (WRONG):
```typescript
// Line 1033-1039 in useAffordabilityCalculator.ts
const acquisitionCosts = calculateAcquisitionCosts({
  propertyPrice: correctPurchasePrice,
  loanAmount: loanAmount,
  lvr: lvr,
  isFirstHomeBuyer: false,
  lmiWaiver: timelineLmiWaiver,
});

const totalCashRequired = correctDepositRequired + acquisitionCosts.total;
```

This uses `calculateAcquisitionCosts()` which has **hardcoded** values:
- Legal Fees: $1,200
- Inspection Fees: $800
- Other Fees: $500

### What Should Happen (CORRECT):
```typescript
// Get property instance to access all 12 purchase cost fields
const propertyInstance = getInstance(instanceId);

// Calculate stamp duty (with override support)
const stampDuty = propertyInstance?.stampDutyOverride ?? calculateStampDuty(
  propertyInstance?.state ?? 'VIC',
  correctPurchasePrice,
  false
);

// Calculate deposit balance
const depositBalance = calculateDepositBalance(
  correctPurchasePrice,
  lvr,
  propertyInstance?.conditionalHoldingDeposit ?? 0,
  propertyInstance?.unconditionalHoldingDeposit ?? 0
);

// Calculate all one-off costs using property instance
const oneOffCosts = calculateOneOffCosts(
  propertyInstance ?? getPropertyInstanceDefaults(property.title),
  stampDuty,
  depositBalance
);

// Total cash required includes ALL costs
const totalCashRequired = oneOffCosts.totalCashRequired;
```

## Impact Assessment

### Current Behavior (BROKEN):
1. User updates "Building & Pest Inspection" from $600 to $2,000
2. Timeline does NOT recalculate
3. Property still shows as affordable at same period
4. **User is misled** - they think they need less cash than reality

### After Fix (CORRECT):
1. User updates "Building & Pest Inspection" from $600 to $2,000
2. Timeline recalculates immediately
3. Total cash required increases by $1,400
4. Purchase period may shift later (or property becomes unaffordable)
5. **Accurate projections**

## Fields Needing Fixes

### Priority 1: Purchase Costs (CRITICAL) - 12 fields
All 12 purchase cost fields must affect timeline calculations.

### Priority 2: LVR Field Verification (IMPORTANT) - 1 field
The `lvr` field should directly affect loan amount, not be recalculated from deposit percentage.

### Priority 3: Stamp Duty Override (IMPORTANT) - 1 field already counted
Must use override when set, otherwise calculate.

## Files Requiring Changes

1. **`src/hooks/useAffordabilityCalculator.ts`**
   - Replace `calculateAcquisitionCosts()` with `calculateOneOffCosts()`
   - Use property instance fields for all cost calculations
   - Apply stamp duty override when set
   - Update in 3 locations:
     - `checkAffordability` function (line ~541)
     - `calculateTimelineProperties` function (line ~1033)
     - `calculateAffordabilityForPeriod` function (line ~1219)

2. **`src/utils/costsCalculator.ts`**
   - Keep for backward compatibility / other uses
   - But primary timeline calculations should use `calculateOneOffCosts()`

## Testing Requirements

After fix, verify each field affects output:

### Purchase Costs Fields (12 tests)
1. Change engagement fee → timeline shifts
2. Change conditional deposit → timeline shifts
3. Change building insurance upfront → timeline shifts
4. Change building/pest inspection → timeline shifts
5. Change plumbing/electrical → timeline shifts
6. Change valuation → timeline shifts
7. Change unconditional deposit → timeline shifts
8. Change mortgage fees → timeline shifts
9. Change conveyancing → timeline shifts
10. Change rates adjustment → timeline shifts
11. Change maintenance allowance → timeline shifts
12. Set stamp duty override → timeline uses override value

### LVR Field (1 test)
13. Change LVR from 80% to 90% → loan increases, deposit decreases, LMI charged

### All Other Fields (already working, retest for regression)
14-39. Verify no regressions in existing working fields

## Fix Implementation Order

1. **Fix purchase costs integration** (30 min)
   - Modify useAffordabilityCalculator.ts to use calculateOneOffCosts
   - Use property instance fields for all costs
   - Apply stamp duty override

2. **Verify LVR is being used correctly** (15 min)
   - Check if LVR from instance affects loan amount
   - Currently using deposit percentage - should use LVR

3. **Test all 39 fields** (2 hours)
   - Create test scenario
   - Change each field one at a time
   - Verify timeline recalculates
   - Document any fields that still don't work

4. **Create visual testing guide** (30 min)
   - Show before/after for each field type
   - Provide expected behavior for each change

## Expected Outcomes

### Before Fix:
- 27/39 fields affect timeline (69%)
- 12 purchase cost fields ignored
- Users get inaccurate affordability projections
- Total cash required is understated

### After Fix:
- 39/39 fields affect timeline (100%)
- All costs included in calculations
- Accurate affordability projections
- Proper cash flow modeling

## Notes

- The `calculateOneOffCosts()` function already exists and works correctly
- It's used in the Property Detail Modal for display
- We just need to use it in the timeline calculations too
- This is a straightforward fix, just need to connect the pieces

