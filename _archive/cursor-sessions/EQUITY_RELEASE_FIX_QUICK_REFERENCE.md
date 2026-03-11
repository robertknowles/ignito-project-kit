# Equity Release Fix - Quick Reference

## What Was Fixed?

**Problem:** When equity was released from properties (refinancing), the system added cash to the pool but didn't increase loan amounts, causing incorrect debt calculations.

**Solution:** Track cumulative equity released per property and use it to calculate current loan amounts throughout the system.

## Key Formula Changes

### Before Fix ❌
```typescript
totalDebt = Σ(original loan amounts)
usableEquity = (property value × 0.88) - original loan
```

### After Fix ✅
```typescript
currentLoan = originalLoan + cumulativeEquityReleased
totalDebt = Σ(current loan amounts)
usableEquity = (property value × 0.88) - current loan
```

## New Field Added

```typescript
cumulativeEquityReleased?: number
```

**What it tracks:** Total amount refinanced from a property at any point in time

**Not additive:** Represents current refinanced amount, not sum over time

**Example:**
- Year 1: $0 (no refinance yet)
- Year 5: $128k (property grew, refinanced)
- Year 10: $234k (not $128k + $106k, just the current total)

## Quick Verification Checklist

### ✅ Signs the Fix is Working

1. **Loan amounts increase over time** (not static)
2. **Total debt includes refinanced amounts**
3. **LVR stays around 88%** (not decreasing)
4. **Available equity doesn't grow infinitely**
5. **Fewer properties can be purchased** (more realistic)

### ❌ Signs of Problems

1. Loan amounts stay at original values
2. Total debt only shows original loans
3. LVR keeps decreasing over time
4. Equity keeps growing without limit
5. More properties can be purchased than realistic

## Testing in 30 Seconds

1. **Create scenario** with 1 property, 10-year timeline
2. **Check Year 1:** Original loan ~$400k, equity released = $0
3. **Check Year 5:** Loan ~$480k, equity released ~$80k
4. **Check Year 10:** Loan ~$565k, equity released ~$165k
5. **Verify:** Current Loan ≈ Property Value × 0.88

✅ Pass: Loan increases, LVR ~88%
❌ Fail: Loan static, LVR decreasing

## Where to Look in Code

### Main File
`src/hooks/useAffordabilityCalculator.ts`

### Key Functions Modified
1. `calculateAvailableFunds()` - Line 282
2. `checkAffordability()` - Lines 445, 477
3. `calculatePropertyScore()` - Line 348
4. Timeline calculation - Lines 940, 1065, 1163

### Search Pattern
Look for: `purchase.cumulativeEquityReleased`

## Common Scenarios

### Scenario 1: Single Property Growth
```
Year 1:  $500k value, $400k loan, $0 equity released
Year 5:  $600k value, $528k loan, $128k equity released
Year 10: $720k value, $634k loan, $234k equity released

✅ Loan grows with property value
✅ LVR maintained at 88%
```

### Scenario 2: Multiple Properties
```
Property A (older): More equity released
Property B (newer): Some equity released
Property C (newest): Little/no equity released

✅ Each tracked independently
✅ Total debt = sum of all current loans
```

### Scenario 3: Borrowing Capacity Hit
```
Without fix: Can purchase 6 properties (wrong)
With fix:    Can purchase 3 properties (correct)

✅ Stops when true debt limit reached
```

## Formula Reference

### Current Loan Amount
```typescript
currentLoan = originalLoan + (cumulativeEquityReleased || 0)
```

### Equity Released (at any point)
```typescript
equityReleased = max(0, propertyValue × 0.88 - originalLoan)
```

### Usable Equity (available now)
```typescript
usableEquity = max(0, propertyValue × 0.88 - currentLoan)
```

### Total Debt
```typescript
totalDebt = existingDebt + Σ(currentLoan for each property)
```

### LVR
```typescript
LVR = currentLoan / propertyValue
// Should be ≈ 88% for refinanced properties
```

## UI Indicators

### Property Card Shows:
- ✅ Original Loan
- ✅ Equity Released (cumulative)
- ✅ Current Loan (original + released)
- ✅ LVR (based on current loan)

### Summary Bar Shows:
- ✅ Total Debt (sum of current loans)
- ✅ Portfolio Value
- ✅ Total Equity (value - current debts)

### Timeline Shows:
- ✅ Purchase timing (may be delayed vs. old system)
- ✅ Realistic property count
- ✅ Accurate affordability

## Troubleshooting

### Issue: Loan amounts not increasing
**Check:** Is `cumulativeEquityReleased` being set?
**Look at:** Line 1072 in useAffordabilityCalculator.ts

### Issue: Total debt too low
**Check:** Are current loans being used in sum?
**Look at:** Line 445 in checkAffordability function

### Issue: Too much equity available
**Check:** Is current loan used in equity calculation?
**Look at:** Lines 282, 477 in equity calculations

### Issue: LVR not staying at 88%
**Check:** Is equity being released continuously?
**Look at:** Equity release logic at line 1065

## Related Documents

- `EQUITY_RELEASE_FIX_SUMMARY.md` - Detailed implementation
- `EQUITY_RELEASE_FIX_VISUAL_GUIDE.md` - Visual examples
- `EQUITY_RELEASE_FIX_TEST_CHECKLIST.md` - Complete testing guide

## Quick Math Check

```
Given:
- Property Value: $700,000
- Original Loan: $400,000

Calculate:
- Max Refinance: $700k × 0.88 = $616,000
- Equity Released: $616k - $400k = $216,000
- Current Loan: $400k + $216k = $616,000
- Remaining Equity: $700k - $616k = $84,000
- LVR: $616k / $700k = 88% ✅

If system shows:
- Current Loan = $400k ❌ (missing equity)
- Current Loan = $616k ✅ (correct)
```

## Developer Notes

### Type Safety
- Optional field: `cumulativeEquityReleased?: number`
- Always use: `(purchase.cumulativeEquityReleased || 0)`
- Default value: `0` for new purchases

### Performance
- No additional loops
- O(n) complexity maintained
- Simple arithmetic operations

### Backward Compatibility
- Optional field won't break existing data
- Defaults to `0` if undefined
- No migration required

## One-Line Summary

**Current loan = original loan + equity released** → used everywhere debt is calculated

---

**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Status:** ✅ Implemented and Tested


