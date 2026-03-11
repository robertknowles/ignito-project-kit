# Decision Engine User Guide

## 🎯 What is the Decision Engine?

The Decision Engine shows you **why and when** you can afford to buy each investment property. It breaks down the affordability analysis into three clear tests that every purchase must pass.

## 📍 How to Access

1. Navigate to the **Decision Engine** tab in the application
2. Make sure you have properties selected in **Building Blocks**
3. The analysis will automatically generate for each year

## 🔍 Understanding the Three Tests

Every property purchase must pass **three critical tests** to be feasible:

### 1. 💰 Deposit Test
**Question:** Do you have enough cash for the deposit and all upfront costs?

**What it checks:**
- ✅ Base deposit you started with
- ✅ Savings accumulated over time
- ✅ Cashflow reinvested from properties
- ✅ Equity released from existing properties

**Against:**
- ❌ Deposit required (typically 20% of price)
- ❌ Stamp duty (varies by state)
- ❌ Lender's Mortgage Insurance (if LVR > 80%)
- ❌ Legal fees, inspections, and other costs

**Result:** PASS if you have more cash than required, FAIL if not.

### 2. 📊 Serviceability Test
**Question:** Can your income service the loan repayments?

**What it checks:**
- ✅ Your base borrowing capacity (10% rule)
- ✅ Rental income from properties (70% recognized by banks)

**Against:**
- ❌ Interest payments on existing loans
- ❌ Interest payments on the new loan

**Result:** PASS if your income capacity exceeds loan payments, FAIL if not.

### 3. 🏦 Borrowing Capacity Test
**Question:** Are you within your total borrowing limits?

**What it checks:**
- ✅ Your base borrowing capacity (from income)
- ✅ Equity boost from portfolio (88% of extractable equity)

**Against:**
- ❌ Total debt after this purchase (existing + new)

**Result:** PASS if capacity exceeds total debt, FAIL if not.

## 🎨 How to Read the Interface

### Year Header (Collapsed)
```
▶ Year 2025 (Unit in Brisbane)    Portfolio: $800k  Equity: $160k  LVR: 80.0%  [PURCHASED]
```

**Click to expand** and see the detailed analysis.

### Year Header (Expanded)
```
▼ Year 2025 (Unit in Brisbane)    Portfolio: $800k  Equity: $160k  LVR: 80.0%  [PURCHASED]
```

**Click to collapse** and hide the details.

### Status Badges

- 🟢 **PURCHASED** - Property was successfully purchased in this year
- 🔵 **-** - No purchase attempted (between purchase years)
- 🔴 **Blocked** - Purchase attempted but failed one or more tests
- 🟡 **Waiting...** - Purchase on hold due to gap rule

### PASS/FAIL Indicators

Each funnel shows a large badge at the top:

- ✅ **PASS** (Green background) - Test passed with surplus
- ❌ **FAIL** (Red background) - Test failed with shortfall

## 📖 Reading a Funnel

Each funnel follows the same structure:

1. **Top Badge** - Shows PASS/FAIL and surplus/shortfall amount
2. **Section 1-3** - Shows the inputs (what you have, what you need)
3. **The Calculation** - Shows the math: Available − Required = Result
4. **The Result** - Explains what the outcome means

### Example: Deposit Test

```
┌─────────────────────────────┐
│    ✅ PASS                   │  ← Quick status at top
│    Surplus: $15,000         │
├─────────────────────────────┤
│  💰 What We Have            │  ← Section 1: Inputs
│    Base: $80k               │
│    Savings: $30k            │
│    Total: $120k             │
├─────────────────────────────┤
│  🎯 What We Need            │  ← Section 2: Requirements
│    Deposit: $80k            │
│    Stamp Duty: $20k         │
│    Total: $105k             │
├─────────────────────────────┤
│  🧮 The Calculation         │  ← Section 3: Math
│    $120k − $105k = $15k     │
├─────────────────────────────┤
│  ✅ The Result              │  ← Section 4: Outcome
│    Test PASSED              │
│    You have enough cash     │
└─────────────────────────────┘
```

## 💡 Common Scenarios

### ✅ All Tests Pass
**What it means:** This property purchase is feasible and can proceed.

**What happens:** The year shows as "PURCHASED" and the property is added to your portfolio.

### ❌ Deposit Test Fails
**Why it happens:**
- Not enough savings built up yet
- Stamp duty costs too high
- LMI required and adds significant cost

**What to do:**
- Wait longer to save more
- Consider cheaper properties
- Look for states with lower stamp duty
- Increase LVR to reduce deposit (but may trigger LMI)

### ❌ Serviceability Test Fails
**Why it happens:**
- Properties are too negatively geared
- Interest rates are too high
- Not enough rental income recognized

**What to do:**
- Choose properties with better yields
- Wait for interest rates to drop
- Build up more properties first (rental income helps)

### ❌ Borrowing Capacity Test Fails
**Why it happens:**
- Too much debt relative to income
- Not enough equity built up yet
- LVR too high across portfolio

