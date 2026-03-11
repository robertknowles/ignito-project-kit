# Static Rent Fix - Testing Checklist

## ✅ Implementation Complete

### Code Changes
- [x] Modified `src/hooks/useAffordabilityCalculator.ts` (lines 1032-1102)
- [x] Added growth factor calculation
- [x] Added inflation factor calculation
- [x] Applied growth to rental income
- [x] Applied inflation to expenses
- [x] Separated principal from interest in net cashflow
- [x] Updated net cashflow formula
- [x] No linter errors

### Verification
- [x] Created automated test suite (`verify-static-rent-fix.cjs`)
- [x] All 7 tests passing
- [x] Formulas verified mathematically
- [x] Documentation complete

---

## 🧪 Manual Testing Checklist

### Test 1: Basic Rental Income Growth
- [ ] Open the app and navigate to the Timeline
- [ ] Add 1 property (any type)
- [ ] Note the rental income in Period 1 (e.g., $25,000)
- [ ] Navigate to Period 20 (Year 10)
- [ ] **Expected**: Rental income should be ~40-50% higher
- [ ] **Actual**: _________________
- [ ] ✅ PASS / ❌ FAIL

### Test 2: Expense Inflation
- [ ] Using the same scenario from Test 1
- [ ] Note the operating expenses in Period 1 (e.g., $10,000)
- [ ] Navigate to Period 20 (Year 10)
- [ ] **Expected**: Expenses should be ~30-35% higher
- [ ] **Actual**: _________________
- [ ] ✅ PASS / ❌ FAIL

### Test 3: Net Cashflow Improvement
- [ ] Using the same scenario
- [ ] Note net cashflow in Period 1 (e.g., -$10,000)
- [ ] Note net cashflow in Period 20 (e.g., -$2,000)
- [ ] **Expected**: Net cashflow should improve (become less negative)
- [ ] **Actual Improvement**: _________________
- [ ] ✅ PASS / ❌ FAIL

### Test 4: Timeline vs Affordability Engine Consistency
- [ ] Add 2 properties to your scenario
- [ ] Note when the first property can be purchased (e.g., Period 2)
- [ ] Click on that period to open the Affordability Engine popup
- [ ] Compare rental income between Timeline and popup
- [ ] **Expected**: Numbers should match exactly
- [ ] **Timeline Rent**: _________________
- [ ] **Popup Rent**: _________________
- [ ] ✅ MATCH / ❌ DIFFERENT

### Test 5: Multiple Properties at Different Periods
- [ ] Create a scenario with 3+ properties
- [ ] Each property purchased at different periods (e.g., P1, P5, P10)
- [ ] For each property, verify rental income grows from purchase date
- [ ] **Expected**: Older properties show more growth than newer ones
- [ ] **Property 1 (oldest) rent growth**: _________________
- [ ] **Property 3 (newest) rent growth**: _________________
- [ ] ✅ PASS / ❌ FAIL

### Test 6: Custom Growth Rates
- [ ] Add a property with custom growth assumptions
- [ ] Set a high growth rate (e.g., 8% instead of 4%)
- [ ] Observe rental income growth over 10 years
- [ ] **Expected**: Should grow faster than properties with standard rates
- [ ] **Actual growth**: _________________
- [ ] ✅ PASS / ❌ FAIL

### Test 7: IO vs PI Loan Types
- [ ] Add 2 identical properties
- [ ] Set Property 1 to IO (Interest-Only) loan
- [ ] Set Property 2 to PI (Principal & Interest) loan
- [ ] Compare net cashflow after 5 years
- [ ] **Expected**: PI loan should have higher cashflow cost (due to principal)
- [ ] **IO net cashflow**: _________________
- [ ] **PI net cashflow**: _________________
- [ ] ✅ PASS / ❌ FAIL

### Test 8: Year-over-Year Verification
- [ ] Create a simple 1-property scenario
- [ ] Record metrics for Years 1, 5, and 10:

| Metric | Year 1 | Year 5 | Year 10 | Growth |
|--------|--------|--------|---------|--------|
| Rental Income | _____ | _____ | _____ | _____ |
| Expenses | _____ | _____ | _____ | _____ |
| Net Cashflow | _____ | _____ | _____ | _____ |

- [ ] **Expected**: Rental income growth > Expense inflation
- [ ] ✅ PASS / ❌ FAIL

---

## 🔍 Visual Verification

### What to Look For

