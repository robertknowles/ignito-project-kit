# Affordability Calculator Fix - Validation Guide

## Summary of Changes

We've replaced the **30% expense rule** with **detailed cashflow calculations** using all 39 client input fields in three critical locations within `useAffordabilityCalculator.ts`.

---

## What Was Fixed

### Problem
The decision engine was using a simplified "30% of rental income" rule for property expenses, ignoring the 39 detailed input fields you created for accurate cashflow calculations.

### Solution
All three critical calculation points now use `calculateDetailedCashflow()` which incorporates:

**Income Adjustments:**
- Vacancy rate (%)
- Rental recognition rates (75%/70%/65% based on portfolio size)

**Operating Expenses:**
- Property management fees (%)
- Building insurance (annual)
- Council rates & water (annual)
- Strata fees (annual)
- Maintenance allowance (annual)

**Non-Deductible Expenses:**
- Land tax (calculated or override)
- Principal payments (for P&I loans)

**Deductions:**
- Potential deductions/rebates (annual)

---

## Three Fixed Locations

### 1. Available Funds Calculation (Lines 208-236)
**Function:** `calculateAvailableFunds()`

**Purpose:** Determines how much money you have available for deposits by calculating cumulative savings + cashflow reinvestment

**What Changed:**
- **Old:** `periodExpenses = periodRentalIncome * 0.30 * inflationFactor`
- **New:** Uses `calculateDetailedCashflow()` with growth and inflation adjustments

**Impact:** More accurate calculation of available funds means:
- Properties may become affordable earlier (if actual expenses < 30%)
- Properties may become affordable later (if actual expenses > 30%)
- Cashflow reinvestment is now based on real numbers

---

### 2. Property Scoring (Lines 312-337)
**Function:** `calculatePropertyScore()`

**Purpose:** Ranks properties by cashflow performance to determine which to purchase first

**What Changed:**
- **Old:** `expenses = rentalIncome * 0.30 * inflationFactor`
- **New:** Uses `calculateDetailedCashflow()` with growth and inflation adjustments

**Impact:** Property selection order may change:
- Properties with lower actual expenses will score higher
- Properties with higher actual expenses will score lower
- More accurate prioritization based on real cashflow performance

---

### 3. Serviceability Test (Lines 378-425)
**Function:** `checkAffordability()` - Serviceability calculation

**Purpose:** Determines if you can service all loan payments (critical affordability gate)

**What Changed:**
- **Old:** `propertyExpenses = rentalIncome * 0.30 * inflationFactor`
- **New:** Uses `calculateDetailedCashflow()` with detailed breakdown:
  - `adjustedIncome` (gross rent - vacancy)
  - `totalOperatingExpenses` (all deductible expenses)
  - `totalNonDeductibleExpenses` (land tax + principal)

**Impact:** Serviceability test results may change:
- May pass serviceability earlier if actual expenses < 30%
- May fail serviceability if actual expenses > 30%
- More accurate representation of ability to service loans

---

## Testing Checklist

### Pre-Test Setup
1. ✅ Ensure you have a client scenario with:
   - Multiple property types selected (at least 3-5 properties)
   - All 39 detailed inputs filled in (Client Investment Profile)
   - Realistic values for expenses, vacancy rates, etc.

2. ✅ Take note of current timeline results:
   - Which properties are purchased and when
   - Final portfolio value
   - Total debt
   - Cashflow goal achievement

### Test 1: Compilation & Startup
- [ ] Code compiles without TypeScript errors ✅ (Already verified)
- [ ] Application starts without runtime errors
- [ ] No console errors related to affordability calculations

### Test 2: Timeline Recalculation
- [ ] Open a client scenario
- [ ] Navigate to Investment Timeline
- [ ] Verify timeline loads without errors
- [ ] Check that properties are being purchased (not all failing affordability)

### Test 3: Detailed Cashflow Verification
- [ ] Expand a property card in the timeline
- [ ] Verify "Expand Full Details" shows detailed cashflow breakdown
- [ ] Check that the breakdown includes:
  - Property management fees
  - Building insurance
  - Council rates & water
  - Strata fees
  - Maintenance
  - Land tax
  - Net annual cashflow

### Test 4: Decision Engine Funnels
- [ ] Expand "Decision Engine Analysis" for a purchase year
- [ ] Verify three funnels are displayed:
  - Deposit Test (with surplus/shortfall)
  - Serviceability Test (with surplus/shortfall)
  - Borrowing Capacity Test (with surplus/shortfall)
- [ ] Check that numbers make sense (not wildly different from before)

### Test 5: Expense Comparison
Create a test scenario to verify the fix is working:

**Scenario A: Low Expense Property**
- Set property management to 5%
- Set building insurance to $500/year
- Set council rates to $1,000/year
- Set strata to $0
- Set maintenance to $500/year
- **Expected:** Total expenses should be ~15-20% of rent (much less than 30%)
- **Result:** Property should become affordable earlier than before

**Scenario B: High Expense Property**
- Set property management to 10%
- Set building insurance to $2,000/year
- Set council rates to $3,000/year
- Set strata to $5,000/year
- Set maintenance to $2,000/year
- **Expected:** Total expenses should be ~35-40% of rent (more than 30%)
- **Result:** Property should become affordable later than before (or not at all)

### Test 6: Cashflow Reinvestment
- [ ] Check that cumulative savings increases over time
- [ ] Verify that positive cashflow properties contribute to available funds
- [ ] Verify that negative cashflow properties reduce available funds
- [ ] Check "Cashflow Reinvestment" value in available funds breakdown

### Test 7: Property Ranking
- [ ] Add 2+ properties of the same type (e.g., 2x Units/Apartments)
- [ ] Give them different expense profiles
- [ ] Verify that the property with better cashflow is purchased first

### Test 8: Fallback Safety
- [ ] Create a new property block without filling in all 39 inputs
- [ ] Verify the system doesn't crash
- [ ] Check that it falls back to 30% rule for that property
- [ ] Verify console shows no errors

---

## Expected Behavioral Changes

### More Accurate Affordability
- Properties with actual expenses **< 30%** will become affordable **earlier**
- Properties with actual expenses **> 30%** will become affordable **later**
- The three-gate system (Deposit/Serviceability/Borrowing) will use real numbers

### Better Property Selection
- Properties are ranked by **actual cashflow performance**, not estimates
- Higher-performing properties (lower expenses, better yield) are prioritized
- Portfolio composition may change based on accurate scoring

### Realistic Cashflow Projections
- Net cashflow displayed in charts and summaries reflects **real expenses**
- Cumulative savings calculations include **accurate cashflow reinvestment**
- Serviceability test uses **detailed expense breakdown**

---

## Debugging Tips

### If Properties Aren't Being Purchased
1. Check the Decision Engine Analysis for the year
2. Look at which funnel is failing (Deposit/Serviceability/Borrowing)
3. If Serviceability is failing, check:
   - Are expenses too high?
   - Is rental recognition rate reducing income too much?
   - Are there too many existing properties with negative cashflow?

### If Numbers Look Wrong
1. Open browser console (F12)
2. Look for any errors or warnings
3. Check that `getInstance(purchase.instanceId)` is finding the property
4. Verify the 39 input fields are populated with realistic values

### If Timeline Doesn't Update
1. Try changing a property input value
2. Save the change
3. Navigate away and back to the timeline
4. Check if the recalculation triggered

---

## Success Criteria

✅ **The fix is working correctly if:**

1. Timeline loads without errors
2. Properties are being purchased (at least some)
3. Decision Engine Analysis shows realistic numbers
4. Detailed cashflow breakdown matches the 39 inputs
5. Changing expense inputs affects purchase timing
6. Low-expense properties are prioritized over high-expense properties
7. Serviceability test passes/fails based on actual expenses
8. No console errors related to affordability calculations

---

## Next Steps After Validation

Once testing is complete:

1. **Document any issues** found during testing
2. **Compare before/after** timeline results for a sample client
3. **Verify with real client data** that results make sense
4. **Update client presentation materials** to reflect accurate cashflow projections
5. **Train users** on how the new detailed inputs affect purchase decisions

---

## Technical Notes

### Growth Adjustment
All three locations adjust rent for property value growth:
```typescript
const growthFactor = currentValue / purchase.cost;
const adjustedCashflow = cashflowBreakdown.netAnnualCashflow * growthFactor;
```

This ensures that as property values grow, rental income grows proportionally.

### Inflation Adjustment
All three locations apply 3% annual inflation to expenses:
```typescript
const inflationFactor = Math.pow(1.03, periodsOwned / PERIODS_PER_YEAR);
const inflationAdjustedCashflow = adjustedCashflow * inflationFactor;
```

This ensures expenses increase over time, making cashflow more realistic.

### Rental Recognition
Serviceability test maintains progressive rental recognition:
- Properties 1-2: 75% of rental income recognized
- Properties 3-4: 70% of rental income recognized
- Properties 5+: 65% of rental income recognized

This reflects bank lending conservatism as portfolio size grows.

---

## Contact & Support

If you encounter any issues during testing:
1. Check the browser console for errors
2. Verify all 39 inputs are filled with realistic values
3. Try a fresh client scenario with default values
4. Document the specific scenario that causes the issue

---

**Last Updated:** 2025-11-09  
**Version:** 1.0  
**Status:** Ready for Testing
