# Static Rent Fix - Quick Reference

## What Was Fixed
The Timeline UI now applies **Growth to Rent** and **Inflation to Expenses**, matching the Affordability Engine's logic.

---

## Code Location
**File**: `src/hooks/useAffordabilityCalculator.ts`  
**Function**: `calculateTimelineProperties` (useMemo hook)  
**Lines**: ~1032-1102

---

## Key Formula Changes

### 1. Growth Factor (for Rent)
```typescript
const growthFactor = currentValue / purchase.cost;
const adjustedRentalIncome = cashflowBreakdown.adjustedIncome * growthFactor;
```
**Effect**: Rental income now increases as property value grows

### 2. Inflation Factor (for Expenses)
```typescript
const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
const inflationAdjustedOperating = cashflowBreakdown.totalOperatingExpenses * inflationFactor;
```
**Effect**: Operating expenses now increase at 3% annually

### 3. Net Cashflow Formula
```typescript
netCashflow = grossRentalIncome - expenses - loanInterest - totalPrincipalPayments;
```
**Effect**: Properly separates principal from interest and expenses

---

## Quick Verification (30 seconds)

1. **Open Timeline UI** → Add 1 property
2. **Check Year 1** → Note rental income (e.g., $25,000)
3. **Check Year 10** → Rental should be ~44% higher (e.g., $36,000) ✅
4. **Check Expenses** → Should also increase (but slower) ✅

---

## Expected Results

| Metric | Year 1 | Year 5 | Year 10 | Change |
|--------|--------|--------|---------|--------|
| **Rental Income** | $25,000 | $29,243 | $36,050 | +44% ✅ |
| **Operating Expenses** | $10,000 | $11,593 | $13,439 | +34% ✅ |
| **Net Cashflow** | -$10,000 | -$7,350 | -$2,389 | Improving ✅ |

---

## What to Look For

### ✅ Good Signs
- Rental income **increases** each year
- Expenses **inflate** gradually (slower than income)
- Net cashflow **improves** over time (becomes less negative)
- Timeline matches Affordability Engine popup

### ❌ Bad Signs (Would indicate bug)
- Rental income stays **flat** across years
- Expenses stay **static**
- Net cashflow doesn't match Affordability Engine

---

## Technical Details

### Growth Factor
- Calculated as: `currentValue / purchasePrice`
- Applied to: Base rental income
- Purpose: Scale rent with property appreciation

### Inflation Factor  
- Calculated as: `Math.pow(1.03, yearsOwned)`
- Applied to: Operating expenses, land tax
- Purpose: Reflect rising costs over time

### Principal vs Interest
- **Interest**: Deductible expense, part of `loanInterest`
- **Principal**: Loan reduction, deducted separately in `netCashflow`
- **Both** reduce cash in hand, but only interest affects tax deductions

---

## Troubleshooting

### If rental income isn't growing:
1. Check browser console for errors
2. Verify `PERIODS_PER_YEAR` constant is defined
3. Ensure `calculatePropertyGrowth()` is working
4. Clear cache and refresh

### If expenses aren't inflating:
1. Check `inflationFactor` calculation (should use 1.03)
2. Verify `periodsOwned` is calculated correctly
3. Ensure `PERIODS_PER_YEAR` constant is accessible

### If numbers don't match Affordability Engine:
1. Compare `growthFactor` between both systems
2. Check if property assumptions are the same
3. Verify loan type (IO vs PI) is consistent

---

## Files Changed
- ✅ `src/hooks/useAffordabilityCalculator.ts` (lines 1032-1102)

## Documentation Created
- ✅ `STATIC_RENT_FIX_SUMMARY.md` (detailed explanation)
- ✅ `STATIC_RENT_FIX_VISUAL_COMPARISON.md` (before/after examples)
- ✅ `STATIC_RENT_FIX_QUICK_REFERENCE.md` (this file)

---

**Status**: ✅ Complete - Ready for testing

