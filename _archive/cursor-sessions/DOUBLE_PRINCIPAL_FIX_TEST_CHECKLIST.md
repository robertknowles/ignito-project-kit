# Double Principal Fix - Testing Checklist

## Quick Verification Steps

### Setup
1. ✅ Open the application
2. ✅ Select or create a client
3. ✅ Add at least 2-3 properties to the timeline

### Test 1: Interest-Only (IO) Loan
1. ✅ Set all properties to **Interest-Only (IO)** loan type
2. ✅ Check the timeline "Money in Bank" values
3. ✅ Expected: Money should accumulate based on:
   - Base deposit + Savings + Net Cashflow + Equity Release
   - Net Cashflow = Rent - Operating Expenses - Land Tax - Interest

### Test 2: Principal & Interest (P&I) Loan
1. ✅ Change at least one property to **Principal & Interest (P&I)** loan type
2. ✅ Check the timeline "Money in Bank" values for that property
3. ✅ Expected: Money should be LOWER than IO due to principal payments
4. ✅ Verify the cashflow breakdown shows:
   - Rent (income)
   - Operating expenses (management, insurance, rates, maintenance)
   - Land tax
   - Interest payments
   - **Principal payments (should appear exactly once)**

### Test 3: Multiple Properties with Mixed Loan Types
1. ✅ Set up a scenario with:
   - Property 1: IO loan
   - Property 2: P&I loan
   - Property 3: IO loan
2. ✅ Check the cumulative "Money in Bank" across all properties
3. ✅ Expected: Property 2 should show lower net cashflow contribution
4. ✅ Verify total net cashflow = sum of all property cashflows

### Test 4: Verify No Double Counting
1. ✅ Select a property with **P&I loan type**
2. ✅ Note the following values in the timeline:
   - Gross Rental Income
   - Expenses
   - Loan Interest
   - Net Cashflow
3. ✅ Manual calculation check:
   ```
   Net Cashflow = Gross Rental Income - Expenses - Loan Interest - Principal Payments
   ```
4. ✅ Verify that principal is NOT included in "Expenses"
5. ✅ Verify that principal is subtracted separately in the formula

### Test 5: Timeline Affordability
1. ✅ Add more properties than currently affordable
2. ✅ Check when each property becomes affordable
3. ✅ Expected: Affordability should be based on accurate net cashflow
4. ✅ Properties should become affordable sooner with IO loans vs P&I loans

## Expected Results

### Before Fix (Bug)
- ❌ Principal payments were subtracted **twice**
- ❌ Net Cashflow was incorrectly low for P&I loans
- ❌ "Money in Bank" was understated
- ❌ Affordability timeline was too conservative

### After Fix (Correct)
- ✅ Principal payments are subtracted **once**
- ✅ Net Cashflow accurately reflects true cash position
- ✅ "Money in Bank" shows correct available funds
- ✅ Affordability timeline is accurate

## Key Formula to Verify

In the browser console or timeline display, verify this formula:

```
Net Cashflow = Gross Rental Income - Expenses - Loan Interest - Principal Payments

Where:
  Expenses = Operating Costs + Land Tax ONLY (no principal)
```

## Files to Monitor
- `src/hooks/useAffordabilityCalculator.ts` (modified)
- `src/utils/detailedCashflowCalculator.ts` (unchanged, but referenced)

## Common Issues to Watch For
1. ⚠️ If "Money in Bank" is still too low, principal may still be double-counted
2. ⚠️ If IO and P&I show the same cashflow, principal may not be calculated
3. ⚠️ If cashflow seems too high, principal may not be subtracted at all

