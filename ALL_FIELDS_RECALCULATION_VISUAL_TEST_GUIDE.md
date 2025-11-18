# All Fields Trigger Recalculation - Visual Test Guide

## Quick Visual Tests for Every Field Category

This guide shows you how to visually confirm that **EVERY field** triggers timeline recalculation.

---

## Category 1: Purchase Price & Property Value

### Test: Purchase Price Change

```
BEFORE: Property 1 @ $350k
┌───────────────────────────────────┐
│ 2025 H1: Unit ($350k)             │
│ 2025 H2: Apartment ($400k)        │
│ 2026 H1: Townhouse ($500k)        │
└───────────────────────────────────┘

ACTION: Edit Property 1 → Change price to $900k

AFTER: Timeline Recalculates ✅
┌───────────────────────────────────┐
│ 2025 H1: Unit ($900k)             │
│ 2027 H1: Apartment ($400k) ← Shifted!
│ 2028 H2: Townhouse ($500k) ← Shifted!
└───────────────────────────────────┘

WHY: Higher price = more deposit used = less available for next properties
```

### Test: Valuation at Purchase

```
BEFORE: Property 1, Valuation = Purchase Price ($350k)
┌────────────────────────────┐
│ Portfolio Equity: $50k     │
│ Extractable: $30k          │
└────────────────────────────┘

ACTION: Change valuation to $400k (good deal!)

AFTER: Equity Increases ✅
┌────────────────────────────┐
│ Portfolio Equity: $100k ← More equity!
│ Extractable: $70k   ← More to release!
└────────────────────────────┘

WHY: Higher valuation = instant equity = more equity release potential
```

---

## Category 2: Rental Income & Cashflow

### Test: Rental Income (rentPerWeek)

```
BEFORE: Property 1, Rent = $400/week
┌──────────────────────────────────┐
│ Annual Cashflow: -$2,000 (neg)   │
│ Properties Affordable: 4          │
└──────────────────────────────────┘

ACTION: Change rent to $600/week

AFTER: Cashflow Improves ✅
┌──────────────────────────────────┐
│ Annual Cashflow: +$8,000 (pos!) │
│ Properties Affordable: 6 ← More! │
└──────────────────────────────────┘

WHY: Higher rent = better cashflow = better serviceability
```

### Test: Vacancy Rate

```
BEFORE: Vacancy Rate = 0%
┌──────────────────────────────────┐
│ Effective Rent: $500/wk (100%)   │
│ Net Cashflow: +$5,000/year       │
└──────────────────────────────────┘

ACTION: Change vacancy rate to 10%

AFTER: Income Decreases ✅
┌──────────────────────────────────┐
│ Effective Rent: $450/wk (90%)    │
│ Net Cashflow: +$500/year ← Worse │
└──────────────────────────────────┘

WHY: Vacancy reduces effective income = worse cashflow
```

---

## Category 3: Loan Settings

### Test: LVR Change

```
BEFORE: LVR = 90%
┌──────────────────────────────────┐
│ Deposit Required: $35k (10%)     │
│ LMI: $12,500                     │
│ Total Cash: $47,500              │
│ Affordable: 2026 H1              │
└──────────────────────────────────┘

ACTION: Change LVR to 80%

AFTER: Requirements Change ✅
┌──────────────────────────────────┐
│ Deposit Required: $70k (20%)     │
│ LMI: $0 (no LMI!)                │
│ Total Cash: $70k                 │
│ Affordable: 2025 H2 ← Earlier!   │
└──────────────────────────────────┘

WHY: No LMI saves money, offsets larger deposit
```

### Test: Interest Rate

```
BEFORE: Interest Rate = 6.0%
┌──────────────────────────────────┐
│ Annual Interest: $18,000         │
│ Net Cashflow: +$2,000            │
│ Properties: 5                    │
└──────────────────────────────────┘

ACTION: Change to 8.0%

AFTER: Costs Increase ✅
┌──────────────────────────────────┐
│ Annual Interest: $24,000 ← Higher!
│ Net Cashflow: -$4,000 ← Negative!│
│ Properties: 3 ← Fewer!           │
└──────────────────────────────────┘

WHY: Higher rate = higher costs = worse cashflow = fewer properties
```

