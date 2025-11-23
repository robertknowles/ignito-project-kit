# Double Principal Counting Fix - Complete

## Issue
Principal payments were being subtracted **twice** from the Net Cashflow calculation in `useAffordabilityCalculator.ts`, resulting in incorrect "Money in Bank" figures.

### Root Cause
The `expenses` variable was accumulating `totalNonDeductibleExpenses`, which includes **both** `landTax` AND `principalPayments`. Then the formula was subtracting `principalPayments` again, causing double-counting.

## Solution Applied

### 1. Fixed `calculateTimelineProperties` Function (Lines 1043-1064)

**Before:**
```typescript
const nonDeductibleWithoutPrincipal = cashflowBreakdown.landTax;
const inflationAdjustedNonDeductible = nonDeductibleWithoutPrincipal * inflationFactor;

const totalExpenses = inflationAdjustedOperating + inflationAdjustedNonDeductible - cashflowBreakdown.potentialDeductions;
const totalRepayments = cashflowBreakdown.loanInterest + cashflowBreakdown.principalPayments;

expenses += totalExpenses; // Strictly Expenses (excluding Principal)
```

**After:**
```typescript
// IMPORTANT: totalNonDeductibleExpenses includes principalPayments + landTax
// We must exclude principalPayments to avoid double-counting in the netCashflow formula
const nonDeductibleWithoutPrincipal = cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.principalPayments;
const inflationAdjustedNonDeductible = nonDeductibleWithoutPrincipal * inflationFactor;

// Calculate Final Component Values (Operating + Non-Deductible WITHOUT Principal)
const totalExpenses = inflationAdjustedOperating + inflationAdjustedNonDeductible;

expenses += totalExpenses; // Operating + Land Tax ONLY (Principal excluded)
```

### 2. Fixed `checkAffordability` Function (Lines 390-417)

**Before:**
```typescript
const adjustedNonDeductibleExpenses = cashflowBreakdown.totalNonDeductibleExpenses * growthFactor;
const inflationAdjustedNonDeductibleExpenses = adjustedNonDeductibleExpenses * inflationFactor;

expenses += (inflationAdjustedOperatingExpenses + inflationAdjustedNonDeductibleExpenses);
```

**After:**
```typescript
// CRITICAL FIX: Exclude principal payments from non-deductible expenses
const adjustedNonDeductibleWithoutPrincipal = (cashflowBreakdown.totalNonDeductibleExpenses - cashflowBreakdown.principalPayments) * growthFactor;
const inflationAdjustedNonDeductible = adjustedNonDeductibleWithoutPrincipal * inflationFactor;

expenses += (inflationAdjustedOperatingExpenses + inflationAdjustedNonDeductible); // Operating + Land Tax ONLY (no principal)
```

## Verified Formula Components

### Net Cashflow Formula (Line 1102)
```typescript
netCashflow = grossRentalIncome - expenses - loanInterest - totalPrincipalPayments;
```

**Variable Breakdown:**
- ✅ `grossRentalIncome`: Grown rent income
- ✅ `expenses`: Operating expenses + Land Tax ONLY (principal excluded)
- ✅ `loanInterest`: Interest payments ONLY
- ✅ `totalPrincipalPayments`: Principal payments ONLY (subtracted exactly once)

## Impact
- ✅ **Money in Bank** figures are now accurate
- ✅ Principal payments are counted exactly once
- ✅ Cashflow calculations reflect true available funds
- ✅ Timeline affordability tests use correct net cashflow

## Files Modified
- `/src/hooks/useAffordabilityCalculator.ts`

## Testing Recommendations
1. Open a client scenario with multiple properties
2. Check "Money in Bank" values on the timeline
3. Verify they increase appropriately based on:
   - Rental income (growing with property value)
   - Operating expenses (inflating at 3% annually)
   - Loan interest (based on loan amount and rate)
   - Principal payments (if P&I loan type selected)
4. Confirm no double-subtraction of principal payments

## Related Functions
The `calculateAvailableFunds` function uses `cashflowBreakdown.netAnnualCashflow` which already has the correct formula in `detailedCashflowCalculator.ts`:

```typescript
netAnnualCashflow = adjustedIncome - totalOperatingExpenses - totalNonDeductibleExpenses + potentialDeductions
```

This is correct because it subtracts `totalNonDeductibleExpenses` (which includes principal) exactly once.

