# Affordability Calculator: Fixing the 30% Rule Problem

## Problem Summary

The 39 new property inputs are being stored and partially used, but the core affordability calculations still rely on the legacy **"30% expense rule"** in three critical locations. This means the detailed expense inputs (property management, insurance, council rates, strata, maintenance, land tax) are being ignored when calculating:

1. Available funds for future purchases
2. Portfolio cashflow in the affordability check
3. Property scoring for gap rule decisions

## Identified Issues

### Issue 1: `calculateAvailableFunds` function (Line 214-216)

**Current Code:**
```typescript
// Calculate expenses (30% of rental income + 3% annual inflation)
const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
const periodExpenses = periodRentalIncome * 0.30 * inflationFactor;
```

**Problem:** This calculates cashflow reinvestment (which feeds into available deposit funds) using a flat 30% rule, completely ignoring the user's detailed expense inputs.

**Impact:** The system thinks you have more (or less) cash available than you actually do, leading to incorrect purchase timing.

---

### Issue 2: `checkAffordability` function (Line 355-357)

**Current Code:**
```typescript
// Calculate expenses (30% of rental income + 3% annual inflation)
const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
const propertyExpenses = rentalIncome * 0.30 * inflationFactor;
```

**Problem:** This calculates the portfolio's total expenses when checking serviceability, again using the 30% rule.

**Impact:** The serviceability test is inaccurate. A property with high strata fees or low management fees won't be reflected correctly.

---

### Issue 3: `calculatePropertyScore` function (Line 303-305)

**Current Code:**
```typescript
// Calculate expenses (30% of rental income + 3% annual inflation)
const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
const expenses = rentalIncome * 0.30 * inflationFactor;
```

**Problem:** This is used for the "gap rule" logic to decide which property to prioritize. It's also using the 30% rule.

**Impact:** Property prioritization doesn't account for actual expense profiles.

---

## Recommended Solution

Replace all three instances with calls to `calculateDetailedCashflow`. However, there's a challenge: **we need property instance data**, which may not exist yet for properties that haven't been customized.

### Strategy: Fallback Logic

1. **Try to get the property instance** using `getInstance(purchase.instanceId)`
2. **If it exists**, use `calculateDetailedCashflow` with the custom inputs
3. **If it doesn't exist**, create a temporary instance using `getPropertyInstanceDefaults` and use that
4. This ensures we always use the detailed calculator, either with custom data or sensible defaults

---

## Specific Code Changes

### Change 1: Fix `calculateAvailableFunds` (Lines 191-221)

**Replace this section:**
```typescript
previousPurchases.forEach(purchase => {
  if (purchase.period < period) {
    const periodsOwned = period - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    
    if (propertyData) {
      const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const portfolioSize = previousPurchases.filter(p => p.period < period).length;
      const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
      const annualRentalIncome = currentValue * yieldRate * recognitionRate;
      const periodRentalIncome = annualRentalIncome / PERIODS_PER_YEAR;
      
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      const loanType = purchase.loanType || 'IO';
      const annualLoanPayment = calculateAnnualLoanPayment(purchase.loanAmount, interestRate, loanType);
      const periodLoanPayment = annualLoanPayment / PERIODS_PER_YEAR;
      
      // OLD: 30% rule
      const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
      const periodExpenses = periodRentalIncome * 0.30 * inflationFactor;
      
      const propertyCashflow = periodRentalIncome - periodLoanPayment - periodExpenses;
      netCashflow += propertyCashflow;
    }
  }
});
```

**With this:**
```typescript
previousPurchases.forEach(purchase => {
  if (purchase.period < period) {
    const periodsOwned = period - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    
    if (propertyData) {
      // Get or create property instance
      let propertyInstance = getInstance(purchase.instanceId);
      if (!propertyInstance) {
        propertyInstance = getPropertyInstanceDefaults(purchase.title);
      }
      
      // Apply any overrides and calculate land tax
      const propertyDetails = applyPropertyOverrides(propertyData, propertyInstance);
      const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      
      const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
        propertyDetails.state,
        currentValue
      );
      
      const propertyWithLandTax = {
        ...propertyDetails,
        landTaxOverride: landTax
      };
      
      // Use detailed cashflow calculator
      const cashflowBreakdown = calculateDetailedCashflow(
        propertyWithLandTax,
        purchase.loanAmount
      );
      
      // Apply rental recognition rate for serviceability
      const portfolioSize = previousPurchases.filter(p => p.period < period).length;
      const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
      const adjustedCashflow = cashflowBreakdown.netAnnualCashflow * recognitionRate;
      
      const periodCashflow = adjustedCashflow / PERIODS_PER_YEAR;
      netCashflow += periodCashflow;
    }
  }
});
```

---

