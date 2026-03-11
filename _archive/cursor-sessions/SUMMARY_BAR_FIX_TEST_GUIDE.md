# Summary Bar Fix - Testing Guide

## Quick Test Checklist

### ✅ Test 1: Single Property - Current Values
**Setup:**
- Add one property ($350k purchase price)
- Affordable in 2025

**Expected Results:**
- **Portfolio Value:** ~$378k (not $2.3M!)
  - Should show property value with Year 1 growth applied
  - Growth Year 1 default: 12.5% → $350k × 1.125 = $393.75k
  - Or actual template growth rate for that property
- **Total Debt:** $280k-$315k (loan amount, ~80-90% LVR)
- **Equity:** ~$60-100k (purchase deposit + Year 1 equity growth)
- **Cashflow:** Should be slightly negative or neutral for Year 1
- **Timeline Progress:** Year 1 / 15 (or your timeline length)

**❌ FAIL if:** Portfolio Value shows $1M+ (that's end-of-timeline projection)

---

### ✅ Test 2: Multiple Properties - Latest Year Values
**Setup:**
- Property A: $350k, affordable in 2025
- Property B: $400k, affordable in 2028

**Expected Results:**
- **Portfolio Value:** ~$845k (not $3M+!)
  - Property A: $350k grown for 3 years (2025→2028)
  - Property B: $400k with minimal growth (just purchased in 2028)
  - Combined: ~$450k + $395k = $845k
- **Total Debt:** ~$630k (both loan amounts combined)
- **Equity:** ~$215k (combined equity after 3 years)
- **Timeline Progress:** Year 4 / 15 (2025→2028 = 3 years elapsed, showing Year 4)

**Key Behavior:**
- Summary Bar should update to 2028 values when second property is added
- First property should show 3 years of growth
- Second property should show purchase price (minimal growth)

**❌ FAIL if:** Values show 30-year projections

---

### ✅ Test 3: Year 1 Reality Check
**Setup:**
- Any single property
- Just purchased (Year 1)

**Expected Portfolio Value Calculation:**
```
Purchase Price: $350,000
× Year 1 Growth: 12.5% (default)
= Current Value: $393,750
```

**Expected Equity:**
```
Current Value: $393,750
- Loan Amount: $280,000 (80% LVR)
= Equity: $113,750
```

**Expected Debt:**
```
Loan Amount: $280,000 (no principal reduction yet)
```

**❌ FAIL if:** 
- Portfolio Value > $500k for a $350k property in Year 1
- Equity > $150k
- Debt has reduced significantly (should be full loan amount)

---

### ✅ Test 4: Add Third Property - Values Update
**Setup:**
- Property A: 2025
- Property B: 2028  
- Property C: 2031

**Expected Behavior:**
- Summary Bar should jump to 2031 values
- Property A: 6 years of growth
- Property B: 3 years of growth  
- Property C: Year 1 (just purchased)
- **Timeline Progress:** Should show Year 7 / 15

**Expected Portfolio Value:** ~$1.3M
- Property A: ~$550k (6 years growth from $350k)
- Property B: ~$520k (3 years growth from $400k)
- Property C: ~$395k (Year 1 growth from $350k)

**❌ FAIL if:** Values show end-of-timeline (15+ years)

---

## Visual Verification

### Before Fix (WRONG ❌)
```
┌─────────────────────────────────────────────┐
│ Portfolio Value: $2.3M  ← 30 years future!  │
│ Properties: 1                               │
│ Equity: $1.8M           ← Unrealistic!      │
│ Total Debt: $500k       ← Wrong!            │
└─────────────────────────────────────────────┘
```

### After Fix (CORRECT ✅)
```
┌─────────────────────────────────────────────┐
│ Portfolio Value: $378k  ← Current value!    │
│ Properties: 1                               │
│ Equity: $98k            ← Realistic!        │
│ Total Debt: $280k       ← Correct!          │
└─────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario A: Conservative Property
- Purchase: $300k
- Growth Year 1: 6% (conservative template)
- Expected Summary Bar: ~$318k portfolio value

### Scenario B: Growth Property  
- Purchase: $500k
- Growth Year 1: 15% (high-growth template)
- Expected Summary Bar: ~$575k portfolio value

### Scenario C: Multiple Years Gap
- Property 1: 2025 ($350k)
- Property 2: 2035 ($450k) ← 10 years later
- Expected Summary Bar shows 2035 values:
  - Property 1: ~$600k (10 years growth)
  - Property 2: ~$507k (Year 1 growth)
  - Total: ~$1.1M
  - Timeline Progress: Year 11 / 15

---

## Red Flags (Indicates Bug)

🚨 **Portfolio Value over $1M for single property** → Shows end-of-timeline instead of current

🚨 **Debt is significantly lower than loan amount** → Calculation including principal reduction

🚨 **Timeline Progress doesn't match latest purchase** → Using wrong year calculation

🚨 **Values don't change when adding later property** → Not recalculating to latest year

🚨 **Equity exceeds 80% of portfolio value** → Wrong calculation point

---

## Developer Notes

### What Changed:
- Calculation point: `timelineEnd` → `latestPurchaseYear`
- Shows "current status" not "future projection"
- Label: "Final Portfolio Value" → "Portfolio Value"

### What Didn't Change:
- Metrics calculation functions (all in `metricsCalculator.ts`)
- Growth rate application
- Equity/debt/cashflow formulas
- UI layout or styling

### Code Location:
- File: `src/components/SummaryBar.tsx`
- Key lines: 29-34 (currentYear calculation), 65-83 (metrics calculation)

---

## Troubleshooting

**Q: Values still look too high?**
- Check property growth rates in Data Assumptions
- Verify calculation using: `purchasePrice × (1 + growthRate)^years`
- Default Year 1 growth: 12.5%

**Q: Summary Bar not updating when adding properties?**
- Check `timelineProperties` has correct `affordableYear` values
- Verify `feasibleProperties` filter is working
- Check console for calculation errors

**Q: Timeline Progress seems off?**
- Uses separate `calculateYearProgress()` function (lines 94-109)
- Should match latest purchase year - 2025 + 1

---

## Success Criteria

✅ Single property shows reasonable current values (~10-20% above purchase price for Year 1)

✅ Multiple properties show values as of latest purchase year

✅ Adding later property updates all values to that later year

✅ Portfolio Value reasonable for number of years elapsed

✅ No multi-million dollar values for 1-2 properties in early years

✅ "Portfolio Value" label (not "Final Portfolio Value")

