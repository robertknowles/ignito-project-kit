# Equity Release Fix - Visual Guide

## Understanding the Problem

### Before the Fix ❌

```
Property Purchase: Year 1
├─ Purchase Price: $500,000
├─ Initial Loan (80%): $400,000
└─ Equity: $100,000

Year 5 - Property Growth
├─ Property Value: $600,000
├─ Loan Amount: $400,000 ⚠️ (UNCHANGED - WRONG!)
├─ Available Equity: $128,000 ($600k × 88% - $400k)
└─ System adds $128k to available funds

Year 10 - More Growth
├─ Property Value: $700,000
├─ Loan Amount: $400,000 ⚠️ (STILL UNCHANGED - WRONG!)
├─ Available Equity: $216,000 ($700k × 88% - $400k)
└─ System adds $216k to available funds

❌ PROBLEM: Loan never increased despite pulling out equity!
❌ Total Debt shown = $400k (original)
✅ Total Debt should be = $616k ($400k + $216k refinanced)
```

### After the Fix ✅

```
Property Purchase: Year 1
├─ Purchase Price: $500,000
├─ Initial Loan (80%): $400,000
├─ Equity: $100,000
└─ cumulativeEquityReleased: $0

Year 5 - Property Growth + Refinance
├─ Property Value: $600,000
├─ Max Refinance (88% LVR): $528,000
├─ Original Loan: $400,000
├─ Equity Released: $128,000 ($528k - $400k)
├─ Current Loan Amount: $528,000 ✅
├─ cumulativeEquityReleased: $128,000 ✅
└─ System adds $128k to available funds

Year 10 - More Growth + Refinance
├─ Property Value: $700,000
├─ Max Refinance (88% LVR): $616,000
├─ Original Loan: $400,000
├─ Equity Released: $216,000 ($616k - $400k)
├─ Current Loan Amount: $616,000 ✅
├─ cumulativeEquityReleased: $216,000 ✅ (replaces $128k)
└─ Available NEW equity: $88k ($616k - $528k from Year 5)

✅ Total Debt = $616k (correct)
✅ Equity calculations use current loan amount
✅ LVR maintained at 88%
```

## Multi-Property Example

### Scenario: 3 Properties Over 10 Years

```
YEAR 1: Purchase Property A
┌─────────────────────────────────────────┐
│ Property A                              │
│ Value: $500k                            │
│ Loan: $400k (original)                  │
│ Equity Released: $0                     │
│ Current Loan: $400k                     │
└─────────────────────────────────────────┘
Total Debt: $400k


YEAR 3: Purchase Property B
┌─────────────────────────────────────────┐
│ Property A (2 years growth)             │
│ Value: $540k                            │
│ Loan: $400k (original)                  │
│ Equity Released: $75k ($540k×88%-$400k) │
│ Current Loan: $475k ✅                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Property B                              │
│ Value: $450k                            │
│ Loan: $360k (original)                  │
│ Equity Released: $0                     │
│ Current Loan: $360k                     │
└─────────────────────────────────────────┘
Total Debt: $835k ($475k + $360k) ✅
Available Funds: Savings + $75k equity from Property A


YEAR 6: Purchase Property C
┌─────────────────────────────────────────┐
│ Property A (5 years growth)             │
│ Value: $620k                            │
│ Loan: $400k (original)                  │
│ Equity Released: $145k ($620k×88%-$400k)│
│ Current Loan: $545k ✅                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Property B (3 years growth)             │
│ Value: $502k                            │
│ Loan: $360k (original)                  │
│ Equity Released: $82k ($502k×88%-$360k) │
│ Current Loan: $442k ✅                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Property C                              │
│ Value: $520k                            │
│ Loan: $416k (original)                  │
│ Equity Released: $0                     │
│ Current Loan: $416k                     │
└─────────────────────────────────────────┘
Total Debt: $1,403k ($545k + $442k + $416k) ✅
Available Funds: Savings + $145k + $82k = $227k in equity


YEAR 10: Portfolio Status
┌─────────────────────────────────────────┐
│ Property A (9 years growth)             │
│ Value: $720k                            │
│ Loan: $400k (original)                  │
│ Equity Released: $234k ($720k×88%-$400k)│
│ Current Loan: $634k ✅                  │
│ LVR: 88% ✅                             │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Property B (7 years growth)             │
│ Value: $590k                            │
│ Loan: $360k (original)                  │
│ Equity Released: $159k ($590k×88%-$360k)│
│ Current Loan: $519k ✅                  │
│ LVR: 88% ✅                             │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Property C (4 years growth)             │
│ Value: $584k                            │
│ Loan: $416k (original)                  │
│ Equity Released: $98k ($584k×88%-$416k) │
│ Current Loan: $514k ✅                  │
│ LVR: 88% ✅                             │
└─────────────────────────────────────────┘

Portfolio Summary:
├─ Total Value: $1,894k
├─ Total Debt: $1,667k ($634k + $519k + $514k) ✅
├─ Total Equity: $227k
├─ Portfolio LVR: 88% ✅
└─ Equity Available for Next Purchase: $0 (at 88% cap)
```

