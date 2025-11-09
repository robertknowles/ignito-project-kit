# Auto-Create Property Instances Implementation

## Overview

This document describes the implementation of automatic property instance creation when properties are added to the timeline. This ensures that the affordability calculator never falls back to the 30% rule, improving calculation accuracy from the start.

## Problem Statement

Previously, property instances were only created when the user manually opened the property detail modal. If an instance didn't exist, the affordability calculator would fall back to the old 30% expense rule:

```typescript
// OLD BEHAVIOR: Fallback to 30% rule
if (propertyInstance) {
  // Calculate detailed cashflow using all 39 inputs
  const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
  // ... detailed calculations
} else {
  // Fallback to old calculation if instance not found
  const expenses = rentalIncome * 0.30 * inflationFactor; // ❌ Less accurate
}
```

This reduced accuracy and created inconsistent results depending on whether the user had opened the property modal.

## Solution

The implementation now **automatically creates property instances** when properties are evaluated during timeline generation, ensuring detailed cashflow calculations are always used.

## Implementation Details

### File Modified

**`src/hooks/useAffordabilityCalculator.ts`**

### Changes Made

#### 1. Import `createInstance` from Context

```typescript
// Line 57: Extract createInstance from the PropertyInstanceContext
const { getInstance, createInstance, instances } = usePropertyInstance();
```

#### 2. Auto-Create Instances Before Affordability Check

```typescript
// Lines 833-840: In determineNextPurchasePeriod(), before checkAffordability()
// AUTO-CREATE PROPERTY INSTANCE: Ensure property instance exists (create if missing)
// This prevents fallback to the 30% rule by ensuring detailed cashflow calculations are always available
let propertyInstance = getInstance(property.instanceId);
if (!propertyInstance) {
  // Create instance from property type defaults
  createInstance(property.instanceId, property.title, period);
  propertyInstance = getInstance(property.instanceId);
}

const availableFunds = calculateAvailableFunds(period, currentPurchases);
const affordabilityResult = checkAffordability(property, availableFunds.total, currentPurchases, period);
```

#### 3. Update Dependency Array

```typescript
// Lines 1129-1145: Added createInstance and getInstance to useMemo dependencies
}, [
  selectionsHash,
  propertyTypes.length,
  profile.timelineYears,
  profile.borrowingCapacity,
  profile.depositPool,
  profile.annualSavings,
  calculatedValues.availableDeposit,
  globalFactors.interestRate,
  getPropertyData,
  propertyAssumptions,
  pauseBlocks,
  timelineLoanTypes,
  createInstance,  // ✅ Added
  getInstance      // ✅ Added
]);
```

## How It Works

### 1. Property Type Defaults

When a property instance is auto-created, it uses defaults from the `propertyInstanceDefaults.ts` utility:

```typescript
// src/utils/propertyInstanceDefaults.ts
export const getPropertyInstanceDefaults = (
  propertyType: string,
  globalLVR?: number,
  globalInterestRate?: number
): PropertyInstanceDetails => {
  const key = propertyTypeToKey(propertyType);
  const defaults = propertyDefaults[key as keyof typeof propertyDefaults];
  // Returns all 39 property instance fields with sensible defaults
};
```

### 2. Timeline Generation Flow

```
1. User selects properties (e.g., 3x Units/Apartments)
2. Timeline generation loop processes each property
3. For each period being evaluated:
   ├─ Check if instance exists
   ├─ If NOT → Auto-create with property type defaults ✅
   └─ Calculate detailed cashflow (never falls back to 30% rule)
4. Property appears on timeline with accurate calculations
```

### 3. Fallback Prevention

The detailed cashflow calculation now always finds an instance:

```typescript
// calculateAvailableFunds() - Line 209
const propertyInstance = getInstance(purchase.instanceId);

if (propertyInstance) {
  // ✅ Always TRUE now - uses detailed 39-input calculation
  const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, purchase.loanAmount);
  const propertyCashflow = cashflowBreakdown.netAnnualCashflow * growthFactor;
  netCashflow += propertyCashflow;
} else {
  // ❌ This path is now rarely/never hit
  const propertyExpenses = rentalIncome * 0.30 * inflationFactor;
}
```

## Benefits

### ✅ Improved Accuracy

- **All properties** now use detailed 39-input cashflow calculations
- No more 30% expense rule fallback
- Consistent calculations across the timeline

### ✅ Better User Experience

- Properties appear with accurate cashflow from the start
- No need to manually open property modals to "activate" calculations
- Results are predictable and reliable

### ✅ Maintains Customization

- Auto-created instances use sensible defaults
- Users can still customize later via the property detail modal
- Custom values override the defaults seamlessly

## Testing

### Test Scenario 1: Fresh Property Addition

1. **Create a new scenario** with fresh properties
2. **Add properties** to the selection (e.g., 3x Units/Apartments)
3. **Generate timeline** WITHOUT opening any property detail modals
4. **Verify** that timeline shows accurate cashflow calculations
5. **Check PropertyInstanceContext** - instances should be auto-created

### Test Scenario 2: Verify No 30% Rule Fallback

1. Open browser console
2. Generate timeline with new properties
3. **Search for fallback code execution** (look for console logs or breakpoints)
4. **Confirm** detailed cashflow calculations are used for all properties

### Test Scenario 3: Customization Still Works

1. Auto-create properties via timeline generation
2. Open property detail modal for one property
3. **Customize** values (e.g., change rent, expenses)
4. **Regenerate timeline**
5. **Verify** customized values are preserved and used in calculations

### Test Scenario 4: Multiple Property Types

1. Select properties of different types (Units, Houses, Duplexes)
2. Generate timeline
3. **Verify** each property type gets correct defaults:
   - Units/Apartments: 6.6% property management
   - Houses: Different strata/maintenance rates
   - Duplexes: Appropriate expense profiles

## Before vs After Comparison

### Before Implementation

```
❌ Property added → Timeline generated → No instance exists
  → Fallback to 30% expense rule
  → Inaccurate cashflow calculations
  → User must open modal to fix
```

### After Implementation

```
✅ Property added → Timeline generated → Instance auto-created
  → Uses detailed 39-input calculation
  → Accurate cashflow from the start
  → User can optionally customize later
```

## Code References

### Key Files

1. **`src/hooks/useAffordabilityCalculator.ts`** (Lines 833-840)
   - Auto-create logic before affordability check

2. **`src/contexts/PropertyInstanceContext.tsx`** (Lines 27-34)
   - `createInstance()` function that generates defaults

3. **`src/utils/propertyInstanceDefaults.ts`** (Lines 22-42)
   - Default values based on property type

4. **`src/utils/detailedCashflowCalculator.ts`**
   - 39-input cashflow calculation that's now always used

## Related Features

- **Property Instance Context**: Manages all property instances
- **Detailed Cashflow Calculator**: Uses 39 inputs for accurate calculations
- **Property Defaults**: JSON-based defaults for each property type
- **Affordability Calculator**: Main timeline generation logic

## Future Enhancements

### Potential Improvements

1. **Bulk Instance Creation**: Pre-create all instances when selections change
2. **Default Overrides**: Allow global default customization
3. **Instance Cloning**: Copy settings from one property to another
4. **Template System**: Save and reuse custom property configurations

## Summary

This implementation ensures that **every property on the timeline has an instance with accurate defaults**, eliminating the need for manual modal opening and preventing fallback to the less accurate 30% rule. The system remains flexible, allowing users to customize individual properties while providing sensible defaults automatically.

**Status**: ✅ **Implementation Complete** - Ready for Testing

