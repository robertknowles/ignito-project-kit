# Purchase Velocity Visual Guide

## Before vs After Comparison

### BEFORE: 6-Month Gap Rule (Old Behavior)

```
Timeline (6-month periods):

2025 H1: 🏠 Property 1
         ❌ Cannot purchase another property

2025 H2: ✅ Available for purchase
         🏠 Property 2
         ❌ Cannot purchase another property

2026 H1: ✅ Available for purchase
         🏠 Property 3
         ❌ Cannot purchase another property

2026 H2: ✅ Available for purchase
         🏠 Property 4

Result: 4 properties over 2 years (limited by mandatory gaps)
```

### AFTER: 3 Per Period Limit (New Behavior - Option A)

```
Timeline (6-month periods):

2025 H1: 🏠 Property 1
         🏠 Property 2
         🏠 Property 3
         ✅ Max of 3 reached for this period

2025 H2: 🏠 Property 4
         ✅ Available for more (if affordable)

Result: 4 properties over 1 year (faster scaling!)
```

## Example Scenarios

### Scenario 1: Conservative Investor (2 Properties)

**Old System:**
```
2025 H1: 🏠 Property 1
2025 H2: 🏠 Property 2
```

**New System:**
```
2025 H1: 🏠 Property 1
         🏠 Property 2
```
✅ **Benefit:** Can acquire both properties immediately if funds allow

---

### Scenario 2: Moderate Investor (5 Properties)

**Old System:**
```
2025 H1: 🏠 Property 1
2025 H2: 🏠 Property 2
2026 H1: 🏠 Property 3
2026 H2: 🏠 Property 4
2027 H1: 🏠 Property 5
```
⏱️ **Timeline:** 2.5 years

**New System:**
```
2025 H1: 🏠 Property 1
         🏠 Property 2
         🏠 Property 3 (max reached)
2025 H2: 🏠 Property 4
         🏠 Property 5
```
⏱️ **Timeline:** 1 year

✅ **Benefit:** 1.5 years faster to complete portfolio!

---

### Scenario 3: Aggressive Investor (8 Properties)

**Old System:**
```
2025 H1: 🏠 Property 1
2025 H2: 🏠 Property 2
2026 H1: 🏠 Property 3
2026 H2: 🏠 Property 4
2027 H1: 🏠 Property 5
2027 H2: 🏠 Property 6
2028 H1: 🏠 Property 7
2028 H2: 🏠 Property 8
```
⏱️ **Timeline:** 4 years

**New System:**
```
2025 H1: 🏠 Property 1
         🏠 Property 2
         🏠 Property 3 (max reached)
2025 H2: 🏠 Property 4
         🏠 Property 5
         🏠 Property 6 (max reached)
2026 H1: 🏠 Property 7
         🏠 Property 8
```
⏱️ **Timeline:** 1.5 years

✅ **Benefit:** 2.5 years faster! Massive acceleration

---

### Scenario 4: Limited Funds (4 Properties, but only 1 affordable initially)

**Both Systems:**
```
2025 H1: 🏠 Property 1
         💰 Insufficient funds for Property 2

2025 H2: 💰 Still saving...

2026 H1: 🏠 Property 2
         💰 Insufficient funds for Property 3

2026 H2: 🏠 Property 3
         🏠 Property 4
```

✅ **Note:** The new system still respects affordability. It allows front-loading when funds are available, but doesn't force purchases if you can't afford them.

---

## How the 3-Property Limit Works

### Period-by-Period Processing

The system processes properties **sequentially** and **assigns them to the earliest affordable period**:

```
Step 1: Check Property 1
  ↓
  Period 1 (2025 H1): Count = 0
  ↓
  Can afford? ✅ → Assign to Period 1
  ↓
  Period 1 count = 1

Step 2: Check Property 2
  ↓
  Period 1 (2025 H1): Count = 1
  ↓
  Can afford? ✅ → Assign to Period 1
  ↓
  Period 1 count = 2

Step 3: Check Property 3
  ↓
  Period 1 (2025 H1): Count = 2
  ↓
  Can afford? ✅ → Assign to Period 1
  ↓
  Period 1 count = 3 (MAX REACHED)

Step 4: Check Property 4
  ↓
  Period 1 (2025 H1): Count = 3 ❌ MAX
  ↓
  Move to Period 2 (2025 H2): Count = 0
  ↓
  Can afford? ✅ → Assign to Period 2
  ↓
  Period 2 count = 1
```

---

## Combined Costs & Capacity

### Deposit Calculation (Same Period Purchases)

When multiple properties are purchased in the same period, **deposits are deducted sequentially**:

```
Starting Available Funds: £100,000

Property 1 (2025 H1):
  Cost: £200,000
  Deposit: £40,000
  ↓
  Remaining: £60,000

Property 2 (2025 H1):
  Cost: £200,000
  Deposit: £40,000
  ↓
  Remaining: £20,000

Property 3 (2025 H1):
  Cost: £100,000
  Deposit: £20,000
  ↓
  Remaining: £0

✅ All 3 properties purchased in 2025 H1
```

### Borrowing Capacity Check (Same Period Purchases)

The system verifies **total debt** doesn't exceed **effective borrowing capacity**:

```
Base Borrowing Capacity: £800,000
Equity Boost: £100,000 (from existing portfolio)
→ Effective Capacity: £900,000

Property 1 Loan: £160,000
Property 2 Loan: £160,000
Property 3 Loan: £80,000
→ Total New Debt: £400,000

Total Debt After: £400,000
Remaining Capacity: £500,000 ✅
```

