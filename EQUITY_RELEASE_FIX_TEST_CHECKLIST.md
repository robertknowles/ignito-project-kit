# Equity Release Fix - Testing Checklist

## Pre-Testing Setup

- [ ] Clear browser cache and local storage
- [ ] Ensure you're on the latest version with the fix
- [ ] Open browser developer console to monitor for errors
- [ ] Have a calculator ready for manual verification

## Test 1: Single Property Equity Release Over Time

### Setup
- [ ] Create a new client or use test client
- [ ] Clear all property selections
- [ ] Select 1 property (e.g., "House - Sydney")
- [ ] Set timeline to 10 years

### Expected Results

#### Year 1 (Initial Purchase)
- [ ] Property appears in timeline
- [ ] Loan amount = ~80% of property value
- [ ] `cumulativeEquityReleased` = $0
- [ ] Total debt = loan amount

#### Year 3
- [ ] Property value has grown (check property card)
- [ ] Current loan = original loan + equity released
- [ ] Equity released ≈ (current value × 0.88) - original loan
- [ ] Total debt includes equity released
- [ ] Verify: Current Loan ≈ Current Value × 0.88

#### Year 5
- [ ] Property value higher than Year 3
- [ ] Current loan higher than Year 3
- [ ] `cumulativeEquityReleased` increased (not doubled)
- [ ] LVR ≈ 88%
- [ ] Available equity ≈ $0 (at refinance limit)

#### Year 10
- [ ] Property value significantly higher
- [ ] Current loan = original + all equity released
- [ ] Total debt = current loan amount
- [ ] LVR maintained at ~88%
- [ ] Equity = Property Value - Current Loan

### Verification Calculations

```
Property Value at Year 10: $_________
Original Loan: $_________
Maximum Refinance (Value × 0.88): $_________
Equity Released (Max Refinance - Original): $_________
Current Loan (Original + Released): $_________
Total Debt Shown: $_________
Should Match: ✓ / ✗
```

---

## Test 2: Multiple Properties - Equity Cascade

### Setup
- [ ] Create new scenario
- [ ] Select 3 different properties
- [ ] Set timeline to 10 years

### Expected Results

#### First Property Purchase (e.g., Year 1)
- [ ] Property 1 purchased
- [ ] Loan = ~80% of value
- [ ] No equity released yet
- [ ] Total portfolio debt = Property 1 loan

#### Second Property Purchase (e.g., Year 3)
- [ ] Property 1 has grown in value
- [ ] Property 1 shows equity released
- [ ] Property 1 current loan > original loan
- [ ] Property 2 purchased
- [ ] Total debt = Property 1 current loan + Property 2 loan
- [ ] Check: Total Debt increased from both loans

#### Third Property Purchase (e.g., Year 5)
- [ ] Property 1 equity released increased
- [ ] Property 2 now shows equity released
- [ ] Both current loans > original loans
- [ ] Property 3 purchased
- [ ] Total debt = sum of all current loans
- [ ] All three properties contributing to equity pool

#### Year 10 Portfolio Status
- [ ] All 3 properties show equity released
- [ ] Each property LVR ≈ 88%
- [ ] Total debt = sum of all current loans
- [ ] Portfolio LVR ≈ 88%

### Multi-Property Verification

```
Property 1:
  Original Loan: $_________
  Equity Released: $_________
  Current Loan: $_________
  
Property 2:
  Original Loan: $_________
  Equity Released: $_________
  Current Loan: $_________
  
Property 3:
  Original Loan: $_________
  Equity Released: $_________
  Current Loan: $_________

Total Debt Calculated: $_________
Total Debt Shown in UI: $_________
Should Match: ✓ / ✗
```

---

## Test 3: Total Debt Accuracy

### Setup
- [ ] Use scenario from Test 2 (3 properties)
- [ ] Navigate to different periods in timeline
- [ ] Monitor Summary Bar total debt

### Verification Points

#### At Each Property Purchase
- [ ] Before purchase: Note total debt
- [ ] After purchase: Total debt increased by new loan
- [ ] Manual calculation matches UI display

#### At Each Period
- [ ] Total debt includes all equity released
- [ ] Formula: Σ(Original Loans + Equity Released)
- [ ] Summary bar shows correct total debt
- [ ] Debt matches sum of all property current loans

### Debt Tracking Table

| Period | Property 1 Current Loan | Property 2 Current Loan | Property 3 Current Loan | Calculated Total | UI Total | Match? |
|--------|------------------------|------------------------|------------------------|------------------|----------|--------|
| Year 1 | $_________ | $0 | $0 | $_________ | $_________ | ✓ / ✗ |
| Year 3 | $_________ | $_________ | $0 | $_________ | $_________ | ✓ / ✗ |
| Year 5 | $_________ | $_________ | $_________ | $_________ | $_________ | ✓ / ✗ |
| Year 10 | $_________ | $_________ | $_________ | $_________ | $_________ | ✓ / ✗ |

---

## Test 4: Borrowing Capacity Impact