## Impact on Total Debt Calculation

### Before Fix - Debt Calculation ❌

```typescript
// OLD CODE - INCORRECT
let totalExistingDebt = profile.currentDebt;
previousPurchases.forEach(purchase => {
  if (purchase.period <= currentPeriod) {
    totalExistingDebt += purchase.loanAmount; // ❌ Only original loan
  }
});

// Example with 3 properties:
// Property A: $400k (original)
// Property B: $360k (original)  
// Property C: $416k (original)
// Total Debt = $1,176k ❌ WRONG!
// (Missing $491k in refinanced equity)
```

### After Fix - Debt Calculation ✅

```typescript
// NEW CODE - CORRECT
let totalExistingDebt = profile.currentDebt;
previousPurchases.forEach(purchase => {
  if (purchase.period <= currentPeriod) {
    const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
    totalExistingDebt += currentLoanAmount; // ✅ Current loan including refinances
  }
});

// Example with 3 properties at Year 10:
// Property A: $400k + $234k = $634k ✅
// Property B: $360k + $159k = $519k ✅
// Property C: $416k + $98k = $514k ✅
// Total Debt = $1,667k ✅ CORRECT!
```

## Impact on Available Equity Calculation

### Before Fix - Equity Calculation ❌

```typescript
// OLD CODE - INCORRECT
const usableEquity = Math.max(0, propertyCurrentValue * 0.88 - purchase.loanAmount);
//                                                                 ^^^^^^^^^^^^^^^^
//                                                          ❌ Always used original loan!

// Property A at Year 10:
// Value: $720k
// Original Loan: $400k
// Calculated Equity: $720k × 88% - $400k = $234k

// Property A at Year 11:
// Value: $750k
// Original Loan: $400k ❌ (should be $634k after Year 10 refinance)
// Calculated Equity: $750k × 88% - $400k = $260k ❌
// WRONG! Should only be $26k new equity ($660k - $634k)
```

### After Fix - Equity Calculation ✅

```typescript
// NEW CODE - CORRECT
const currentLoanAmount = purchase.loanAmount + (purchase.cumulativeEquityReleased || 0);
const usableEquity = Math.max(0, propertyCurrentValue * 0.88 - currentLoanAmount);
//                                                                 ^^^^^^^^^^^^^^^^^
//                                                          ✅ Uses current loan amount!

// Property A at Year 10:
// Value: $720k
// Original Loan: $400k
// Equity Released: $234k
// Current Loan: $634k ✅
// Calculated Equity: $720k × 88% - $634k = $0 ✅ (at 88% cap)

// Property A at Year 11:
// Value: $750k
// Original Loan: $400k
// Previous Equity Released: $234k
// Current Loan: $634k ✅
// Calculated Equity: $750k × 88% - $634k = $26k ✅
// CORRECT! Only new growth equity available
```

## Flowchart: Equity Release Process

```
┌─────────────────────────────────────────────────────────┐
│  New Purchase Triggered                                 │
│  Need funds for deposit + costs                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Calculate Available Funds                              │
│  ├─ Base Deposit Pool                                   │
│  ├─ Cumulative Savings                                  │
│  ├─ Cashflow Reinvestment                               │
│  └─ Available Equity (from all properties)              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  For Each Previous Property:                            │
│  ├─ Calculate Current Value (with growth)               │
│  ├─ Get Original Loan Amount                            │
│  ├─ Get Cumulative Equity Released                      │
│  ├─ Current Loan = Original + Released                  │
│  ├─ Max Refinance = Current Value × 88%                 │
│  └─ Usable Equity = Max Refinance - Current Loan        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Check if Purchase is Affordable                        │
│  ├─ Deposit Test: Available Funds ≥ Required           │
│  ├─ Borrowing Capacity: Total Debt ≤ Capacity          │
│  └─ Serviceability: Payments ≤ Income Capacity         │
└────────────────┬────────────────────────────────────────┘
                 │
        Yes ─────┼───── No
         │       │       │
         │       │       └──► Cannot Afford Property
         │       │            (Try next period)
         │       │
         ▼       ▼
    ┌─────────────────────────────────────┐
    │  Purchase Property                  │
    │  ├─ Record in Purchase History      │
    │  ├─ Update Total Debt               │
    │  └─ Update Available Funds          │
    └────────────┬────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────┐
    │  Update Equity Released             │
    │  For each property:                 │
    │  ├─ Calculate new equity released   │
    │  ├─ Update cumulativeEquityReleased │
    │  └─ Current Loan increases          │
    └────────────┬────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────┐
    │  Next Period                        │
    │  ├─ Properties grow in value        │
    │  ├─ More equity becomes available   │
    │  └─ Repeat process                  │
    └─────────────────────────────────────┘
```