#### ✅ Good Signs (Fix is Working)
- Rental income **increases** each period
- Expenses **inflate** gradually
- Growth rate of income **exceeds** inflation rate of expenses
- Net cashflow **improves** over time (becomes less negative)
- Timeline numbers **match** Affordability Engine popup
- Older properties show **more accumulated growth** than newer ones

#### ❌ Bad Signs (Problem Detected)
- Rental income stays **flat** across periods
- Expenses stay **static**
- Net cashflow doesn't improve or gets worse
- Timeline shows different numbers than Affordability Engine
- All properties show same income regardless of purchase date

---

## 🎯 Key Metrics to Verify

### Growth Factor Behavior
```
Expected for 4% annual growth:
Year 1:  growthFactor = 1.00 (no growth yet)
Year 5:  growthFactor = 1.17 (~17% growth)
Year 10: growthFactor = 1.44 (~44% growth)
```

### Inflation Factor Behavior
```
Expected for 3% annual inflation:
Year 1:  inflationFactor = 1.00 (no inflation yet)
Year 5:  inflationFactor = 1.16 (~16% inflation)
Year 10: inflationFactor = 1.34 (~34% inflation)
```

### Net Cashflow Formula
```
netCashflow = grossRentalIncome 
            - expenses 
            - loanInterest 
            - principalPayments
```

**Verify**: All four components are being calculated and deducted

---

## 🐛 Troubleshooting

### If rental income isn't growing:
1. Open browser console
2. Look for errors in `calculateTimelineProperties`
3. Check that `currentValue` is being calculated correctly
4. Verify `growthFactor` is > 1.0 for periods after purchase
5. Clear browser cache and refresh

### If expenses aren't inflating:
1. Check browser console for calculation errors
2. Verify `inflationFactor` calculation uses `Math.pow(1.03, ...)`
3. Ensure `periodsOwned / PERIODS_PER_YEAR` converts correctly to years
4. Check that `PERIODS_PER_YEAR` constant is defined (should be 2)

### If Timeline doesn't match Affordability Engine:
1. Compare `growthFactor` calculations in both systems
2. Verify property assumptions are identical
3. Check loan type settings (IO vs PI) are consistent
4. Ensure both use the same base rental income

### If tests fail:
```bash
# Run automated verification
node verify-static-rent-fix.cjs

# Check for specific failures
# Each test outputs expected vs actual values
```

---

## 📊 Expected Results Reference

### Example: $500k Property, $400k Loan, $25k Rent, $10k Expenses

| Year | Rental Income | Expenses | Interest | Principal | Net Cashflow |
|------|--------------|----------|----------|-----------|--------------|
| 1    | $25,000      | $10,000  | $20,000  | $5,000    | -$10,000     |
| 5    | $29,243      | $11,593  | $19,000  | $6,000    | -$7,350      |
| 10   | $36,050      | $13,439  | $18,000  | $7,000    | -$2,389      |

**Key Observation**: Net cashflow improves from -$10k to -$2.4k (76% reduction in loss!)

---

## ✅ Sign-Off

### Developer Verification
- [ ] All code changes reviewed
- [ ] Linter checks passed
- [ ] Automated tests passing (7/7)
- [ ] No console errors in browser
- [ ] Deployed to staging

### QA Testing
- [ ] All manual tests completed
- [ ] Timeline shows growing rental income
- [ ] Expenses inflate correctly
- [ ] Net cashflow formula verified
- [ ] Timeline matches Affordability Engine
- [ ] Edge cases tested (multiple properties, custom rates, etc.)

### Product Owner Approval
- [ ] Fix addresses original issue
- [ ] Calculations are realistic
- [ ] User experience is improved
- [ ] Ready for production deployment

---

## 📚 Documentation Reference

- **[STATIC_RENT_FIX_COMPLETE.md](./STATIC_RENT_FIX_COMPLETE.md)** - Full summary
- **[STATIC_RENT_FIX_VISUAL_COMPARISON.md](./STATIC_RENT_FIX_VISUAL_COMPARISON.md)** - Before/after examples
- **[STATIC_RENT_FIX_QUICK_REFERENCE.md](./STATIC_RENT_FIX_QUICK_REFERENCE.md)** - Formula reference
- **[verify-static-rent-fix.cjs](./verify-static-rent-fix.cjs)** - Automated tests

---

**Status**: Ready for Testing  
**Priority**: High (Critical logic fix)  
**Estimated Testing Time**: 30-45 minutes

