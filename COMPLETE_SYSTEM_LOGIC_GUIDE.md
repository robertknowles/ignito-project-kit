# Complete System Logic Guide
## How the Ignito Project Affordability Calculator Works

**Version:** 2.0 (Future State with Reorganized Inputs)  
**Audience:** Technical stakeholders, cofounders, developers  
**Last Updated:** 2025-11-09

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Input Organization (3-Tab System)](#input-organization-3-tab-system)
3. [The Three-Gate Decision Engine](#the-three-gate-decision-engine)
4. [Hardcoded Values & Thresholds](#hardcoded-values--thresholds)
5. [Purchase Timing Logic](#purchase-timing-logic)
6. [Detailed Calculation Flows](#detailed-calculation-flows)
7. [Growth & Inflation Adjustments](#growth--inflation-adjustments)
8. [Complete Example Walkthrough](#complete-example-walkthrough)

---

## Executive Summary

The Ignito Project uses a **three-gate affordability system** to determine when a client can purchase each property in their investment portfolio. Every 6 months (semi-annual periods), the system evaluates whether the client passes all three gates:

1. **Deposit Test** - Do they have enough cash?
2. **Serviceability Test** - Can they afford the loan payments?
3. **Borrowing Capacity Test** - Will the bank lend them the money?

All three gates must pass for a purchase to occur. The system uses **39 detailed client inputs** organized into three logical tabs, plus **hardcoded conservative lending assumptions** to simulate real-world bank lending behavior.

---

## Input Organization (3-Tab System)

### Tab 1: Property & Loan
**Purpose:** Defines the property structure and loan terms  
**Affects:** Property Value, Equity, Serviceability, Borrowing Capacity

| Input Field | Type | Example | What It Affects |
|------------|------|---------|-----------------|
| **State** | Dropdown | VIC | Stamp duty calculation |
| **Purchase Price ($)** | Number | 350,000 | Loan amount, deposit required |
| **Valuation at Purchase ($)** | Number | 378,000 | Initial equity, LVR calculation |
| **Growth Assumption** | Dropdown | High | Property value trajectory over time |
| **LVR (%)** | Number | 85 | Loan amount, deposit required |
| **LMI Waiver** | Yes/No | No | Whether LMI is charged |
| **Loan Product** | IO/PI | IO | Loan payment calculation (interest only vs principal & interest) |
| **Interest Rate (%)** | Number | 6.5 | Annual loan payment amount |
| **Loan Term (Years)** | Number | 30 | Amortization schedule (for P&I loans) |
| **Loan Offset Account ($)** | Number | 0 | Reduces effective interest paid |
| **Days to Unconditional** | Number | 21 | Settlement timeline |
| **Days for Settlement** | Number | 42 | Settlement timeline |

**How These Flow Through the System:**

```
Purchase Price × LVR → Loan Amount
Purchase Price - Loan Amount → Deposit Required
Valuation - Loan Amount → Initial Equity
Loan Amount × Interest Rate → Annual Loan Payment
Growth Assumption → Property Value Growth (Year 1: 8%, Years 2-3: 6%, Year 4: 5%, Year 5+: 4%)
```

---

### Tab 2: Purchase Costs
**Purpose:** One-time upfront costs required to acquire the property  
**Affects:** Deposit Test only (how much cash is needed)

| Input Field | Type | Example | What It Affects |
|------------|------|---------|-----------------|
| **Stamp Duty ($)** | Calculated/Override | 19,370 | Total cash required |
| **Legal Fees ($)** | Number | 1,500 | Total cash required |
| **Building & Pest Inspection ($)** | Number | 600 | Total cash required |
| **Conveyancing ($)** | Number | 1,200 | Total cash required |
| **Buyer's Agent Fee (%)** | Number | 2.0 | Total cash required (% of purchase price) |
| **Other Acquisition Costs ($)** | Number | 500 | Total cash required |
| **LMI (if applicable) ($)** | Calculated | 4,462 | Total cash required (if no LMI waiver) |

**How These Flow Through the System:**

```
Total Cash Required = Deposit + Stamp Duty + Legal + Inspection + Conveyancing + Agent Fee + Other + LMI

Deposit Test: Available Funds ≥ Total Cash Required
```

**Key Point:** These costs are **one-time only** and do not affect ongoing cashflow or serviceability.

---

### Tab 3: Cashflow
**Purpose:** Ongoing income and expenses that determine net cashflow  
**Affects:** Serviceability Test, Cashflow Reinvestment, Future Deposits

| Input Field | Type | Example | What It Affects |
|------------|------|---------|-----------------|
| **Rent Per Week ($)** | Number | 471 | Gross annual income |
| **Minimum Yield (%)** | Number | 6.5 | Validation check |
| **Vacancy Rate (%)** | Number | 2.0 | Adjusted income (rent - vacancy) |
| **Property Management (%)** | Number | 7.0 | Operating expenses |
| **Building Insurance (annual $)** | Number | 1,200 | Operating expenses |
| **Council Rates & Water (annual $)** | Number | 2,500 | Operating expenses |
| **Strata Fees (annual $)** | Number | 0 | Operating expenses |
| **Maintenance Allowance (annual $)** | Number | 1,500 | Operating expenses |
| **Land Tax ($)** | Calculated/Override | 0 | Non-deductible expenses |
| **Potential Deductions/Rebates (annual $)** | Number | 0 | Reduces net expenses |

**How These Flow Through the System:**

```
Gross Annual Income = Rent Per Week × 52
Vacancy Amount = Gross Income × (Vacancy Rate / 100)
Adjusted Income = Gross Income - Vacancy Amount

Operating Expenses = 
  + Loan Interest
  + Property Management Fee (Adjusted Income × %)
  + Building Insurance
  + Council Rates & Water
  + Strata Fees
  + Maintenance Allowance

Non-Deductible Expenses =
  + Land Tax
  + Principal Payments (if P&I loan)

Net Annual Cashflow = Adjusted Income - Operating Expenses - Non-Deductible Expenses + Deductions
```

**Key Point:** Net cashflow can be **positive** (property pays for itself) or **negative** (you need to contribute money). This affects:
1. **Serviceability Test** - Can you afford to hold all properties?
2. **Cashflow Reinvestment** - Positive cashflow adds to future deposit savings
3. **Purchase Timing** - Negative cashflow delays future purchases

---

## The Three-Gate Decision Engine

Every 6 months, the system evaluates whether the client can purchase the next property by checking three gates in sequence. **All three must pass.**

### Gate 1: Deposit Test
**Question:** Do you have enough cash for the deposit and all upfront costs?

**Formula:**
```
Available Funds ≥ Total Cash Required

Where:
  Available Funds = 
    Base Deposit (initial savings)
    + Cumulative Savings (annual savings × years)
    + Cashflow Reinvestment (net cashflow from existing properties)
    + Equity Release (from existing properties, 88% LVR cap)
    - Deposits Already Used (for previous purchases)

  Total Cash Required = 
    Deposit Required
    + Stamp Duty
    + Legal Fees
    + Inspection Fees
    + Conveyancing
    + Buyer's Agent Fee
    + Other Costs
    + LMI (if applicable)
```

**Pass/Fail:**
- ✅ **Pass:** Available Funds ≥ Total Cash Required
- ❌ **Fail:** Available Funds < Total Cash Required → Wait for next period

**Surplus/Shortfall:**
- Surplus = Available Funds - Total Cash Required (if positive)
- Shortfall = Total Cash Required - Available Funds (if negative)

---

### Gate 2: Serviceability Test
**Question:** Can you afford to service all loan payments plus ongoing expenses?

**Formula:**
```
Enhanced Capacity ≥ Total Annual Loan Payments

Where:
  Enhanced Capacity = 
    (Borrowing Capacity × 10%)  ← Base capacity (hardcoded)
    + (Total Rental Income × 70%)  ← Rental contribution (hardcoded)

  Total Annual Loan Payments = 
    Sum of all loan payments across all properties (existing + new)
```

**Key Hardcoded Values:**
- **10% of Borrowing Capacity** = Base serviceability buffer
- **70% of Rental Income** = Bank recognition rate for rental income
- **Rental Recognition Rates** (progressive, based on portfolio size):
  - Properties 1-2: **75%** of gross rent recognized
  - Properties 3-4: **70%** of gross rent recognized
  - Properties 5+: **65%** of gross rent recognized

**Pass/Fail:**
- ✅ **Pass:** Enhanced Capacity ≥ Total Loan Payments
- ❌ **Fail:** Enhanced Capacity < Total Loan Payments → Wait for next period

**Surplus/Shortfall:**
- Surplus = Enhanced Capacity - Total Loan Payments (if positive)
- Shortfall = Total Loan Payments - Enhanced Capacity (if negative)

**Why This Matters:**
This is the **most complex gate** and often the limiting factor. It simulates how banks assess whether you can afford to hold multiple investment properties. As you add more properties:
1. Rental recognition rates decrease (75% → 70% → 65%)
2. Total loan payments increase
3. It becomes harder to pass this gate

---

### Gate 3: Borrowing Capacity Test
**Question:** Will the bank lend you the money based on total debt vs portfolio value?

**Formula:**
```
Total Debt After Purchase ≤ Effective Borrowing Capacity

Where:
  Total Debt After Purchase = 
    Existing Debt (current debt from profile)
    + Sum of all previous purchase loans
    + New loan for this property

  Effective Borrowing Capacity = 
    Base Borrowing Capacity (from client profile)
    + Equity Boost (from existing properties)

  Equity Boost = 
    Total Usable Equity × Equity Factor (typically 70-75%)

  Total Usable Equity = 
    Sum of (Property Value × 88% - Loan Amount) for all properties
```

**Key Hardcoded Values:**
- **88% LVR Cap** = Maximum loan-to-value ratio for equity release
- **Equity Factor** = 70-75% (from client profile) - How much equity the bank will lend against

**Pass/Fail:**
- ✅ **Pass:** Total Debt ≤ Effective Borrowing Capacity
- ❌ **Fail:** Total Debt > Effective Borrowing Capacity → Wait for next period

**Surplus/Shortfall:**
- Surplus = Effective Borrowing Capacity - Total Debt (if positive)
- Shortfall = Total Debt - Effective Borrowing Capacity (if negative)

**Why This Matters:**
This gate ensures the total debt doesn't exceed what the bank is willing to lend based on the total portfolio value. As properties grow in value, more equity becomes available, increasing the effective borrowing capacity.

---

## Hardcoded Values & Thresholds

These values are **built into the system** and represent conservative lending assumptions based on real-world bank behavior.

### Time & Period Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| **PERIODS_PER_YEAR** | 2 | Semi-annual evaluation (every 6 months) |
| **BASE_YEAR** | 2025 | Starting year for timeline |
| **MAX_PURCHASES_PER_PERIOD** | 3 | Purchase velocity limit (max 3 properties per 6 months) |

### Rental Recognition Rates
| Portfolio Size | Recognition Rate | Purpose |
|----------------|------------------|---------|
| **Properties 1-2** | 75% | Bank recognizes 75% of gross rental income |
| **Properties 3-4** | 70% | Bank becomes more conservative |
| **Properties 5+** | 65% | Bank is most conservative with large portfolios |

**Why Progressive Rates?**
Banks become more conservative as portfolio size grows. They don't believe you'll collect 100% of rent across many properties, so they discount it.

### Serviceability Calculation
| Component | Rate | Purpose |
|-----------|------|---------|
| **Base Capacity** | 10% of Borrowing Capacity | Minimum serviceability buffer |
| **Rental Contribution** | 70% of Total Rental Income | How much rental income counts toward serviceability |

**Formula:**
```
Enhanced Capacity = (Borrowing Capacity × 0.10) + (Rental Income × 0.70)
```

### Equity Release & LVR
| Component | Rate | Purpose |
|-----------|------|---------|
| **Maximum LVR** | 88% | Maximum loan-to-value ratio for equity release |
| **Equity Factor** | 70-75% | How much of usable equity the bank will lend against |

**Formula:**
```
Usable Equity = (Property Value × 0.88) - Loan Amount
Equity Boost = Usable Equity × Equity Factor
```

### Growth Rates (Tiered by Year)
| Period | High Growth | Medium Growth | Low Growth |
|--------|-------------|---------------|------------|
| **Year 1** | 8% | 6% | 4% |
| **Years 2-3** | 6% | 4% | 2% |
| **Year 4** | 5% | 3% | 1% |
| **Year 5+** | 4% | 2% | 0% |

**Why Tiered?**
Properties typically grow faster in the first few years, then slow down. This creates a more realistic growth trajectory.

### Inflation & Expense Growth
| Component | Rate | Purpose |
|-----------|------|---------|
| **Expense Inflation** | 3% annual | Operating expenses increase over time |
| **Rent Growth** | Tied to property value | Rent increases proportionally with property value |

**Formula:**
```
Inflation Factor = (1.03) ^ (Years Owned)
Rent Growth Factor = Current Value / Purchase Price
```

### Property Scoring (for Ranking)
| Component | Weight | Purpose |
|-----------|--------|---------|
| **Cashflow Score** | 60% | Prioritize positive cashflow properties |
| **Equity Score** | 40% | Consider equity growth potential |

**Formula:**
```
Total Score = (0.60 × Net Cashflow) + (0.40 × Current Equity)
```

Properties with higher scores are purchased first when multiple properties are affordable in the same period.

---

## Purchase Timing Logic

### Semi-Annual Evaluation Cycle
The system evaluates affordability every **6 months** (2 periods per year):
- Period 1 = 2025 H1 (first half)
- Period 2 = 2025 H2 (second half)
- Period 3 = 2026 H1
- Period 4 = 2026 H2
- And so on...

### Purchase Velocity Limit
**Maximum 3 properties per 6-month period**

**Why?**
Prevents unrealistic scenarios where the system would purchase 10 properties in a single period. Real-world constraints (settlement times, bank processing, due diligence) limit purchase velocity.

### Pause Periods
Users can insert **pause periods** to simulate:
- Market downturns
- Personal circumstances (job change, relocation)
- Strategic waiting periods

During a pause period, **no purchases occur** regardless of affordability.

### Property Selection Order
When multiple properties are affordable in the same period, the system selects based on:

1. **Property Score** (60% cashflow + 40% equity)
2. **User-defined priority** (if set)
3. **Property type preference** (if set)

**Example:**
If 3 properties are affordable in 2026 H1, the system will:
1. Calculate the score for each property
2. Rank them from highest to lowest score
3. Purchase the highest-scoring property first
4. Re-evaluate affordability for the remaining properties
5. Purchase the next highest-scoring property (if still affordable)
6. Repeat until no more properties are affordable or velocity limit is reached

---

## Detailed Calculation Flows

### Flow 1: Available Funds Calculation

**Purpose:** Determine how much cash is available for deposits

**Inputs:**
- Base deposit (initial savings)
- Annual savings rate
- Current period number
- Previous purchases (with cashflow data)
- Existing portfolio (if any)

**Process:**

```
1. Start with Base Deposit
   └─ From client profile: "Available Deposit"

2. Add Cumulative Savings
   └─ Annual Savings × (Current Period / 2)
   └─ Example: $50,000/year × 3 years = $150,000

3. Add Cashflow Reinvestment
   └─ For each previous purchase:
       a. Calculate periods owned
       b. Calculate current property value (with growth)
       c. Calculate adjusted rental income (with growth & recognition rate)
       d. Calculate detailed expenses (using 39 inputs)
       e. Calculate net cashflow for this period
   └─ Sum all net cashflows across all periods
   └─ Example: Property 1 generates +$5k/year, Property 2 generates -$2k/year
               → Net reinvestment = +$3k/year

4. Add Equity Release
   └─ For existing portfolio:
       a. Calculate grown portfolio value
       b. Calculate usable equity = (Value × 88%) - Current Debt
   └─ For each previous purchase:
       a. Calculate current property value (with growth)
       b. Calculate usable equity = (Value × 88%) - Loan Amount
   └─ Sum all usable equity
   └─ Example: Property worth $400k with $300k loan
               → Usable equity = ($400k × 88%) - $300k = $52k

5. Subtract Deposits Already Used
   └─ Sum of all previous deposit requirements
   └─ Example: Property 1 used $50k, Property 2 used $60k
               → Total used = $110k

6. Final Available Funds
   └─ Base + Savings + Cashflow + Equity - Used
```

**Output:**
- Total available funds
- Breakdown: base deposit, savings, cashflow reinvestment, equity release, deposits used

---

### Flow 2: Serviceability Test Calculation

**Purpose:** Determine if the client can afford to service all loans

**Inputs:**
- Borrowing capacity (from client profile)
- Total rental income (from all properties)
- Total loan payments (from all properties)
- Portfolio size (number of properties)

**Process:**

```
1. Calculate Total Rental Income
   └─ For each property (existing + new):
       a. Calculate current property value (with growth)
       b. Calculate gross rental income = Value × Yield Rate
       c. Apply rental recognition rate based on portfolio size:
          - Properties 1-2: 75%
          - Properties 3-4: 70%
          - Properties 5+: 65%
       d. Recognized Income = Gross Income × Recognition Rate
   └─ Sum all recognized income
   └─ Example: 
       Property 1: $400k × 7% × 75% = $21,000
       Property 2: $350k × 6.5% × 70% = $15,925
       Property 3: $380k × 7.2% × 65% = $17,784
       → Total = $54,709

2. Calculate Enhanced Capacity
   └─ Base Capacity = Borrowing Capacity × 10%
   └─ Rental Contribution = Total Rental Income × 70%
   └─ Enhanced Capacity = Base + Rental
   └─ Example:
       Borrowing Capacity = $600,000
       Base = $600,000 × 10% = $60,000
       Rental = $54,709 × 70% = $38,296
       → Enhanced Capacity = $98,296

3. Calculate Total Annual Loan Payments
   └─ For each property (existing + new):
       a. If Interest Only (IO):
          Payment = Loan Amount × Interest Rate
       b. If Principal & Interest (PI):
          Payment = Amortization formula (monthly payment × 12)
   └─ Sum all loan payments
   └─ Example:
       Property 1: $300k IO @ 6.5% = $19,500
       Property 2: $280k IO @ 6.5% = $18,200
       Property 3: $320k IO @ 6.5% = $20,800
       → Total = $58,500

4. Calculate Surplus/Shortfall
   └─ Surplus = Enhanced Capacity - Total Loan Payments
   └─ Example: $98,296 - $58,500 = $39,796 surplus
   └─ Pass if surplus ≥ 0

5. Pass/Fail Decision
   └─ Pass: Enhanced Capacity ≥ Total Loan Payments
   └─ Fail: Enhanced Capacity < Total Loan Payments
```

**Output:**
- Pass/fail status
- Surplus or shortfall amount
- Enhanced capacity breakdown

---

### Flow 3: Borrowing Capacity Test Calculation

**Purpose:** Ensure total debt doesn't exceed what the bank will lend

**Inputs:**
- Base borrowing capacity (from client profile)
- Equity factor (from client profile, typically 70-75%)
- Total usable equity (from all properties)
- Total existing debt
- New loan amount

**Process:**

```
1. Calculate Total Usable Equity
   └─ For existing portfolio:
       a. Calculate grown portfolio value
       b. Usable Equity = (Value × 88%) - Current Debt
   └─ For each previous purchase:
       a. Calculate current property value (with growth)
       b. Usable Equity = (Value × 88%) - Loan Amount
   └─ Sum all usable equity
   └─ Example:
       Existing: ($500k × 88%) - $400k = $40k
       Property 1: ($400k × 88%) - $300k = $52k
       Property 2: ($350k × 88%) - $280k = $28k
       → Total Usable Equity = $120k

2. Calculate Equity Boost
   └─ Equity Boost = Total Usable Equity × Equity Factor
   └─ Example: $120k × 75% = $90k

3. Calculate Effective Borrowing Capacity
   └─ Effective = Base Borrowing Capacity + Equity Boost
   └─ Example: $600k + $90k = $690k

4. Calculate Total Debt After Purchase
   └─ Total Debt = Existing Debt + All Previous Loans + New Loan
   └─ Example: $400k + $300k + $280k + $320k = $1,300k

5. Calculate Surplus/Shortfall
   └─ Surplus = Effective Capacity - Total Debt
   └─ Example: $690k - $1,300k = -$610k shortfall
   └─ Pass if surplus ≥ 0

6. Pass/Fail Decision
   └─ Pass: Total Debt ≤ Effective Borrowing Capacity
   └─ Fail: Total Debt > Effective Borrowing Capacity
```

**Output:**
- Pass/fail status
- Surplus or shortfall amount
- Effective borrowing capacity
- Total debt breakdown

---

## Growth & Inflation Adjustments

### Property Value Growth

**Tiered Growth Rates:**
Properties grow at different rates depending on how long they've been owned and their growth assumption (High/Medium/Low).

**Formula:**
```
For each period owned:
  If period ≤ 2 (Year 1):
    Growth Rate = Year 1 Rate
  Else if period ≤ 6 (Years 2-3):
    Growth Rate = Years 2-3 Rate
  Else if period ≤ 8 (Year 4):
    Growth Rate = Year 4 Rate
  Else (Year 5+):
    Growth Rate = Year 5+ Rate

Current Value = Purchase Price × (1 + Rate)^Periods
```

**Example (High Growth):**
```
Purchase Price: $350,000
Periods Owned: 6 (3 years)

Period 1-2 (Year 1): $350k × (1.08)^1 = $378,000
Period 3-6 (Years 2-3): $378k × (1.06)^2 = $424,733

Current Value after 3 years: $424,733
Growth Factor: 1.214 (21.4% total growth)
```

### Rent Growth

**Rent grows proportionally with property value:**

**Formula:**
```
Growth Factor = Current Value / Purchase Price
Adjusted Rent = Base Rent × Growth Factor
```

**Example:**
```
Base Rent: $471/week = $24,492/year
Purchase Price: $350,000
Current Value: $424,733
Growth Factor: 1.214

Adjusted Rent = $24,492 × 1.214 = $29,733/year
```

**Why?**
Rent typically increases with property value. A property worth 20% more should command ~20% higher rent.

### Expense Inflation

**Operating expenses increase by 3% annually:**

**Formula:**
```
Inflation Factor = (1.03) ^ Years Owned
Inflated Expenses = Base Expenses × Inflation Factor
```

**Example:**
```
Base Operating Expenses: $8,000/year
Years Owned: 3
Inflation Factor: (1.03)^3 = 1.0927

Inflated Expenses = $8,000 × 1.0927 = $8,742/year
```

**Why?**
Insurance, council rates, strata fees, and maintenance costs all increase over time due to inflation.

### Combined Effect on Cashflow

**Cashflow changes over time due to:**
1. Rent increases (tied to property value growth)
2. Expense increases (3% annual inflation)
3. Loan payments (stay constant for IO, decrease for PI)

**Example:**
```
Year 1:
  Rent: $24,492
  Expenses: $8,000
  Loan Payment: $19,500
  Net Cashflow: -$3,008 (negative)

Year 3:
  Rent: $29,733 (21.4% growth)
  Expenses: $8,742 (9.3% inflation)
  Loan Payment: $19,500 (unchanged)
  Net Cashflow: $1,491 (positive!)
```

**Why This Matters:**
Properties that start with negative cashflow can become positive over time as rent grows faster than expenses. This affects:
- Serviceability test (easier to pass as cashflow improves)
- Cashflow reinvestment (more money for future deposits)
- Purchase timing (can buy next property sooner)

---

## Complete Example Walkthrough

Let's walk through a complete example of purchasing Property #1.

### Client Profile
- **Available Deposit:** $100,000
- **Annual Savings:** $50,000
- **Borrowing Capacity:** $600,000
- **Equity Factor:** 75%
- **Existing Portfolio:** None
- **Current Debt:** $0

### Property Details (Tab 1: Property & Loan)
- **State:** VIC
- **Purchase Price:** $350,000
- **Valuation:** $378,000
- **Growth Assumption:** High (8% / 6% / 5% / 4%)
- **LVR:** 85%
- **LMI Waiver:** No
- **Loan Product:** Interest Only (IO)
- **Interest Rate:** 6.5%
- **Loan Term:** 30 years
- **Loan Offset:** $0

### Purchase Costs (Tab 2)
- **Stamp Duty:** $19,370 (calculated for VIC)
- **Legal Fees:** $1,500
- **Building & Pest:** $600
- **Conveyancing:** $1,200
- **Buyer's Agent Fee:** $7,000 (2% of $350k)
- **Other Costs:** $500
- **LMI:** $4,462 (calculated, no waiver)

### Cashflow (Tab 3)
- **Rent Per Week:** $471 ($24,492/year)
- **Vacancy Rate:** 2%
- **Property Management:** 7%
- **Building Insurance:** $1,200/year
- **Council Rates & Water:** $2,500/year
- **Strata Fees:** $0
- **Maintenance:** $1,500/year
- **Land Tax:** $0
- **Deductions/Rebates:** $0

---

### Period 1 (2025 H1) - First Evaluation

#### Step 1: Calculate Loan Amount & Deposit
```
Loan Amount = Purchase Price × LVR
            = $350,000 × 85%
            = $297,500

Deposit Required = Purchase Price - Loan Amount
                 = $350,000 - $297,500
                 = $52,500
```

#### Step 2: Calculate Total Cash Required
```
Total Cash Required = Deposit + All Costs
                    = $52,500 + $19,370 + $1,500 + $600 + $1,200 + $7,000 + $500 + $4,462
                    = $87,132
```

#### Step 3: Gate 1 - Deposit Test
```
Available Funds = Base Deposit + Cumulative Savings + Cashflow + Equity - Used
                = $100,000 + $0 + $0 + $0 - $0
                = $100,000

Deposit Test: $100,000 ≥ $87,132
Result: ✅ PASS (Surplus: $12,868)
```

#### Step 4: Calculate Annual Loan Payment
```
Loan Type: Interest Only (IO)
Annual Payment = Loan Amount × Interest Rate
               = $297,500 × 6.5%
               = $19,338
```

#### Step 5: Calculate Net Cashflow
```
Gross Annual Income = $471/week × 52 = $24,492
Vacancy Amount = $24,492 × 2% = $490
Adjusted Income = $24,492 - $490 = $24,002

Operating Expenses:
  - Loan Interest: $19,338
  - Property Management: $24,002 × 7% = $1,680
  - Building Insurance: $1,200
  - Council Rates: $2,500
  - Strata: $0
  - Maintenance: $1,500
  Total Operating: $26,218

Non-Deductible Expenses:
  - Land Tax: $0
  - Principal Payments: $0 (IO loan)
  Total Non-Deductible: $0

Net Annual Cashflow = $24,002 - $26,218 - $0 + $0
                    = -$2,216 (negative cashflow)
```

#### Step 6: Gate 2 - Serviceability Test
```
Portfolio Size: 1 property
Rental Recognition Rate: 75% (properties 1-2)

Recognized Rental Income = $24,002 × 75% = $18,002

Enhanced Capacity = (Borrowing Capacity × 10%) + (Rental Income × 70%)
                  = ($600,000 × 10%) + ($18,002 × 70%)
                  = $60,000 + $12,601
                  = $72,601

Total Annual Loan Payments = $19,338

Serviceability Test: $72,601 ≥ $19,338
Result: ✅ PASS (Surplus: $53,263)
```

#### Step 7: Gate 3 - Borrowing Capacity Test
```
Total Usable Equity = $0 (no existing properties)
Equity Boost = $0 × 75% = $0

Effective Borrowing Capacity = $600,000 + $0 = $600,000

Total Debt After Purchase = $0 + $297,500 = $297,500

Borrowing Capacity Test: $297,500 ≤ $600,000
Result: ✅ PASS (Surplus: $302,500)
```

#### Step 8: Final Decision
```
Gate 1 (Deposit): ✅ PASS
Gate 2 (Serviceability): ✅ PASS
Gate 3 (Borrowing Capacity): ✅ PASS

Decision: ✅ PURCHASE in Period 1 (2025 H1)
```

---

### Period 4 (2026 H2) - Evaluating Property #2

Now let's see how the system evaluates a second property 1.5 years later.

#### Property #1 Status (after 3 periods)
```
Periods Owned: 3 (1.5 years)
Growth: Year 1 rate for periods 1-2, then Years 2-3 rate for period 3

Current Value = $350,000 × (1.08)^1 × (1.06)^0.5
              ≈ $389,340

Usable Equity = ($389,340 × 88%) - $297,500
              = $342,619 - $297,500
              = $45,119

Adjusted Rent = $24,492 × ($389,340 / $350,000)
              = $24,492 × 1.112
              = $27,235/year

Inflated Expenses = $6,880 × (1.03)^1.5
              = $6,880 × 1.0453
              = $7,192/year

Net Cashflow = $27,235 - $19,338 - $7,192
             = $643/year (now positive!)
```

#### Property #2 Details
- **Purchase Price:** $380,000
- **LVR:** 85%
- **Loan Amount:** $323,000
- **Deposit Required:** $57,000
- **Total Cash Required:** $95,000 (approx)
- **Annual Loan Payment:** $20,995 (IO @ 6.5%)

#### Step 1: Calculate Available Funds
```
Base Deposit: $100,000
Cumulative Savings: $50,000 × 1.5 years = $75,000
Cashflow Reinvestment: $643 × 1.5 years = $965 (from Property #1)
Equity Release: $45,119 (from Property #1)
Deposits Used: $87,132 (for Property #1)

Available Funds = $100,000 + $75,000 + $965 + $45,119 - $87,132
                = $133,952
```

#### Step 2: Gate 1 - Deposit Test
```
Total Cash Required: $95,000

Deposit Test: $133,952 ≥ $95,000
Result: ✅ PASS (Surplus: $38,952)
```

#### Step 3: Gate 2 - Serviceability Test
```
Portfolio Size: 2 properties
Rental Recognition Rate: 75% (still properties 1-2)

Property #1 Recognized Income: $27,235 × 75% = $20,426
Property #2 Recognized Income: $26,000 × 75% = $19,500
Total Recognized Income: $39,926

Enhanced Capacity = ($600,000 × 10%) + ($39,926 × 70%)
                  = $60,000 + $27,948
                  = $87,948

Total Loan Payments = $19,338 + $20,995 = $40,333

Serviceability Test: $87,948 ≥ $40,333
Result: ✅ PASS (Surplus: $47,615)
```

#### Step 4: Gate 3 - Borrowing Capacity Test
```
Total Usable Equity = $45,119 (from Property #1)
Equity Boost = $45,119 × 75% = $33,839

Effective Borrowing Capacity = $600,000 + $33,839 = $633,839

Total Debt = $297,500 + $323,000 = $620,500

Borrowing Capacity Test: $620,500 ≤ $633,839
Result: ✅ PASS (Surplus: $13,339)
```

#### Step 5: Final Decision
```
Gate 1 (Deposit): ✅ PASS
Gate 2 (Serviceability): ✅ PASS
Gate 3 (Borrowing Capacity): ✅ PASS

Decision: ✅ PURCHASE in Period 4 (2026 H2)
```

---

## Key Insights from the Example

### Insight 1: Cashflow Improves Over Time
Property #1 started with **negative cashflow** (-$2,216/year) but became **positive** (+$643/year) after 1.5 years due to:
- Rent growth (tied to property value growth)
- Expense inflation (slower than rent growth)
- Constant loan payments (IO loan)

### Insight 2: Equity Builds Quickly
Property #1 generated **$45,119 in usable equity** in just 1.5 years, which:
- Contributed to available funds for Property #2
- Increased effective borrowing capacity
- Accelerated the next purchase

### Insight 3: Serviceability is the Limiting Factor
Even though the client passed all three gates, the **serviceability test** had the smallest surplus ($47,615). As more properties are added:
- Rental recognition rates decrease (75% → 70% → 65%)
- Total loan payments increase
- Serviceability surplus shrinks
- Eventually becomes the blocking gate

### Insight 4: Detailed Inputs Matter
Using the 39 detailed inputs instead of the 30% rule:
- Property #1 actual expenses: $6,880 (28% of rent)
- Old 30% rule would have estimated: $7,348
- Difference: $468/year more cashflow
- Over 1.5 years: $702 more available for next deposit

**This small difference compounds over time and affects purchase timing.**

---

## Summary

The Ignito Project affordability calculator is a sophisticated system that:

1. **Organizes 39 detailed inputs** into three logical tabs (Property & Loan, Purchase Costs, Cashflow)
2. **Evaluates affordability every 6 months** using a three-gate system (Deposit, Serviceability, Borrowing Capacity)
3. **Uses hardcoded conservative assumptions** to simulate real-world bank lending behavior
4. **Accounts for growth and inflation** to create realistic long-term projections
5. **Prioritizes properties** based on cashflow and equity performance
6. **Limits purchase velocity** to prevent unrealistic scenarios

**All three gates must pass for a purchase to occur.**

The system provides a realistic simulation of how a client can build a property investment portfolio over time, accounting for:
- Cash constraints (Deposit Test)
- Income constraints (Serviceability Test)
- Debt constraints (Borrowing Capacity Test)
- Time constraints (Semi-annual evaluation, velocity limits)
- Market dynamics (Growth rates, inflation, rental recognition)

This creates a **data-driven, defensible investment timeline** that you can confidently present to clients.

---

**End of Document**