## Code Changes Map

### Key Files Modified

```
src/hooks/useAffordabilityCalculator.ts
│
├─ Type Definitions
│  └─ Added cumulativeEquityReleased?: number to purchase arrays
│
├─ calculateAvailableFunds()
│  └─ Line 282: Use currentLoanAmount for equity calculation
│
├─ checkAffordability()
│  ├─ Line 445: Calculate total debt with current loans
│  └─ Line 477: Calculate usable equity with current loans
│
├─ calculatePropertyScore()
│  └─ Line 348: Calculate equity with current loan amount
│
├─ determineNextPurchasePeriod()
│  └─ Updated function signature
│
├─ Timeline Property Calculation
│  ├─ Line 940: Include current loans in total debt
│  ├─ Line 1065: Track equity released per property
│  └─ Line 1163: Initialize new purchases with equity = 0
│
└─ calculateAffordabilityForPeriod()
   └─ Updated function signature
```

## Testing Scenarios

### Scenario 1: Single Property Over Time

```
Test: Watch one property grow and equity release over 10 years

Expected Results:
Year 1:  Value $500k, Loan $400k, Equity Released $0
Year 3:  Value $540k, Loan $475k, Equity Released $75k ✅
Year 5:  Value $600k, Loan $528k, Equity Released $128k ✅
Year 10: Value $720k, Loan $634k, Equity Released $234k ✅

Verification:
✓ Loan increases over time
✓ LVR stays at ~88%
✓ Total debt = Original loan + Equity released
```

### Scenario 2: Multiple Properties Cascade

```
Test: Buy 3 properties, use equity from first to help fund second, etc.

Expected Results:
Property 1 → grows → releases equity → helps fund Property 2
Property 2 → grows → releases equity → helps fund Property 3
Property 1 (more growth) → releases more equity → helps fund Property 4

Verification:
✓ Each property's loan increases as equity is pulled
✓ Total debt increases with each refinance
✓ Later properties can be purchased using earlier equity
✓ Purchase timing may be delayed vs. old calculations
```

### Scenario 3: Hitting Borrowing Capacity Limit

```
Test: Add many properties until borrowing capacity is reached

Expected Results:
- With Fix: Fewer properties can be purchased
- Total debt reaches capacity limit and stops
- System correctly shows "Cannot afford more properties"

Verification:
✓ Total debt calculation includes all refinanced amounts
✓ Borrowing capacity limit is respected
✓ No properties shown as affordable beyond capacity
```

## Visual Comparison: Property Card Display

### Before Fix ❌
```
┌─────────────────────────────────────┐
│ Property A - Year 10                │
├─────────────────────────────────────┤
│ Value: $720,000                     │
│ Loan: $400,000 ❌                   │
│ Equity: $320,000 ❌                 │
│ LVR: 56% ❌ (incorrect)             │
└─────────────────────────────────────┘
```

### After Fix ✅
```
┌─────────────────────────────────────┐
│ Property A - Year 10                │
├─────────────────────────────────────┤
│ Value: $720,000                     │
│ Original Loan: $400,000             │
│ Equity Released: $234,000           │
│ Current Loan: $634,000 ✅           │
│ Equity: $86,000 ✅                  │
│ LVR: 88% ✅ (correct)               │
└─────────────────────────────────────┘
```

## Summary of Changes

| Aspect | Before Fix | After Fix |
|--------|-----------|-----------|
| **Loan Amount** | Static (original only) | Dynamic (includes refinances) |
| **Total Debt** | Understated | Accurate |
| **Available Equity** | Overstated | Accurate |
| **LVR** | Decreases over time | Maintained at 88% |
| **Purchase Timing** | Too optimistic | Realistic |
| **Borrowing Capacity** | Could exceed limits | Respects limits |

## Conclusion

The equity release fix ensures that when properties are refinanced to pull out equity for new purchases:

1. ✅ The loan amount on the refinanced property increases
2. ✅ Total debt accurately reflects all refinancing activity
3. ✅ Available equity is calculated against current loans (not original)
4. ✅ Borrowing capacity limits are properly enforced
5. ✅ Purchase timing and affordability are realistic

This creates a financially accurate model that properly tracks the cascading effects of equity recycling through a growing property portfolio.