---

## Interaction with Other Features

### With Pause Blocks

You can still use pause blocks to space out purchases:

```
2025 H1: 🏠 Property 1
         🏠 Property 2

⏸️  PAUSE: 1 year

2026 H1: 🏠 Property 3
         🏠 Property 4
```

### With Mixed Property Types

The 3-property limit applies **regardless of property type**:

```
2025 H1: 🏠 Apartment ($300k)
         🏢 Townhouse ($450k)
         🏡 House ($600k)
         ✅ Max 3 reached (even though different types)
```

### With IO vs P&I Loans

The system correctly calculates **combined serviceability** for mixed loan types:

```
2025 H1: 🏠 Property 1 (IO loan) → Lower repayments
         🏠 Property 2 (IO loan) → Lower repayments
         🏠 Property 3 (P&I loan) → Higher repayments
         
Total Annual Repayments = Sum of all 3
↓
Serviceability Check: Can you afford the combined payments?
```

---

## Dashboard Display

### Investment Timeline View

```
╔══════════════════════════════════════════════╗
║  2025 H1                                     ║
║  ✅ Property 1 - Sydney CBD Apartment        ║
║  ✅ Property 2 - Melbourne CBD Apartment     ║
║  ✅ Property 3 - Brisbane Unit               ║
║  Portfolio Value: £900,000                   ║
╠══════════════════════════════════════════════╣
║  2025 H2                                     ║
║  ✅ Property 4 - Gold Coast Unit             ║
║  Portfolio Value: £1,200,000                 ║
╚══════════════════════════════════════════════╝
```

### Affordability Breakdown Table

```
Period    | Status      | Available Funds | Debt Used  | Notes
----------|-------------|-----------------|------------|------------------
2025 H1   | BUY Prop #1 | £100,000       | £160,000   | Property 1 of 3
2025 H1   | BUY Prop #2 | £60,000        | £320,000   | Property 2 of 3
2025 H1   | BUY Prop #3 | £20,000        | £400,000   | Property 3 of 3 (MAX)
2025 H2   | Accumulate  | £45,000        | £400,000   | Savings + cashflow
2025 H2   | BUY Prop #4 | £45,000        | £550,000   | Property 1 of 3
```

---

## Why 3 Properties?

The **3-property limit per period** balances:

✅ **Aggressive Growth:** Allows front-loading for rapid scaling
✅ **Realistic Execution:** 3 settlements in 6 months is achievable
✅ **Risk Management:** Prevents over-leverage in a single period
✅ **Cashflow Control:** Easier to manage 3 simultaneous purchases

### Alternative Limits (Not Implemented)

| Limit | Pros | Cons |
|-------|------|------|
| No limit | Maximum flexibility | Unrealistic execution |
| 1 per period | Very conservative | Too slow for aggressive investors |
| 2 per period | Moderate pace | Doesn't match ambitious goals |
| **3 per period** ✅ | **Best balance** | **Realistic yet aggressive** |
| 5+ per period | Ultra aggressive | Very difficult to execute |

---

## Frequently Asked Questions

### Q: What if I want a slower pace?

**A:** You can still achieve this by:
1. Selecting fewer properties
2. Using pause blocks between properties
3. The system places properties as early as possible, but you control the selection

### Q: What if I can't afford 3 properties in the first period?

**A:** The system will place only what you can afford. If you can afford 1, it places 1. If you can afford 2, it places 2. The limit is a maximum, not a requirement.

### Q: Can I have more than 3 if I use pause blocks?

**A:** No. The 3-property limit applies per 6-month period. A pause block creates a gap, but when purchases resume, the 3-per-period limit still applies.

### Q: Does this change my existing scenarios?

**A:** No. Existing scenarios will automatically benefit from the new logic. Properties that were previously spaced out may now be consolidated into fewer periods if affordable.

### Q: Can I change the limit to something other than 3?

**A:** Currently, the limit is hardcoded to 3. Future versions may allow customization. If you need a different limit, please contact support.

---

## Testing Your Strategy

### Recommended Test Cases

1. **Select 2 properties** → Should see both in first period (if affordable)
2. **Select 5 properties** → Should see 3 in first period, 2 in second
3. **Select 10 properties** → Should see 3-3-3-1 distribution (if all affordable)
4. **Add pause block after property 2** → Should see 2-[pause]-3-3... pattern
5. **Use different property types** → Mix of units, townhouses, houses (still max 3)

### What to Verify

✅ No more than 3 properties assigned to any single period
✅ Properties are assigned to earliest affordable period
✅ Total debt respects borrowing capacity limits
✅ Deposit pool correctly decreases with each purchase
✅ Cashflow and equity are correctly calculated for same-period purchases

---

## Summary

| Feature | Old System | New System |
|---------|------------|------------|
| **Min Gap** | 6 months | None |
| **Max Per Period** | 1 | 3 |
| **Execution Speed** | 6 months per property | Up to 3 per 6 months |
| **Portfolio of 5** | 2.5 years | 1 year |
| **Portfolio of 10** | 5 years | 2 years |
| **Flexibility** | Low | High |
| **Front-Loading** | Not possible | Fully supported |

🚀 **Result:** Dramatically faster portfolio growth for investors with sufficient capital and borrowing capacity!