### Change 2: Fix `checkAffordability` (Lines 338-365)

**Replace this section:**
```typescript
previousPurchases.forEach(purchase => {
  if (purchase.period <= currentPeriod) {
    const periodsOwned = currentPeriod - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    
    if (propertyData) {
      const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      const yieldRate = parseFloat(propertyData.yield) / 100;
      const portfolioSize = previousPurchases.filter(p => p.period < currentPeriod).length;
      const recognitionRate = calculateRentalRecognitionRate(portfolioSize);
      const rentalIncome = currentValue * yieldRate * recognitionRate;
      const interestRate = parseFloat(globalFactors.interestRate) / 100;
      const loanType = purchase.loanType || 'IO';
      const propertyLoanPayment = calculateAnnualLoanPayment(purchase.loanAmount, interestRate, loanType);
      // OLD: 30% rule
      const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
      const propertyExpenses = rentalIncome * 0.30 * inflationFactor;
      
      grossRentalIncome += rentalIncome;
      loanInterest += propertyLoanPayment;
      expenses += propertyExpenses;
      netCashflow += (rentalIncome - propertyLoanPayment - propertyExpenses);
    }
  }
});
```

**With this:**
```typescript
previousPurchases.forEach(purchase => {
  if (purchase.period <= currentPeriod) {
    const periodsOwned = currentPeriod - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    
    if (propertyData) {
      // Get or create property instance
      let propertyInstance = getInstance(purchase.instanceId);
      if (!propertyInstance) {
        propertyInstance = getPropertyInstanceDefaults(purchase.title);
      }
      
      const propertyDetails = applyPropertyOverrides(propertyData, propertyInstance);
      const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      
      const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
        propertyDetails.state,
        currentValue
      );
      
      const propertyWithLandTax = {
        ...propertyDetails,
        landTaxOverride: landTax
      };
      
      // Use detailed cashflow calculator
      const cashflowBreakdown = calculateDetailedCashflow(
        propertyWithLandTax,
        purchase.loanAmount
      );
      
      grossRentalIncome += cashflowBreakdown.adjustedIncome;
      loanInterest += cashflowBreakdown.loanInterest + cashflowBreakdown.principalPayments;
      expenses += cashflowBreakdown.totalOperatingExpenses + cashflowBreakdown.totalNonDeductibleExpenses;
      netCashflow += cashflowBreakdown.netAnnualCashflow;
    }
  }
});
```

---

### Change 3: Fix `calculatePropertyScore` (Lines 290-318)

**Replace this section:**
```typescript
const yieldRate = parseFloat(propertyData.yield) / 100;
const rentalIncome = currentValue * yieldRate;
const interestRate = parseFloat(globalFactors.interestRate) / 100;
const loanType = purchase.loanType || 'IO';
const annualLoanPayment = calculateAnnualLoanPayment(purchase.loanAmount, interestRate, loanType);
// OLD: 30% rule
const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
const expenses = rentalIncome * 0.30 * inflationFactor;
const netCashflow = rentalIncome - annualLoanPayment - expenses;
```

**With this:**
```typescript
// Get or create property instance
let propertyInstance = getInstance(purchase.instanceId);
if (!propertyInstance) {
  propertyInstance = getPropertyInstanceDefaults(purchase.title);
}

const propertyDetails = applyPropertyOverrides(propertyData, propertyInstance);
const landTax = propertyDetails.landTaxOverride ?? calculateLandTax(
  propertyDetails.state,
  currentValue
);

const propertyWithLandTax = {
  ...propertyDetails,
  landTaxOverride: landTax
};

// Use detailed cashflow calculator
const cashflowBreakdown = calculateDetailedCashflow(
  propertyWithLandTax,
  purchase.loanAmount
);

const netCashflow = cashflowBreakdown.netAnnualCashflow;
```

---

## Additional Required Import

Add this import at the top of `useAffordabilityCalculator.ts`:

```typescript
import { getPropertyInstanceDefaults } from '../utils/propertyInstanceDefaults';
```

---

## Testing Checklist

After making these changes:

1. ✅ Create a property with custom high strata fees - verify cashflow is lower
2. ✅ Create a property with low management fees - verify cashflow is higher
3. ✅ Check that purchase timing changes based on actual expenses
4. ✅ Verify the decision engine shows accurate expense breakdowns
5. ✅ Confirm that properties without custom inputs still work (using defaults)

---

## Expected Impact

- **More accurate purchase timing:** Properties will be affordable sooner or later based on real expense profiles
- **Better cashflow projections:** The "available funds" calculation will reflect actual property performance
- **Improved serviceability tests:** High-expense properties will correctly show as harder to service
- **Full utilization of 39 inputs:** Every field the user edits will now affect the decision engine

This is the critical fix needed to make the new input system fully functional.
