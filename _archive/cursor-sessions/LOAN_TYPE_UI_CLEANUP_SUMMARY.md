# Loan Type UI Cleanup - Assumptions Page

## Summary

Completed the final cleanup of the loan type refactoring by removing all loan type UI elements from the Data Assumptions page.

## Changes Made

### 1. DataAssumptions.tsx - Property Assumptions Table

**Removed:**
- "Loan Type" column header from the property assumptions table
- IO/P&I toggle buttons for each property type
- All related click handlers and state references

**Before:**
```
| Property Type | Average Cost | Yield % | Growth % | Deposit % | Loan Type      |
|--------------|--------------|---------|----------|-----------|----------------|
| Units/Apts   | $450,000     | 4.5%    | 6%       | 20%       | [IO] [P&I]    |
```

**After:**
```
| Property Type | Average Cost | Yield % | Growth % | Deposit % |
|--------------|--------------|---------|----------|-----------|
| Units/Apts   | $450,000     | 4.5%    | 6%       | 20%       |
```

### 2. DataAssumptions.tsx - Custom Blocks Table

**Removed:**
- "Loan Type" column header from the custom blocks table
- Display of loan type (showing "Interest Only" or "Principal & Interest")

**Before:**
```
| Property Name | Price     | Yield % | Growth % | LVR % | Loan Type    | Actions |
|--------------|-----------|---------|----------|-------|--------------|---------|
| Custom Apt   | $350,000  | 7%      | 5%       | 80%   | Interest Only| Delete  |
```

**After:**
```
| Property Name | Price     | Yield % | Growth % | LVR % | Actions |
|--------------|-----------|---------|----------|-------|---------|
| Custom Apt   | $350,000  | 7%      | 5%       | 80%   | Delete  |
```

### 3. CustomBlockModal.tsx

**Removed:**
- Loan type toggle UI section from the modal
- `loanType` from formData state
- All UI handlers for loan type selection

**Kept:**
- `loanType: 'IO' | 'PI'` in the CustomPropertyBlock interface (for data structure compatibility)
- Hardcoded default: `loanType: 'IO'` when creating the block

**Before:** Modal had a loan type selector with IO/P&I buttons

**After:** Modal defaults all custom blocks to IO, loan type is managed per-instance in the timeline

## Rationale

Since loan types are now managed **per-property instance** in the Investment Timeline (not per property type), these UI elements in the assumptions page were:
1. **Confusing**: Suggested loan type was a global setting
2. **Non-functional**: Settings had no effect (overridden by timeline-based settings)
3. **Redundant**: Each timeline property has its own toggle now

## User Experience Impact

### Before the Full Refactor
- User sets loan type in Assumptions → applies to ALL instances of that property type
- Inflexible, unrealistic

### After the Full Refactor
- User sees clean assumptions page (no loan type)
- User goes to Dashboard → Investment Timeline
- Each property card has its own IO/P&I toggle
- Full flexibility, realistic modeling

## Data Structure Notes

The `loanType` field still exists in:
- `PropertyType` interface (defaults to 'IO' from assumptions)
- `CustomPropertyBlock` interface (defaults to 'IO')
- `TimelineProperty` interface (managed per-instance)

However, only the `TimelineProperty.loanType` (per-instance) is actually used in calculations.

## Files Modified

1. `/src/pages/DataAssumptions.tsx`
   - Removed "Loan Type" column from property assumptions table
   - Removed "Loan Type" column from custom blocks table
   - Removed all loan type toggle UI elements

2. `/src/components/CustomBlockModal.tsx`
   - Removed loan type selector from modal
   - Removed `loanType` from form state
   - Hardcoded default to 'IO' in save handler

## Verification

✅ No linter errors
✅ No references to loan type UI in DataAssumptions.tsx
✅ CustomBlockModal still creates valid blocks (with default IO)
✅ All loan type management now happens in the timeline

## Consistency Check

All loan type UI is now in the correct location:

| Location                  | Has Loan Type UI | Notes                              |
|--------------------------|------------------|-------------------------------------|
| Data Assumptions Page    | ❌ No            | Clean property type definitions     |
| Property Building Blocks | ❌ No            | Clean property selection            |
| Custom Block Modal       | ❌ No            | Simple block creation              |
| Investment Timeline      | ✅ Yes           | Per-property instance toggles      |

## Complete Refactoring Status

✅ **Part 1**: Removed per-type logic from context and components
✅ **Part 2**: Implemented per-instance logic in affordability calculator
✅ **Part 3**: Added UI toggles in Investment Timeline
✅ **Part 4**: Removed UI from Assumptions page (this update)

The loan type refactoring is now **100% complete** with a clean, consistent architecture.