### Test: Loan Product (IO vs P&I)

```
BEFORE: Loan Product = Interest Only
┌──────────────────────────────────┐
│ Annual Payment: $20,000 (int)    │
│ Principal: $0                    │
│ Net Cashflow: +$5,000            │
└──────────────────────────────────┘

ACTION: Change to Principal & Interest

AFTER: Payments Increase ✅
┌──────────────────────────────────┐
│ Annual Payment: $32,000          │
│ Principal: $12,000               │
│ Net Cashflow: -$7,000 ← Negative!│
└──────────────────────────────────┘

WHY: P&I includes principal repayment = higher payments = worse cashflow
```

### Test: Loan Offset Account

```
BEFORE: Offset Account = $0
┌──────────────────────────────────┐
│ Loan Amount: $300k               │
│ Effective Loan: $300k            │
│ Interest: $19,500/year           │
└──────────────────────────────────┘

ACTION: Add $50k to offset account

AFTER: Interest Reduces ✅
┌──────────────────────────────────┐
│ Loan Amount: $300k               │
│ Effective Loan: $250k ← Lower!   │
│ Interest: $16,250/year ← Saved!  │
└──────────────────────────────────┘

WHY: Offset reduces effective loan = less interest = better cashflow
```

---

## Category 4: Ongoing Expenses

### Test: Strata Fees

```
BEFORE: Strata = $2,000/year
┌──────────────────────────────────┐
│ Total Expenses: $8,000/year      │
│ Net Cashflow: +$4,000            │
│ Next Property: 2026 H1           │
└──────────────────────────────────┘

ACTION: Change strata to $6,000/year

AFTER: Expenses Increase ✅
┌──────────────────────────────────┐
│ Total Expenses: $12,000/year     │
│ Net Cashflow: $0 ← Break-even!   │
│ Next Property: 2026 H2 ← Delayed!│
└──────────────────────────────────┘

WHY: Higher expenses = worse cashflow = delayed purchases
```

### Test: Council Rates & Water

```
BEFORE: Council Rates = $2,000/year
AFTER: Change to $4,000/year
RESULT: Net cashflow decreases by $2,000 ✅
        Timeline adjusts for worse cashflow
```

### Test: Property Management %

```
BEFORE: PM Fee = 6.6% of rent
┌──────────────────────────────────┐
│ Rent: $26,000/year               │
│ PM Fee: $1,716/year              │
└──────────────────────────────────┘

ACTION: Change to 10%

AFTER: Fees Increase ✅
┌──────────────────────────────────┐
│ Rent: $26,000/year               │
│ PM Fee: $2,600/year ← Higher!    │
└──────────────────────────────────┘

WHY: Higher PM % = higher expenses = worse cashflow
```

### Test: Building Insurance (Annual)

```
BEFORE: Insurance = $800/year
AFTER: Change to $1,500/year
RESULT: Expenses increase by $700 ✅
        Net cashflow decreases
        Timeline adjusts
```

### Test: Maintenance Allowance (Annual)

```
BEFORE: Maintenance = $2,000/year
AFTER: Change to $5,000/year
RESULT: Expenses increase by $3,000 ✅
        Significantly worse cashflow
        Fewer properties affordable
```

---

## Category 5: One-Off Purchase Costs

### Test: Engagement Fee

```
BEFORE: Engagement Fee = $5,000
┌──────────────────────────────────┐
│ Total Cash Required: $85,000     │
│ Available: $90,000               │
│ Surplus: $5,000                  │
│ Affordable: 2025 H1 ✓            │
└──────────────────────────────────┘

ACTION: Change to $15,000

AFTER: Cash Required Increases ✅
┌──────────────────────────────────┐
│ Total Cash Required: $95,000     │
│ Available: $90,000               │
│ Surplus: -$5,000 ← Not enough!   │
│ Affordable: 2025 H2 ← Delayed!   │
└──────────────────────────────────┘

WHY: Higher upfront costs = more cash needed = purchase delayed
```

### Test: Building & Pest Inspection

```
BEFORE: B&P = $500
AFTER: Change to $2,000
RESULT: Total cash required increases by $1,500 ✅
        May delay purchase by 1 period
```

