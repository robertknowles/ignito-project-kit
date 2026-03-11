# Test All 39 Fields - Quick Guide

## Purpose
Verify that changing each of the 39 property instance fields causes the timeline to recalculate and affect the output.

---

## Setup

1. **Add a test property to timeline**
   - Select "Sydney Unit" (or any property type)
   - Set quantity: 1
   - Note the purchase period (e.g., "2025 H1")
   - Note the total cash required

2. **Open property details**
   - Click on the property card
   - Property detail modal opens

---

## Test Each Field

### Tab 1: Property & Loan (14 fields)

| # | Field | Default | Change To | Expected Result |
|---|-------|---------|-----------|----------------|
| 1 | **State** | VIC | NSW | Stamp duty recalculates for NSW rates |
| 2 | **Purchase Price** | $350,000 | $400,000 | Deposit ↑, Loan ↑, Stamp duty ↑, Period may shift |
| 3 | **Valuation** | $350,000 | $380,000 | Starting equity position improves |
| 4 | **Rent/Week** | $471 | $550 | Cashflow improves, may purchase earlier |
| 5 | **Growth** | Medium | High | Faster equity growth, may enable earlier purchases |
| 6 | **Min Yield** | 5.0% | 6.0% | Validation threshold changes |
| 7 | **Days Unconditional** | 14 | 21 | Display only - timeline visualization |
| 8 | **Days Settlement** | 42 | 60 | Display only - timeline visualization |
| 9 | **LVR** | 80% | 90% | Deposit ↓, Loan ↑, LMI charged, Period may shift |
| 10 | **LMI Waiver** | false | true | LMI = $0, Lower cash required, May purchase earlier |
| 11 | **Loan Product** | IO | PI | Principal payments added, Cashflow ↓ |
| 12 | **Interest Rate** | 6.5% | 7.5% | Interest ↑, Cashflow ↓, May purchase later |
| 13 | **Loan Term** | 30 | 25 | PI payments ↑ (if PI selected), Cashflow ↓ |
| 14 | **Offset Account** | $0 | $20,000 | Effective interest ↓, Cashflow ↑ |

---

### Tab 2: Purchase Costs (12 fields)

| # | Field | Default | Change To | Expected Result |
|---|-------|---------|-----------|----------------|
| 15 | **Engagement Fee** | $7,000 | $15,000 | Cash required ↑ $8k, Period may shift later |
| 16 | **Conditional Deposit** | $7,000 | $10,000 | Deposit balance ↓ at settlement |
| 17 | **Insurance Upfront** | $0 | $1,500 | Cash required ↑ $1.5k |
| 18 | **Building/Pest** | $600 | $2,000 | Cash required ↑ $1.4k, Period may shift |
| 19 | **Plumbing/Electrical** | $0 | $800 | Cash required ↑ $800 |
| 20 | **Valuation** | $0 | $600 | Cash required ↑ $600 |
| 21 | **Unconditional Deposit** | $0 | $5,000 | Deposit balance ↓ at settlement |
| 22 | **Mortgage Fees** | $0 | $1,200 | Cash required ↑ $1.2k |
| 23 | **Conveyancing** | $1,200 | $2,500 | Cash required ↑ $1.3k, Period may shift |
| 24 | **Rates Adjustment** | $0 | $800 | Cash required ↑ $800 |
| 25 | **Maintenance Buffer** | $2,000 | $5,000 | Cash required ↑ $3k, Period may shift |
| 26 | **Stamp Duty Override** | null | $20,000 | Uses $20k instead of calculated, Period may shift |

---

### Tab 3: Cashflow (8 fields)

| # | Field | Default | Change To | Expected Result |
|---|-------|---------|-----------|----------------|
| 27 | **Vacancy Rate** | 2% | 5% | Income ↓ 3%, Cashflow ↓, Slower equity build |
| 28 | **Property Mgmt %** | 7% | 10% | PM fee ↑, Cashflow ↓ |
| 29 | **Insurance Annual** | $1,200 | $2,000 | Expenses ↑, Cashflow ↓ |
| 30 | **Council/Water** | $2,500 | $3,500 | Expenses ↑, Cashflow ↓ |
| 31 | **Strata** | $0 | $4,000 | Expenses ↑, Cashflow ↓ significantly |
| 32 | **Maintenance** | $1,500 | $3,000 | Expenses ↑, Cashflow ↓ |
| 33 | **Land Tax Override** | null | $1,500 | Uses $1,500 instead of calculated, Cashflow ↓ |
| 34 | **Deductions** | $0 | $2,000 | Net expenses ↓, Cashflow ↑ |

---

## How to Verify Each Change

