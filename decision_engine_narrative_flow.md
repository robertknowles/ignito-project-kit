# Decision Engine: Narrative Flow Design

This document outlines the restructured decision engine with a clear cause-and-effect narrative within each of the three funnels.

## Design Principle

Each funnel should read like a story: **"Here's what we have → Here's what happens → Here's the result → PASS/FAIL"**

The data should flow logically from inputs through calculations to outcomes, making it immediately clear why a decision was made.

---

## Funnel 1: Deposit / Funds Test

**Narrative:** "Can we afford the upfront cash required?"

### Flow Structure:

```
┌─────────────────────────────────────────────────────────┐
│  💰 DEPOSIT TEST: Can we afford this purchase?          │
│  Result: ✅ PASS - Surplus $188k  OR  ❌ FAIL - Short $X │
└─────────────────────────────────────────────────────────┘

📊 WHAT WE HAVE (Available Funds)
├─ Base Deposit Pool          $53k
├─ Cumulative Savings         $12k   (X years × $Y/year)
├─ Cashflow Reinvestment      $24k   (Net cashflow from existing properties)
└─ Equity Release             $0     (Extractable from portfolio @ 88% LVR)
   ─────────────────────────
   TOTAL AVAILABLE           $74k

💸 WHAT WE NEED (Total Cash Required)
├─ Property Deposit           $53k   (20% of $350k)
├─ Stamp Duty                 $14k
├─ LMI                        $3k
├─ Legal & Inspections        $3k
└─ Other Fees                 $2k
   ─────────────────────────
   TOTAL REQUIRED            $21k

📈 WHAT HAPPENS NEXT (Annual Funding Capacity)
├─ Annual Savings Rate        $24k/year
├─ Portfolio Net Cashflow     +$24k/year
   ─────────────────────────
   ANNUAL CAPACITY           $24k/year
   → Can fund next $X deposit in Y.Z years

✅ RESULT
Available ($74k) - Required ($21k) = Surplus $188k
→ Deposit test: PASS
```

**Key Insight:** The flow shows exactly where the money comes from, what it's needed for, and how quickly you can fund the next purchase.

---

## Funnel 2: Serviceability Test

**Narrative:** "Can we service the debt payments?"

### Flow Structure:

```
┌─────────────────────────────────────────────────────────┐
│  📊 SERVICEABILITY TEST: Can we afford loan payments?    │
│  Result: ✅ PASS - Surplus $103k  OR  ❌ FAIL - Short $X │
└─────────────────────────────────────────────────────────┘

💵 WHAT WE EARN (Total Portfolio Income)
├─ Gross Rental Income        $24k/year
├─ Less: Vacancy (2%)         -$480/year
├─ Less: Expenses (30%)       -$7k/year
   ─────────────────────────
   NET RENTAL INCOME         $17k/year
   
   Recognition Rate: 70% (for serviceability)
   SERVICEABLE INCOME        $17k × 70% = $12k

💳 WHAT WE PAY (Total Loan Payments)
├─ Existing Debt Interest     $0/year    ($0 @ 6.5%)
├─ New Loan Interest          $18k/year  ($298k @ 6.5%)
   ─────────────────────────
   TOTAL LOAN PAYMENTS       $18k/year

🏦 WHAT THE BANK ALLOWS (Max Allowable Debt Service)
├─ Base Capacity              $105k   (10% of $1.1M borrowing capacity)
├─ Plus: Rental Contribution  +$12k   (70% of net rental)
   ─────────────────────────
   MAX ALLOWABLE             $122k/year

✅ RESULT
Max Allowable ($122k) - Total Payments ($18k) = Surplus $103k
→ Serviceability test: PASS
```

**Key Insight:** Shows the exact rental income contribution, how the bank calculates your capacity, and whether you're within limits.

---

## Funnel 3: Borrowing Capacity Test

**Narrative:** "Will the bank lend us the money?"

### Flow Structure:

```
┌─────────────────────────────────────────────────────────┐
│  🏦 BORROWING CAPACITY TEST: Can we get the loan?        │
│  Result: ✅ PASS - Capacity $753k  OR  ❌ FAIL - Over $X │
└─────────────────────────────────────────────────────────┘

🏠 WHAT WE OWN (Portfolio Equity Growth)
Portfolio Properties:
├─ Prop #1 (2025 H1)
│  ├─ Purchase Price          $350k
│  ├─ Current Value           $350k  (0 years growth)
│  ├─ Loan Amount             $298k
│  ├─ Equity                  $53k
│  └─ Extractable (88% LVR)   $0     ($350k × 88% - $298k)
   ─────────────────────────
   TOTAL PORTFOLIO VALUE     $350k
   TOTAL EQUITY              $53k
   EXTRACTABLE EQUITY        $0

📊 WHAT THIS MEANS (LVR Status)
├─ Current LVR                85.0%  ($298k debt / $350k value)
├─ Target LVR                 80.0%  (Conservative lending)
├─ Trigger LVR                88.0%  (Maximum for equity release)
   ─────────────────────────
   LVR STATUS: Within limits, no equity available yet

💰 HOW MUCH WE CAN BORROW (Effective Borrowing Capacity)
├─ Base Borrowing Capacity    $1.1M   (From income assessment)
├─ Plus: Equity Boost         +$0     ($0 extractable × 70% factor)
   ─────────────────────────
   EFFECTIVE CAPACITY        $1.1M

📈 WHAT HAPPENS WITH THIS PURCHASE (Debt Position)
├─ Existing Debt              $0
├─ New Loan Required          $298k
   ─────────────────────────
   TOTAL DEBT AFTER          $298k

✅ RESULT
Effective Capacity ($1.1M) - Total Debt ($298k) = Remaining $753k
→ Borrowing capacity test: PASS
```

**Key Insight:** Shows how equity grows over time, when it becomes extractable, and how this boosts your borrowing power.

---

## Implementation Notes

### Visual Hierarchy

1. **Top:** Large PASS/FAIL badge with surplus/shortfall
2. **Sections:** Clear headers with icons (💰 📊 🏦)
3. **Flow:** Use arrows (→) and indentation to show cause-effect
4. **Calculations:** Show the math inline (e.g., "$350k × 88% - $298k = $0")
5. **Bottom:** Final result with clear logic

### Color Coding

- **Green:** Positive numbers, PASS results, surplus
- **Red:** Negative numbers, FAIL results, shortfall
- **Blue:** Neutral information, calculations in progress
- **Gray:** Supporting details, assumptions

### Progressive Disclosure

- Show summary by default
- "Show detailed breakdown ↓" button to expand each section
- Keep the narrative flow even in collapsed state

This structure makes it immediately clear **why** a purchase is or isn't happening at any given time.