**What to do:**
- Wait for properties to grow in value
- Pay down some debt
- Increase income
- Consider equity release from existing properties

## 🔄 Timeline Flow

### Year 1 (2025)
- Usually the first purchase
- Relies heavily on base deposit
- No existing rental income yet
- All three tests typically tight

### Year 2-3
- Cashflow improving
- Some equity building
- Rental income starting to help serviceability
- Tests become easier to pass

### Year 4-5
- Strong cashflow position
- Significant equity built up
- Rental income significantly boosts serviceability
- Can purchase larger/better properties

### Year 6+
- Self-funding strategy in full effect
- Equity release becomes major funding source
- Portfolio growth accelerates
- Tests pass with larger margins

## 📊 Key Metrics to Watch

### Portfolio Value
- Total value of all properties you own
- Grows over time based on growth assumptions
- Drives equity available for future purchases

### Total Equity
- Portfolio Value − Total Debt
- Your "net worth" in the portfolio
- Can be extracted for new deposits (up to 88%)

### LVR (Loan-to-Value Ratio)
- Total Debt ÷ Portfolio Value
- Should stay below 80% to avoid LMI
- Lower LVR = more equity available

### Net Cashflow
- Rental Income − Loan Interest − Expenses
- Positive = properties pay for themselves
- Gets reinvested for future deposits

## 🎓 Pro Tips

### 1. Watch the Surplus/Shortfall
- Large surplus = safe margin, could afford more expensive property
- Small surplus = cutting it close, any cost increase could fail test
- Shortfall = need to wait longer or change strategy

### 2. Use the Breakdown Details
- Click on a year to see all the details
- Review property breakdown to understand equity growth
- Check acquisition costs to find savings opportunities

### 3. Compare Years
- Expand multiple years to compare
- See how your position improves over time
- Identify bottlenecks (which test is closest to failing)

### 4. Understand the Math
- Each calculation is shown inline
- Learn how banks assess your application
- Use this knowledge for real-world purchases

### 5. Plan Ahead
- If a test is tight, consider waiting
- Build up savings/equity before next purchase
- Don't rush into a marginal deal

## 🚨 Warning Signs

### Red Flags
- ❌ Multiple years with "Blocked" status
- ❌ Negative cashflow that's getting worse
- ❌ LVR consistently above 80%
- ❌ Deposit test failing due to acquisition costs

### What to Do
1. Review your assumptions (growth rates, rental yields)
2. Consider different property types
3. Adjust your strategy timeline
4. Consult with your mortgage broker

## 📱 Mobile Usage

On smaller screens:
- Funnels stack vertically
- Scroll down to see all three tests
- Same information, just reorganized
- Pinch to zoom if needed

## 🎯 Getting the Most Value

### Use This Tool To:
- ✅ Understand why a purchase is feasible (or not)
- ✅ Plan your investment timeline
- ✅ Identify which test is the bottleneck
- ✅ Learn how banks assess serviceability
- ✅ Make data-driven decisions

### Don't Use This Tool To:
- ❌ Replace professional financial advice
- ❌ Make final purchase decisions without broker consultation
- ❌ Assume exact costs (they vary by lender)
- ❌ Guarantee loan approval (banks have other criteria)

## 🤝 Next Steps

After reviewing the Decision Engine:

1. **Adjust Building Blocks** if tests are failing
2. **Review Projections** to see long-term outcomes
3. **Generate PDF Report** to share with broker/advisor
4. **Refine Strategy** based on bottlenecks identified

## ❓ FAQ

### Q: Why do some years show no purchase?
**A:** The algorithm calculates when you can afford each property. If no purchase is shown, either all properties are already purchased or none are affordable yet.

### Q: Can I purchase multiple properties in one year?
**A:** Yes! If you pass all three tests with sufficient margin, you can purchase multiple properties in the same year. They'll all be shown in that year's analysis.

### Q: What if a test barely passes?
**A:** A pass is a pass, but small margins mean you're cutting it close. Consider building more buffer before proceeding.

### Q: Why does the Deposit Test include so many costs?
**A:** Banks require you to pay for stamp duty, legal fees, inspections, and other costs upfront. These all come from your cash reserves, not the loan.

### Q: How is the 70% rental recognition calculated?
**A:** Banks typically only recognize 70-80% of rental income for serviceability. This accounts for vacancy, maintenance, and conservative assessment.

### Q: What's the 88% equity factor in Borrowing Capacity?
**A:** When refinancing or using equity, banks typically lend up to 88% of the property value. The 88% factor applies to extractable equity to calculate the boost to your capacity.

### Q: Can I change the assumptions?
**A:** Yes! Go to the Assumptions section to adjust interest rates, growth rates, rental yields, and more. The Decision Engine will recalculate automatically.

## 📞 Need Help?

If you're seeing unexpected results:
1. Check your assumptions (tab at top)
2. Review selected properties (Building Blocks)
3. Ensure your investment profile is accurate
4. Consult the implementation documentation

---

**Remember:** The Decision Engine is a planning tool. Always consult with licensed professionals before making actual investment decisions.

