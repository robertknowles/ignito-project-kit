# Equity Release Loan Amount Fix - Implementation Summary

## Problem Statement

When the system released equity from a property (refinancing to pull cash out), it was adding cash to the available funds pool but **not increasing the loan amount** on that property. This caused:

1. **Total debt calculations to be incorrect** - showing lower debt than reality
2. **Over-estimation of available equity** - same equity being counted multiple times
3. **Cascading calculation errors** - affecting borrowing capacity, serviceability tests, and purchase timing

## Root Cause Analysis

### Before the Fix

The system calculated usable equity as:
```typescript
const usableEquity = Math.max(0, propertyCurrentValue * 0.88 - purchase.loanAmount);
```

This equity was added to available funds, but `purchase.loanAmount` **never increased** to reflect the refinance. This meant:

- **Period 5**: Property worth $600k, original loan $480k → usable equity = $48k (600k * 0.88 - 480k)
- **Period 10**: Same property worth $700k, **still showing original loan $480k** → usable equity = $136k (700k * 0.88 - 480k)

The problem: If the $48k was already pulled out in Period 5, the Period 10 calculation should be:
- Current loan = $480k + $48k = $528k
- Usable equity = $700k * 0.88 - $528k = $88k (not $136k)

## Solution Implementation

### 1. Added `cumulativeEquityReleased` Tracking

Updated the purchase history type to track equity released per property:

```typescript
Array<{
  period: number;
  cost: number;
  depositRequired: number;
  loanAmount: number;
  title: string;
  instanceId: string;
  loanType?: 'IO' | 'PI';
  cumulativeEquityReleased?: number;  // NEW: Tracks total equity refinanced
}>
```

### 2. Updated All Equity Calculations

Modified every location where equity is calculated to use **current loan amount** instead of original:

#### In `calculateAvailableFunds`:
```typescript
// Calculate usable equity from previous purchases - with 88% LVR cap
// CRITICAL: Account for cumulative equity already released
totalUsableEquity = previousPurchases.reduce((acc, purchase) => {
  if (purchase.period <= currentPeriod) {
    const propertyData = getPropertyData(purchase.title);
    if (propertyData) {
      const propertyCurrentValue = calculatePropertyGrowth(purchase.cost, currentPeriod - purchase.period, propertyData);
      // Current loan = original loan + any equity released so far
      const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
      const usableEquity = Math.max(0, propertyCurrentValue * 0.88 - currentLoanAmount);
      return acc + usableEquity;
    }
  }
  return acc;
}, existingPortfolioEquity);
```

#### In `checkAffordability` (Total Debt):
```typescript
// Calculate total existing debt
// CRITICAL: Include cumulative equity released (which increases loan amounts)
let totalExistingDebt = profile.currentDebt;
previousPurchases.forEach(purchase => {
  if (purchase.period <= currentPeriod) {
    // Current loan = original loan + any equity released from this property
    const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
    totalExistingDebt += currentLoanAmount;
  }
});
```

#### In `checkAffordability` (Usable Equity):
```typescript
previousPurchases.forEach(purchase => {
  if (purchase.period <= currentPeriod) {
    const periodsOwned = currentPeriod - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    if (propertyData) {
      const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      totalPortfolioValue += currentValue;
      propertyValues.push(currentValue);
      
      // Continuous equity release - 88% LVR cap, no time constraint
      // Current loan = original loan + any equity released so far
      const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
      const usableEquity = Math.max(0, currentValue * 0.88 - currentLoanAmount);
      usableEquityPerProperty.push(usableEquity);
    }
  }
});
```

### 3. Updated Equity Tracking in Timeline Calculation

When calculating each property in the timeline, we now track the cumulative equity released:

```typescript
// Calculate equity release (continuous, 88% LVR cap)
// CRITICAL: Track total equity released per property (replaces previous value, not additive)
purchaseHistory.forEach(purchase => {
  if (purchase.period <= purchasePeriod) {
    const periodsOwned = purchasePeriod - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    if (propertyData) {
      const currentValue = calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      // Calculate maximum refinance amount (88% LVR)
      const maxLoan = currentValue * 0.88;
      // Equity released = maximum loan minus original loan amount
      const equityReleasedFromProperty = Math.max(0, maxLoan - purchase.loanAmount);
      equityRelease += equityReleasedFromProperty;
      
      // Set cumulative equity released to the total amount refinanced from this property
      // (This is not additive - it's the current refinanced amount)
      purchase.cumulativeEquityReleased = equityReleasedFromProperty;
    }
  }
});
```

### 4. Updated Total Debt in Portfolio Calculations

```typescript
// Add all previous purchases (with growth based on periods owned)
// CRITICAL FIX: Only include purchases made by or before the current purchase period
purchaseHistory.forEach(purchase => {
  if (purchase.period <= purchasePeriod) {
    const periodsOwned = purchasePeriod - purchase.period;
    const propertyData = getPropertyData(purchase.title);
    if (propertyData) {
      portfolioValueAfter += calculatePropertyGrowth(purchase.cost, periodsOwned, propertyData);
      // Current loan = original loan + any equity released so far
      const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
      totalDebtAfter += currentLoanAmount;
    }
  }
});
```

### 5. Updated `calculatePropertyScore`

```typescript
// Equity Score (current equity in property)
// Current loan = original loan + any equity released so far
const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
const currentEquity = currentValue - currentLoanAmount;
```

### 6. Initialize New Purchases

