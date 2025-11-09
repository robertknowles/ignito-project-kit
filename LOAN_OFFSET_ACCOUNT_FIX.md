# Loan Offset Account Implementation

## ✅ Status: Complete

The loan offset account feature has been successfully implemented to reduce the effective interest paid on property loans.

---

## Summary

The `loanOffsetAccount` field was already defined in the `PropertyInstanceDetails` interface and had UI support in the Property Detail Modal, but it was not being used in cashflow calculations. This has now been fixed.

---

## Changes Made

### File Modified: `src/utils/detailedCashflowCalculator.ts`

**Lines 46-49:** Updated interest calculation to apply offset account

```typescript
// Expenses
// Apply loan offset account to reduce effective loan amount for interest calculation
const effectiveLoanAmount = Math.max(0, loanAmount - property.loanOffsetAccount);
const loanInterest = effectiveLoanAmount * (property.interestRate / 100);
```

**Previous implementation (line 47):**
```typescript
const loanInterest = loanAmount * (property.interestRate / 100);
```

---

## How It Works

### The Offset Account Mechanism

An offset account is a savings account linked to a loan. The balance in the offset account reduces the loan amount for interest calculation purposes, while keeping the actual loan amount unchanged.

**Example:**
- Loan amount: $300,000
- Interest rate: 6.5%
- Offset account: $50,000
- **Effective loan for interest:** $250,000
- **Interest paid:** $16,250/year (instead of $19,500/year)
- **Annual savings:** $3,250

### Implementation Details

1. **Calculate Effective Loan Amount:**
   ```typescript
   const effectiveLoanAmount = Math.max(0, loanAmount - property.loanOffsetAccount);
   ```

2. **Use Math.max(0, ...):** Prevents negative interest if offset is larger than loan amount

3. **Calculate Interest:** Interest is then calculated on the effective amount, not the original loan amount

---

## Test Cases

All test cases verified and passing:

### Test 1: No Offset Account
- **Loan:** $300,000 @ 6.5%
- **Offset:** $0
- **Interest:** $19,500/year ✓

### Test 2: Partial Offset
- **Loan:** $300,000 @ 6.5%
- **Offset:** $50,000
- **Interest:** $16,250/year ✓

### Test 3: Full Offset
- **Loan:** $300,000 @ 6.5%
- **Offset:** $300,000
- **Interest:** $0/year ✓

### Test 4: Offset Exceeds Loan (Edge Case)
- **Loan:** $300,000 @ 6.5%
- **Offset:** $350,000
- **Interest:** $0/year (negative prevented) ✓

---

## Where This Affects

The `calculateDetailedCashflow` function is used in multiple places:

1. **`useAffordabilityCalculator.ts`** - Main affordability calculations for property purchases
2. **`usePerPropertyTracking.ts`** - Individual property cashflow tracking over time
3. **Property Detail Modal** - Displays cashflow breakdown when viewing property details

The fix applies to all these calculations automatically.

---

## User Guide

### How to Use Loan Offset Accounts

1. **Open Property Details:**
   - Click on any property card in the timeline
   - Or click "View Details" in the Decision Engine

2. **Navigate to Contract & Loan Details Tab:**
   - The "Loan Offset Account" field is in the second tab

3. **Enter Offset Amount:**
   - Input the balance you have/will have in your offset account (in dollars)
   - Example: Enter `50000` for $50,000

4. **View Impact:**
   - The cashflow calculations will automatically update
   - Interest expense will be reduced based on your offset balance
   - Net cashflow will improve accordingly

### Best Practices

- **Conservative Estimates:** Use a conservative offset balance that you're confident you can maintain
- **Emergency Funds:** Don't count emergency funds in your offset if you might need to withdraw them
- **Growth Over Time:** You can update the offset amount as your savings grow
- **Multiple Properties:** Set different offset amounts for each property instance

---

## Technical Notes

### Why Only in DetailedCashflowCalculator?

The offset account is only applied in `detailedCashflowCalculator.ts` because:

1. **This is the authoritative calculator** - Used for all detailed property-specific cashflow analysis
2. **Other calculations are simplified** - Timeline interpolations use simplified formulas for performance
3. **Property instances** - Only property instances have the detailed field; timeline properties use aggregated data

### Data Flow

```
PropertyInstanceDetails (34 fields including loanOffsetAccount)
          ↓
calculateDetailedCashflow()
          ↓
CashflowBreakdown (includes reduced loanInterest)
          ↓
Used by: useAffordabilityCalculator, usePerPropertyTracking, UI displays
```

---

## Verification

✅ Implementation complete
✅ All test cases passing  
✅ No linter errors
✅ Backward compatible (offset defaults to 0)
✅ Edge cases handled (negative interest prevention)

---

## Example Calculation

**Scenario:** Investment property with offset account

- Purchase price: $450,000
- Loan amount: $382,500 (85% LVR)
- Interest rate: 6.5%
- Offset account: $75,000

**Without offset:**
- Interest = $382,500 × 6.5% = $24,862.50/year

**With offset:**
- Effective loan = $382,500 - $75,000 = $307,500
- Interest = $307,500 × 6.5% = $19,987.50/year
- **Savings: $4,875/year**

This improves cashflow by **$406/month** or **$94/week**.

---

## Future Enhancements (Optional)

Potential improvements for future consideration:

1. **Dynamic Offset Growth:** Model offset balance growing over time with savings
2. **Offset Strategy Optimizer:** Suggest optimal allocation of offset funds across multiple properties
3. **Tax Implications:** Consider any tax implications of offset accounts vs. cash in hand
4. **Redraw vs. Offset:** Compare offset account benefits with redraw facilities

---

*Implementation Date: November 9, 2025*
*Priority: 1 (High)*
*Status: ✅ Complete*