### Method 1: Watch Purchase Period
1. Note current purchase period (e.g., "2025 H1")
2. Change a field
3. Close modal
4. Check if period changed (e.g., "2025 H2" or "2026 H1")
5. ✅ If period changed OR property became "challenging", field is working

### Method 2: Watch Total Cash Required
1. Open property details popup
2. Scroll to "Available Funds" section
3. Note "Total Cash Required" amount
4. Change a purchase cost field
5. Close and reopen popup
6. Check if "Total Cash Required" changed
7. ✅ If amount changed, field is working

### Method 3: Watch Cashflow
1. Open property details popup
2. Scroll to "Cashflow Breakdown" section
3. Note "Net Annual Cashflow" amount
4. Change a cashflow field (rent, vacancy, expenses)
5. Close and reopen popup
6. Check if "Net Annual Cashflow" changed
7. ✅ If cashflow changed, field is working

---

## Quick Test (5 minutes)

Test these 5 critical fields to verify the fixes:

1. **Purchase Price** ($350k → $500k)
   - Should see: Purchase period shifts significantly later
   - Verifies: Bug #1 fix

2. **Engagement Fee** ($7k → $20k)
   - Should see: Purchase period shifts later
   - Verifies: Bug #2 fix (purchase costs)

3. **Building/Pest Inspection** ($600 → $3,000)
   - Should see: Purchase period shifts later
   - Verifies: Bug #2 fix (purchase costs)

4. **Rent Per Week** ($471 → $600)
   - Should see: Purchase period shifts earlier (better cashflow)
   - Verifies: Cashflow calculations working

5. **LMI Waiver** (false → true)
   - Should see: Purchase period shifts earlier (no LMI cost)
   - Verifies: LMI integration working

---

## Full Test (30 minutes)

Go through all 39 fields systematically:
- Change each field one at a time
- Verify timeline recalculates
- Note the effect in a spreadsheet
- Reset field before testing next one

**Expected Result:** All 39 fields should cause timeline to update

---

## Edge Cases to Test

### Test 1: Multiple Fields at Once
1. Change purchase price, engagement fee, and rent
2. All three should compound in their effect
3. Timeline should reflect combined changes

### Test 2: Extreme Values
1. Set purchase price to $1,000,000
2. Property should become "challenging" (unaffordable)
3. Verify proper handling of Infinity period

### Test 3: Override Fields
1. Set stamp duty override to $0
2. Should use $0 instead of calculated
3. Purchase period should shift earlier

### Test 4: Zero Values
1. Set engagement fee to $0
2. Should reduce total cash required
3. Purchase period should shift earlier

---

## Automated Testing Script

For developers: Create a test that:
1. Adds a property to timeline
2. Gets baseline purchase period
3. Updates each field programmatically
4. Verifies timeline recalculates
5. Asserts purchase period changed or remained same (as expected)

---

## Success Criteria

✅ **PASS**: All 39 fields cause timeline to recalculate
✅ **PASS**: Purchase period shifts appropriately for each change
✅ **PASS**: Total cash required updates for purchase cost changes
✅ **PASS**: Cashflow updates for cashflow field changes
✅ **PASS**: No console errors during testing

❌ **FAIL**: Any field that doesn't affect output
❌ **FAIL**: Console errors or crashes
❌ **FAIL**: Timeline doesn't update after change

---

## Reporting Issues

If a field doesn't work:

1. **Document:**
   - Field name
   - Tab it's in
   - Original value
   - Changed value
   - Expected result
   - Actual result

2. **Check:**
   - Did you close the modal after changing?
   - Did you wait for debounce (500ms)?
   - Did you check console for errors?

3. **Report:**
   - Create issue with documentation above
   - Include screenshots if possible
   - Note your browser and version

---

## Notes

- Timeline updates are debounced (500ms delay)
- Changes save automatically when modal closes
- Some changes may not shift purchase period if cash flow/equity compensate
- Properties can become "challenging" (Infinity period) if truly unaffordable
- All changes are per-instance (won't affect template defaults)

---

## Expected Timeline Behavior

### Small Changes (±$1-5k)
- Period may stay same or shift ±1 period
- Indicates marginal impact

### Medium Changes (±$5-20k)
- Period typically shifts ±1-3 periods
- Indicates significant impact

### Large Changes (±$20k+)
- Period may shift ±4+ periods or become unaffordable
- Indicates major impact

---

## Conclusion

After testing all 39 fields, you should have confidence that:
1. Every user input affects the timeline
2. Changes are reflected immediately (after debounce)
3. Calculations are accurate and comprehensive
4. The system provides reliable affordability projections

**Status:** Ready for production testing ✅