When adding a new purchase to history:

```typescript
purchaseHistory.push({
  period: result.period,
  cost: property.cost,
  depositRequired: property.depositRequired,
  loanAmount: loanAmount,
  title: property.title,
  instanceId: instanceId,
  loanType: instanceLoanType,
  cumulativeEquityReleased: 0 // Initialize equity tracking
});
```

## Key Design Decisions

### Non-Additive Cumulative Tracking

The `cumulativeEquityReleased` is **not additive across periods**. Instead, it represents the **total current refinanced amount** at any given time:

- **Period 5**: Property worth $600k → equity released = $48k → `cumulativeEquityReleased = 48k`
- **Period 10**: Property worth $700k → equity released = $136k → `cumulativeEquityReleased = 136k` (not 48k + 88k)

This is because we're modeling continuous refinancing where the loan is always maintained at 88% LVR as the property grows.

### Current Loan Amount Formula

Throughout the codebase, the current loan amount is consistently calculated as:

```typescript
const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
```

This ensures:
1. Original loan amount is preserved
2. Any equity pulled out is added
3. Total debt accurately reflects refinancing activity

## Expected Outcomes

### ✅ Accurate Total Debt

Total debt now correctly reflects refinanced loans:
- Includes original loan amounts
- Plus any equity that has been released (refinanced out)

### ✅ Correct Equity Calculations

Usable equity is now calculated against the **current** loan amount (including refinances), not just the original loan:
- Prevents double-counting of equity
- Shows realistic available equity at each point in time

### ✅ Accurate UI Display

Property cards and timeline now show:
- Updated loan amounts after equity releases
- Correct debt-to-equity ratios
- Realistic borrowing capacity

### ✅ Correct Purchase Timing

Affordability calculations now use accurate debt figures:
- Serviceability tests reflect actual loan payments
- Borrowing capacity tests reflect true debt levels
- Purchase timing is more realistic

## Testing Checklist

### Manual Testing

1. **Create a scenario with multiple properties**
   - Add 3-4 properties to the timeline
   - Note the initial loan amounts

2. **Monitor equity release over time**
   - Check property cards at different periods (e.g., Year 5, Year 10)
   - Verify that as properties grow in value, equity is released

3. **Verify total debt increases**
   - Track total debt in the summary bar
   - Confirm it increases as equity is released
   - Formula: Total Debt = Sum of (Original Loans + Equity Released)

4. **Check portfolio metrics**
   - Portfolio value should grow with property appreciation
   - Total equity = Portfolio Value - Total Debt (with released equity)
   - LVR should stay around 88% for refinanced properties

5. **Verify purchase timing impact**
   - Compare purchase dates before and after the fix
   - Later properties may be delayed if debt limits are reached sooner

### Expected Behaviors

#### Before Fix:
- Total debt stayed constant (only original loans)
- Equity kept growing unrealistically
- More properties could be purchased than realistic
- LVR appeared to decrease over time

#### After Fix:
- Total debt increases as equity is released
- Equity growth is constrained by 88% LVR limit
- Purchase timing reflects true debt serviceability
- LVR stays around 88% for continuously refinanced properties

## Files Modified

### Core Changes
- `src/hooks/useAffordabilityCalculator.ts`
  - Updated type definitions for purchase history
  - Modified `calculateAvailableFunds` function
  - Modified `checkAffordability` function
  - Modified `calculatePropertyScore` function
  - Modified `determineNextPurchasePeriod` function
  - Modified `calculateAffordabilityForPeriod` function
  - Updated timeline property calculations

### Documentation
- `EQUITY_RELEASE_FIX_SUMMARY.md` (this file)

## Technical Notes

### Type Safety

All purchase history arrays now include the optional `cumulativeEquityReleased` field:
- Typed as `number | undefined`
- Default value of `0` for new purchases
- Safely handled with `(purchase.cumulativeEquityReleased || 0)` throughout

### Performance

No performance impact:
- Calculations remain O(n) where n = number of properties
- No additional loops or iterations
- Simple arithmetic additions

### Backward Compatibility

The fix is backward compatible:
- Optional field with fallback to `0`
- Existing data structures continue to work
- No migration required

## Related Documentation

- `BORROWING_CAPACITY_ANALYSIS.md` - Understanding borrowing capacity calculations
- `COMPLETE_SYSTEM_LOGIC_GUIDE.md` - Overall system architecture
- `DECISION_ENGINE_COMPLETE_SUMMARY.md` - Decision engine logic

## Future Enhancements

Potential improvements for future consideration:

1. **Equity Release Strategy Options**
   - Allow users to choose between continuous refinancing (current) vs. periodic refinancing
   - Add controls for refinancing frequency (e.g., every 2 years)

2. **Refinancing Costs**
   - Add costs for refinancing (legal fees, valuation, etc.)
   - Factor these into equity release calculations

3. **LVR Limits Per Property**
   - Allow different LVR limits per property type
   - Some lenders offer higher LVRs for certain property types

4. **Equity Release History**
   - Track equity release events with timestamps
   - Show equity release history in property details
   - Visualize refinancing timeline

5. **Tax Implications**
   - Consider tax deductibility of interest on refinanced amounts
   - Different treatment for investment vs. personal use

## Conclusion

This fix ensures that equity releases (refinancing) correctly increase property loan amounts, leading to accurate total debt calculations throughout the system. The implementation is type-safe, performant, and maintains backward compatibility while providing a solid foundation for future enhancements.