### Setup
- [ ] Create scenario with high-value properties
- [ ] Set relatively low borrowing capacity (e.g., $2M)
- [ ] Try to purchase 5+ properties

### Expected Results (After Fix)

#### Property Additions
- [ ] First 2-3 properties purchase successfully
- [ ] Later properties delayed or "challenging"
- [ ] System respects borrowing capacity limit
- [ ] Total debt never exceeds capacity

#### Verification
- [ ] Compare purchase timing before/after fix
- [ ] Later properties should be delayed or impossible
- [ ] Total debt calculation prevents over-leveraging
- [ ] Error messages or "challenging" status shown appropriately

### Capacity Test Matrix

```
Borrowing Capacity: $_________
Equity Factor: _________% (typically 70-75%)

Property Count | Total Original Loans | Total Equity Released | Total Debt | Within Capacity? | Can Purchase?
---------------|---------------------|----------------------|------------|------------------|---------------
1              | $_________ | $0 | $_________ | ✓ / ✗ | ✓ / ✗
2              | $_________ | $_________ | $_________ | ✓ / ✗ | ✓ / ✗
3              | $_________ | $_________ | $_________ | ✓ / ✗ | ✓ / ✗
4              | $_________ | $_________ | $_________ | ✓ / ✗ | ✓ / ✗
5              | $_________ | $_________ | $_________ | ✓ / ✗ | ✓ / ✗
```

---

## Test 5: Property Card Display

### Setup
- [ ] Use any scenario with 2+ properties
- [ ] Open property cards at different periods

### Property Card Checklist

For each property card:
- [ ] Shows original loan amount
- [ ] Shows equity released (if any)
- [ ] Shows current loan amount
- [ ] Current loan = original + equity released
- [ ] LVR calculation uses current loan
- [ ] Equity calculation: Value - Current Loan
- [ ] All values update correctly as you change periods

### Property Card Values

```
Property: _________________
Period: Year _____

Property Value: $_________
Original Loan: $_________
Equity Released: $_________
Current Loan (displayed): $_________
Current Loan (calculated): $_________
Should Match: ✓ / ✗

Equity (displayed): $_________
Equity (calculated = Value - Current Loan): $_________
Should Match: ✓ / ✗

LVR (displayed): _________%
LVR (calculated = Current Loan / Value): _________%
Should Match: ✓ / ✗
```

---

## Test 6: Available Equity Calculation

### Setup
- [ ] Single property scenario
- [ ] Track available equity over time

### Expected Behavior

#### Early Years (1-3)
- [ ] Usable equity = (Value × 0.88) - Current Loan
- [ ] As equity is "available," it's in the funds pool
- [ ] Next period, current loan reflects this refinance

#### Mid Years (4-7)
- [ ] Current loan increases each period
- [ ] Usable equity represents new growth only
- [ ] Not double-counting previously released equity

#### Later Years (8-10)
- [ ] Pattern continues: growth → refinance → loan increase
- [ ] LVR stays around 88%
- [ ] Available equity ≈ $0 at 88% LVR

### Equity Tracking

| Period | Property Value | Original Loan | Equity Released (Cumulative) | Current Loan | Usable Equity (New) |
|--------|---------------|---------------|------------------------------|--------------|---------------------|
| Year 1 | $_________ | $_________ | $0 | $_________ | $_________ |
| Year 2 | $_________ | $_________ | $_________ | $_________ | $_________ |
| Year 3 | $_________ | $_________ | $_________ | $_________ | $_________ |
| Year 5 | $_________ | $_________ | $_________ | $_________ | $_________ |
| Year 10 | $_________ | $_________ | $_________ | $_________ | $_________ |

