# Property Price Timeline Bug Fix - Testing Guide

## Quick Test Steps

### Basic Test: Single Property Price Change

1. **Add a property to the timeline**
   - Select a property type (e.g., "Sydney Unit")
   - Add quantity: 1
   - Note the purchase period shown (e.g., "2025 H1")
   - Note the property cost shown (e.g., "$500,000")

2. **Open property details**
   - Click on the property card in the timeline
   - Property details modal opens

3. **Update the purchase price**
   - Find "Purchase Price" field
   - Change from $500,000 to $600,000
   - Save/close the modal

4. **Verify timeline updates**
   - ✅ Timeline recalculates immediately
   - ✅ Property card now shows $600,000
   - ✅ Deposit amount increased proportionally (e.g., 20% of $600k = $120k)
   - ✅ Loan amount reflects new price (e.g., 80% of $600k = $480k)
   - ✅ Purchase period may shift (if affordability changed)

5. **Check acquisition costs**
   - Click property card to open details popup
   - View "Acquisition Costs" section
   - ✅ Stamp duty recalculated for $600,000
   - ✅ LMI recalculated for new loan amount
   - ✅ Total acquisition costs reflect new price

### Advanced Test: Multiple Properties

1. **Add three properties**
   - Property A: $500,000 (default)
   - Property B: $450,000 (default)
   - Property C: $550,000 (default)
   - Note their purchase periods

2. **Update Property A price**
   - Change Property A to $700,000
   - ✅ Property A purchase period may shift later
   - ✅ Property B and C periods may also shift (cascade effect)

3. **Verify cascade effect**
   - Higher price = less funds available
   - Later purchase = less time for equity to build
   - Subsequent properties may be delayed

4. **Update Property B price (decrease)**
   - Change Property B to $350,000
   - ✅ Property B may purchase earlier
   - ✅ More funds available for Property C
   - ✅ Property C may purchase earlier too

### Test Case: Price Increase Makes Property Unaffordable

1. **Add property at edge of affordability**
   - Select expensive property (e.g., "Melbourne House" at $800k)
   - Note it purchases in later period (e.g., "2030 H2")

2. **Increase price significantly**
   - Change to $1,200,000
   - ✅ Property may become "challenging" (red, Infinity period)
   - ✅ Timeline indicates affordability failure

3. **Verify affordability details**
   - Click on "challenging" property
   - View popup showing specific failures:
     - Deposit test: PASS/FAIL
     - Serviceability test: PASS/FAIL
     - Borrowing capacity: remaining capacity

### Test Case: Price Decrease Makes Property Affordable Earlier

1. **Add expensive property**
   - Property purchases in period 40 (year 2045)

2. **Decrease price by 20%**
   - ✅ Property purchases earlier (e.g., period 30, year 2040)
   - ✅ More equity released sooner
   - ✅ Better portfolio velocity

### Test Case: Equity Release Calculation

1. **Add Property A at $500k**
   - Purchases in 2025 H1

2. **Add Property B at $600k**
   - Note its purchase period (e.g., 2027 H2)
   - Note "Available Funds" breakdown:
     - Base Deposit
     - Cumulative Savings
     - Cashflow Reinvestment
     - **Equity Release** ← this is key

3. **Update Property A to $700k**
   - ✅ Property A takes more funds initially
   - ✅ But grows faster (higher value)
   - ✅ Property B may actually purchase EARLIER due to more equity release
   - ✅ Verify "Equity Release" amount increased

### Test Case: Cashflow Impact

1. **Add Property A with high yield**
   - Default price: $400,000
   - Note rental income and cashflow

2. **Increase price to $600,000**
   - ✅ Rental income increases (yield % × property value)
   - ✅ Expenses increase (property management, insurance scale)
   - ✅ Net cashflow may improve or worsen
   - ✅ "Cashflow Reinvestment" amount adjusts

3. **Check property card details**
   - Gross Rental Income: increased
   - Loan Interest: increased
   - Expenses: increased
   - Net Cashflow: verify calculation

## Visual Verification Points

