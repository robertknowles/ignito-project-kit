# Double Principal Fix - Quick Reference Card

## 🎯 What Was Fixed
Principal payments were being subtracted **twice** from net cashflow calculations.

## 📍 Where
`src/hooks/useAffordabilityCalculator.ts` - Two locations:
1. `calculateTimelineProperties` function (~line 1055)
2. `checkAffordability` function (~line 400)

## 🔧 The Fix
**Exclude principal from expenses accumulator:**

```typescript
// BEFORE (WRONG) ❌
expenses += totalNonDeductibleExpenses

// AFTER (CORRECT) ✅
expenses += (totalNonDeductibleExpenses - principalPayments)
```

## 📐 The Formula

### Net Cashflow
```typescript
netCashflow = grossRentalIncome - expenses - loanInterest - principalPayments
```

### Component Definitions
| Component | Includes | Excludes |
|-----------|----------|----------|
| `grossRentalIncome` | Rent (grown with property value) | Vacancy |
| `expenses` | Operating costs + Land Tax | Principal |
| `loanInterest` | Interest ONLY | Principal |
| `principalPayments` | Principal ONLY | Interest |

## 💰 Impact Example

**$400,000 P&I Loan @ 6.5% for 30 years:**

| Metric | Before (Wrong) | After (Correct) | Difference |
|--------|----------------|-----------------|------------|
| Annual Principal | $4,336 | $4,336 | $0 |
| Times Counted | 2x ❌ | 1x ✅ | -1x |
| **Net Cashflow Impact** | -$4,336 too low | Correct | **+$4,336/year** |
| **5-Year Impact** | | | **+$21,680** |

## 🧪 Quick Test
1. Add property with **P&I loan**
2. Check timeline "Money in Bank"
3. Verify principal subtracted **once**
4. Compare IO vs P&I (P&I should show lower cashflow)

## ✅ Status
- [x] Code changes complete
- [x] No linter errors
- [x] Documentation created
- [ ] User testing pending

## 📚 Full Documentation
- `DOUBLE_PRINCIPAL_FIX_COMPLETE.md` - Full summary
- `DOUBLE_PRINCIPAL_FIX_VISUAL_COMPARISON.md` - Visual examples
- `DOUBLE_PRINCIPAL_FIX_TEST_CHECKLIST.md` - Testing guide

## 🚀 Key Takeaway
```
Principal is now counted exactly once in all cashflow calculations.
```

---
**Date:** November 23, 2025 | **Status:** ✅ COMPLETE