**Verification:**
- [ ] `cumulativeEquityReleased` is NOT additive (doesn't keep growing linearly)
- [ ] `cumulativeEquityReleased` = (Current Value × 0.88) - Original Loan
- [ ] Usable Equity ≈ $0 when at 88% LVR
- [ ] Usable Equity only includes NEW growth equity

---

## Test 7: Serviceability and Affordability Tests

### Setup
- [ ] Create scenario approaching borrowing capacity limit
- [ ] Monitor affordability test results in console (if debug enabled)

### Expected Results

#### Before Property Can Be Purchased
- [ ] Deposit test considers total debt with equity
- [ ] Serviceability test uses current loan amounts
- [ ] Borrowing capacity test includes all refinanced debt

#### Affordability Checks
- [ ] Total debt = Σ(Current Loans) for all properties
- [ ] Interest payments based on current loans
- [ ] Capacity limits enforced correctly

### Affordability Matrix

```
Test | Uses Current Loans? | Includes Equity Released? | Test Result
-----|--------------------|--------------------------|--------------
Deposit Test | ✓ / ✗ | ✓ / ✗ | Pass / Fail
Serviceability | ✓ / ✗ | ✓ / ✗ | Pass / Fail
Borrowing Capacity | ✓ / ✗ | ✓ / ✗ | Pass / Fail
```

---

## Test 8: Edge Cases

### Edge Case 1: Zero Growth
- [ ] Set all growth rates to 0%
- [ ] Verify no equity is released over time
- [ ] Loan amounts remain constant
- [ ] Total debt = sum of original loans

### Edge Case 2: Negative Growth (if supported)
- [ ] Test with declining property values
- [ ] Verify equity released decreases
- [ ] System doesn't show negative equity release

### Edge Case 3: Very High Growth
- [ ] Test with 20%+ annual growth
- [ ] Verify large equity releases
- [ ] Check that LVR still caps at 88%
- [ ] Many properties can be purchased

### Edge Case 4: Existing Portfolio
- [ ] Start with existing properties (portfolio value > 0)
- [ ] Verify existing debt is handled correctly
- [ ] New properties add to existing debt correctly

### Edge Case 5: Property Type Changes
- [ ] Switch between different property types
- [ ] Verify calculations adjust correctly
- [ ] Each property tracked independently

---

## Test 9: UI/UX Consistency

### Visual Checks
- [ ] All currency values formatted consistently
- [ ] No "NaN", "Infinity", or undefined values
- [ ] Percentages display with appropriate decimals
- [ ] Tooltips explain equity release concept

### Summary Bar
- [ ] Total debt updates in real-time
- [ ] Equity calculations update correctly
- [ ] Portfolio value accurate
- [ ] LVR shown correctly

### Timeline View
- [ ] Properties show correct periods
- [ ] Equity release visible in property details
- [ ] Color coding appropriate
- [ ] Purchase dates realistic

---

## Test 10: Performance and Stability

### Performance Checks
- [ ] No console errors
- [ ] Calculations complete quickly (<500ms)
- [ ] No infinite loops or freezing
- [ ] UI remains responsive

### Stress Test
- [ ] Add 10+ properties
- [ ] Set timeline to 30 years
- [ ] Switch between scenarios
- [ ] Verify calculations remain accurate
- [ ] No performance degradation

### Data Persistence
- [ ] Refresh page - data persists
- [ ] Close and reopen browser - data persists
- [ ] Switch clients - data separated correctly

---

## Regression Tests

### Existing Features
- [ ] Property selection still works
- [ ] Loan type toggle (IO/PI) functions
- [ ] Assumptions adjustments work
- [ ] Custom property values persist
- [ ] PDF export still functional
- [ ] All tabs accessible and working

### Backward Compatibility
- [ ] Old scenarios without `cumulativeEquityReleased` still work
- [ ] Migration handled gracefully
- [ ] No breaking changes to existing data

---

## Sign-Off Checklist

### Code Quality
- [ ] No linter errors
- [ ] TypeScript types correct
- [ ] No console warnings
- [ ] Code follows project conventions

### Functionality
- [ ] All 10 tests passed
- [ ] Edge cases handled
- [ ] Performance acceptable
- [ ] No regressions

### Documentation
- [ ] Fix summary document complete
- [ ] Visual guide created
- [ ] Test checklist (this document) filled out
- [ ] Code comments clear

### Deployment Readiness
- [ ] All tests documented with results
- [ ] Any issues logged for future work
- [ ] Team notified of changes
- [ ] User guide updated (if needed)

---

## Test Results Summary

**Date Tested:** _________________

**Tested By:** _________________

**Version/Branch:** _________________

### Overall Results

| Test | Status | Notes |
|------|--------|-------|
| 1. Single Property | Pass / Fail | |
| 2. Multiple Properties | Pass / Fail | |
| 3. Total Debt Accuracy | Pass / Fail | |
| 4. Borrowing Capacity | Pass / Fail | |
| 5. Property Card Display | Pass / Fail | |
| 6. Available Equity | Pass / Fail | |
| 7. Affordability Tests | Pass / Fail | |
| 8. Edge Cases | Pass / Fail | |
| 9. UI/UX Consistency | Pass / Fail | |
| 10. Performance | Pass / Fail | |
| Regression Tests | Pass / Fail | |

### Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Quick Verification Commands

### Console Verification
```javascript
// Check a property's equity status
const property = timelineProperties[0];
console.log({
  value: property.portfolioValueAfter,
  originalLoan: property.loanAmount,
  equityReleased: property.equityRelease,
  currentLoan: property.loanAmount + property.equityRelease,
  lvr: ((property.loanAmount + property.equityRelease) / property.portfolioValueAfter * 100).toFixed(2) + '%'
});

// Check total debt
const totalDebt = timelineProperties.reduce((sum, prop) => {
  return sum + prop.loanAmount + (prop.equityRelease || 0);
}, 0);
console.log('Total Debt:', totalDebt);
```

### Manual Calculation Template
```
Property Value: $_________ (A)
Original Loan: $_________ (B)
Max Refinance (A × 0.88): $_________ (C)
Equity Released (C - B): $_________ (D)
Current Loan (B + D): $_________ (E)

Verification:
E should equal C
E / A should equal 0.88
```

---

## Notes Section

Use this space for additional observations, edge cases discovered, or improvements suggested:

_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________

