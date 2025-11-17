# Affordability Failure Message - Before & After Visual Comparison

## Before (Generic Message) ❌

```
┌────────────────────────────────────────────────────────────────┐
│  [Property Card showing the unaffordable property]             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Why can't these properties be afforded?                    │
│                                                                 │
│  These properties exceed your borrowing capacity, deposit      │
│  availability, or serviceability requirements within the       │
│  17-year timeline. Consider:                                   │
│                                                                 │
│  • Extending your timeline period                              │
│  • Increasing your deposit pool or annual savings              │
│  • Selecting lower-priced properties                           │
│  • Improving your borrowing capacity                           │
└────────────────────────────────────────────────────────────────┘
```

**Problems:**
- ❌ Doesn't specify WHICH constraint failed
- ❌ Doesn't show HOW MUCH the shortfall is
- ❌ Can't prioritize improvements
- ❌ Vague and unhelpful for decision-making

---

## After (Specific Per-Property Breakdown) ✅

```
┌────────────────────────────────────────────────────────────────┐
│  [Property Card showing the unaffordable property]             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  ⚠️ Why can't these properties be afforded?                    │
│                                                                 │
│  These properties cannot be purchased within your 17-year      │
│  timeline due to the following constraints:                    │
│                                                                 │
│  ┃ 123 Main Street, Sydney                                     │
│  ┃ • Deposit shortfall: $45,000                                │
│  ┃ • Serviceability shortfall: $12,000                         │
│                                                                 │
│  ┃ 456 Queen Street, Melbourne                                 │
│  ┃ • Borrowing capacity exceeded (requires $850,000 loan)      │
│                                                                 │
│  ┃ 789 Park Avenue, Brisbane                                   │
│  ┃ • Deposit shortfall: $20,000                                │
│                                                                 │
│  ────────────────────────────────────────────────────────────  │
│  Consider these options:                                       │
│  • Extending your timeline period                              │
│  • Increasing your deposit pool or annual savings              │
│  • Selecting lower-priced properties                           │
│  • Improving your borrowing capacity (higher income or lower   │
│    expenses)                                                   │
└────────────────────────────────────────────────────────────────┘
```

**Improvements:**
- ✅ Shows EXACTLY which test(s) failed per property
- ✅ Displays SPECIFIC dollar amounts for each shortfall
- ✅ Easy to prioritize (Brisbane only needs $20K more)
- ✅ Actionable - know exactly what to improve
- ✅ Professional and transparent
- ✅ Red left border visually groups each property's issues

---

## Real-World Examples

### Example 1: First-Time Buyer with Limited Deposit

**Property:** $650,000 investment property
**Situation:** Has $90,000 saved, needs $130,000 deposit

```
┃ Investment Property - Brisbane CBD
┃ • Deposit shortfall: $40,000
```

**User Action:** 
- Can calculate: "Need to save $833/month for 4 more years"
- Or: "Consider properties under $550,000 instead"

---

### Example 2: Existing Investor at Borrowing Limit

**Property:** $900,000 property
**Situation:** Already has 3 properties, hit borrowing capacity

```
┃ Luxury Apartment - Gold Coast
┃ • Borrowing capacity exceeded (requires $720,000 loan)
```

**User Action:**
- Knows deposit isn't the problem (has enough)
- Needs to: Increase income, reduce expenses, or wait for equity growth
- Or: Select cheaper properties within capacity

---

### Example 3: High Income but Low Savings

**Property:** $800,000 property  
**Situation:** Can service the loan but hasn't saved enough deposit

```
┃ Family Home - Sydney Suburbs
┃ • Deposit shortfall: $85,000
```

**User Action:**
- Serviceability is fine (not listed)
- Just needs more time to save
- Can calculate exact timeline: $85,000 ÷ annual savings

---

### Example 4: Multiple Constraints

**Property:** $1,200,000 luxury property
**Situation:** Ambitious first property, multiple barriers

```
┃ Penthouse Apartment - Sydney CBD
┃ • Deposit shortfall: $120,000
┃ • Serviceability shortfall: $45,000
┃ • Borrowing capacity exceeded (requires $960,000 loan)
```

**User Action:**
- Clearly not ready for this property
- Can see it needs fundamental changes (income/savings/timeline)
- Suggests selecting more appropriate properties

---

## Technical Details

### Data Source
All values come from the `TimelineProperty` object:
- `depositTestPass` / `depositTestSurplus`
- `serviceabilityTestPass` / `serviceabilityTestSurplus`  
- `loanAmount` / `borrowingCapacityRemaining`

### Display Logic

```typescript
// Pseudo-code for display logic
for each property where affordableYear === Infinity:
  failures = []
  
  if (!depositTestPass) {
    shortfall = Math.abs(depositTestSurplus)
    failures.add("Deposit shortfall: " + formatCurrency(shortfall))
  }
  
  if (!serviceabilityTestPass) {
    shortfall = Math.abs(serviceabilityTestSurplus)
    failures.add("Serviceability shortfall: " + formatCurrency(shortfall))
  }
  
  if (depositTestPass && serviceabilityTestPass) {
    // Both pass but still can't afford = borrowing capacity issue
    failures.add("Borrowing capacity exceeded (requires " + 
                 formatCurrency(loanAmount) + " loan)")
  }
  
  display property.title with all failures
```

### Currency Formatting
- Format: Australian Dollars (AUD)
- Style: `$XXX,XXX` (no decimals)
- Always positive numbers (using `Math.abs()`)

---

## User Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Clarity** | Generic message | Specific per-property breakdown |
| **Actionability** | Vague suggestions | Exact dollar amounts to target |
| **Transparency** | Hidden calculations | Shows actual test results |
| **Decision Making** | Guess which properties are closest | Clear prioritization by shortfall amount |
| **Professional** | Basic | Detailed financial analysis |
| **User Confidence** | Uncertain | Understands exact constraints |

---

## Design Pattern Consistency

This update maintains consistency with other affordability displays:

### Similar Patterns in App
1. **Decision Engine Modal** - Shows detailed test breakdowns
2. **Purchase Event Card** - Displays deposit/serviceability tests
3. **Affordability Calculator** - Provides test result details

### Visual Language
- ✅ Red borders for blocked/failed items
- ✅ Currency formatting matches rest of app
- ✅ Bulleted lists for multiple items
- ✅ Clear section headers
- ✅ Soft red background (`bg-red-50`) for warnings

---

## Summary

This enhancement transforms a generic warning into actionable financial intelligence by showing users **exactly what failed and by how much** for each unaffordable property. It enables informed decision-making and clear goal-setting without any changes to the underlying data structure or calculations.