### Property Card Display
```
┌─────────────────────────────────┐
│ Sydney Unit                     │
│ 2025 H1                         │
│                                 │
│ Purchase Price: $600,000  ✅    │  ← Should show updated price
│ Deposit: $120,000         ✅    │  ← Should scale proportionally
│ Loan: $480,000           ✅    │  ← Should reflect new price
└─────────────────────────────────┘
```

### Property Details Popup
```
Available Funds Breakdown:
- Base Deposit: $80,000
- Cumulative Savings: $120,000
- Cashflow Reinvestment: $15,000
- Equity Release: $50,000
─────────────────────────
Total Available: $265,000  ✅  ← Should cover deposit + costs

Acquisition Costs:
- Stamp Duty: $30,000      ✅  ← Calculated on $600k
- LMI: $12,000            ✅  ← Calculated on $480k loan
- Legal Fees: $1,200
- Other: $1,500
─────────────────────────
Total Costs: $44,700       ✅  ← Should reflect updated price
```

### Timeline Progress Bar
```
2025   2026   2027   2028   2029
  │      │      │      │      │
  A      -      B      C      -
  
↓ After updating price of A from $500k to $700k:

2025   2026   2027   2028   2029
  │      │      │      │      │
  A      -      -      B      C
```
Properties B and C shift later due to increased cost of A.

## Expected Behavior Summary

| Change | Expected Impact |
|--------|----------------|
| **Price ↑** | • Deposit ↑<br>• Loan ↑<br>• Acquisition costs ↑<br>• Purchase period → later<br>• May become unaffordable |
| **Price ↓** | • Deposit ↓<br>• Loan ↓<br>• Acquisition costs ↓<br>• Purchase period → earlier<br>• More funds for next property |
| **Price = template** | • Uses default values<br>• No change in behavior |

## Common Issues to Watch For

### ❌ Bug Symptoms (if not fixed)
- Property price updated in modal but timeline shows old price
- Deposit and loan amounts don't match updated price
- Acquisition costs calculated on old price
- Timeline doesn't recalculate after price change
- Purchase history uses template defaults

### ✅ Correct Behavior (after fix)
- Timeline recalculates immediately on instance update
- All values (deposit, loan, costs) proportional to new price
- Purchase period adjusts based on new affordability
- Cascade effect: later properties shift appropriately
- Equity release calculations use updated property values

## Debug Output

If you need to verify calculations, set `DEBUG_MODE = true` in `useAffordabilityCalculator.ts` (line 105).

This will log detailed traces like:

```
--- Period 2025 H1 (Year 2025.0) Debug Trace ---
💰 Available Funds: Total = $265,000
   ├─ Base Deposit Pool: $80,000
   ├─ Cumulative Savings: $120,000
   ├─ Net Cashflow Reinvestment: $15,000
   └─ Continuous Equity Access: $50,000

💳 Debt Position: Total After Purchase = $480,000
   ├─ Existing Debt: $0
   └─ New Loan Required: $480,000

✅ Final Decision: DepositTest = PASS | BorrowingCapacity = PASS | ServiceabilityTest = PASS | Purchase = 2025 H1
```

Look for the property price in these logs to verify correct values are being used.

## Testing Checklist

- [ ] Single property price increase
- [ ] Single property price decrease
- [ ] Multiple properties with price changes
- [ ] Price change causes unaffordability
- [ ] Price change enables earlier purchase
- [ ] Deposit scales proportionally
- [ ] Loan amount updates correctly
- [ ] Acquisition costs recalculate (stamp duty, LMI)
- [ ] Equity release calculations use updated values
- [ ] Cashflow projections reflect new rental income
- [ ] Portfolio metrics (value, debt, equity) accurate
- [ ] Timeline progress bar shows correct periods
- [ ] Property cards display updated values
- [ ] Details popup shows correct calculations
- [ ] Cascade effect on subsequent properties
- [ ] Fallback to template defaults when not customized

## Notes

- Property instances are auto-created when properties are added to timeline
- Changes persist in browser localStorage per client
- Timeline recalculates automatically when instances change (500ms debounce)
- Deposit percentage from template is preserved (e.g., 20% deposit maintained)
- All calculations use the same correct values (consistency guaranteed)