### Test: Conveyancing

```
BEFORE: Conveyancing = $1,500
AFTER: Change to $3,000
RESULT: Settlement costs increase ✅
        Total cash required increases
        Timeline adjusts
```

### Test: Stamp Duty Override

```
BEFORE: Stamp Duty = Calculated $18,000
┌──────────────────────────────────┐
│ State: VIC                       │
│ Purchase: $500k                  │
│ Calculated: $18,000              │
└──────────────────────────────────┘

ACTION: Override to $25,000 (manual)

AFTER: Uses Override ✅
┌──────────────────────────────────┐
│ Stamp Duty: $25,000 ← Override!  │
│ Total Cash: +$7,000 more         │
│ Purchase delays 1 period         │
└──────────────────────────────────┘

WHY: Manual override = higher cost = more cash needed
```

---

## Category 6: State & Location

### Test: Change State

```
BEFORE: State = VIC
┌──────────────────────────────────┐
│ Purchase Price: $500k            │
│ Stamp Duty: $18,670 (VIC rates)  │
└──────────────────────────────────┘

ACTION: Change to NSW

AFTER: Stamp Duty Recalculates ✅
┌──────────────────────────────────┐
│ Purchase Price: $500k            │
│ Stamp Duty: $19,185 (NSW rates)  │
└──────────────────────────────────┘

WHY: Different states have different stamp duty calculations
```

---

## Category 7: Growth & Projections

### Test: Growth Assumption

```
BEFORE: Growth = Medium (6% p.a.)
┌──────────────────────────────────┐
│ Year 5 Value: $446k              │
│ Extractable Equity: $87k         │
│ Can Release: 2029                │
└──────────────────────────────────┘

ACTION: Change to High (8% p.a.)

AFTER: Growth Faster ✅
┌──────────────────────────────────┐
│ Year 5 Value: $489k ← Higher!    │
│ Extractable Equity: $121k        │
│ Can Release: 2028 ← Earlier!     │
└──────────────────────────────────┘

WHY: Higher growth = more equity sooner = earlier equity release
```

---

## How to Test Any Field

### Universal Test Pattern

```
1. Add Property to Timeline
   ├─ Note current position (e.g., 2026 H1)
   └─ Note subsequent properties

2. Edit the Field
   ├─ Open property detail modal
   ├─ Change specific field value
   └─ Save changes

3. Observe Timeline
   ├─ Should update within 100ms
   ├─ Property may shift position
   └─ Subsequent properties adjust

4. Check Summary Bar
   ├─ Should reflect new calculations
   └─ KPIs update immediately

✅ If all 4 steps work, the field triggers recalculation
```

---

## Success Indicators

### ✅ Working Correctly

- Timeline updates within 100ms of save
- Property cards show new values
- Summary bar KPIs update
- Subsequent properties reposition if needed
- No console errors
- Smooth, responsive UI

### ❌ Not Working (Would indicate a problem)

- Timeline stays frozen after edit
- Old values still showing
- Need to refresh page
- Console errors
- Lag or flickering

---

## Field Impact Summary

| Field Category | Example Field | Impact Type | Visual Change |
|----------------|---------------|-------------|---------------|
| **Property Value** | purchasePrice | Deposit & Cash | Position shifts |
| **Income** | rentPerWeek | Cashflow | More/fewer properties |
| **Loan** | interestRate | Cashflow | Position shifts |
| **Expenses** | strata | Cashflow | Fewer properties |
| **Costs** | engagementFee | Cash Required | Position delays |
| **State** | state | Stamp Duty | Cash requirement changes |
| **Growth** | growthAssumption | Equity | Equity release timing |

---

## Conclusion

**Every single field triggers recalculation because:**

1. ✅ All fields stored in `instances` object
2. ✅ Any field change recreates the object
3. ✅ useMemo detects the change
4. ✅ Calculations use the field values
5. ✅ Timeline updates immediately

**You can test this yourself:**
- Pick ANY field from the 38 available
- Edit it in the property detail modal
- Watch the timeline update immediately
- It works for ALL fields, not just purchase price

**This is exactly the behavior users expect and need for effective portfolio planning.**

