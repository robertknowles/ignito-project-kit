# Per-Property Tracking - Visual Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Select Property: [Property A - 2025 H1 ▼]                      │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────┬────────────────────┬────────────────────┐
│ Current Property   │ Current Equity     │ Total Cash         │
│ Value              │                    │ Invested           │
│ $850,000          │ $320,000          │ $180,000          │
└────────────────────┴────────────────────┴────────────────────┘

┌────────────────────┬────────────────────┬────────────────────┐
│ Annualized Return  │ Cash-on-Cash      │ Years Held         │
│ % (ROIC)           │ Return %          │                    │
│ 15.2%             │ 8.5%              │ 10                 │
└────────────────────┴────────────────────┴────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Equity Growth Over Time                                         │
│                                                                  │
│  $1M ┤                                    ╭──── Property Value  │
│      │                          ╭────────╯                      │
│      │                    ╭────╯                                │
│  800K┤              ╭────╯                                      │
│      │         ╭───╯                                            │
│      │    ╭───╯                  ╭──── Equity                  │
│  600K┤ ──╯              ╭───────╯                              │
│      │            ╭────╯                                        │
│      │      ╭────╯                                              │
│  400K┤ ────╯                                                    │
│      │                                                          │
│      │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  Loan Balance       │
│  200K┤                                                          │
│      │                                                          │
│    0 └────┬────┬────┬────┬────┬────┬────┬────┬────┬────       │
│          2025 2026 2027 2028 2029 2030 2031 2032 2033 2034     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Cashflow Over Time                                              │
│                                                                  │
│  $60K┤                                                           │
│      │  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███       │
│      │  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███  Rental│
│  40K┤  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███  Income│
│      │  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███       │
│      │  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███       │
│  20K┤  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███       │
│      │  ███  ███  ███  ███  ███  ███  ███  ███  ███  ███       │
│    0 ┼──███──███──███──███──███──███──███──███──███──███──     │
│      │  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  Expenses│
│ -20K┤  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓       │
│      │  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  Net  │
│      │  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  ░░░  Cashflow│
│      └────┬────┬────┬────┬────┬────┬────┬────┬────┬────       │
│          2025 2026 2027 2028 2029 2030 2031 2032 2033 2034     │
└─────────────────────────────────────────────────────────────────┘
```

## Metric Explanations

### Current Property Value
The estimated market value of the property at Year 10, calculated using tiered growth rates:
- Year 1: Higher growth (e.g., 12%)
- Years 2-3: Strong growth (e.g., 10%)
- Year 4: Moderate growth (e.g., 8%)
- Year 5+: Steady growth (e.g., 6%)

### Current Equity
The owner's equity in the property at Year 10:
```
Current Equity = Property Value - Loan Balance
```

For Interest-Only (IO) loans, the loan balance remains constant.
For Principal & Interest (P&I) loans, the loan balance decreases over time.

### Total Cash Invested
The total upfront cash required to purchase the property:
```
Total Cash Invested = Deposit + Acquisition Costs

Acquisition Costs include:
- Stamp Duty
- Lender's Mortgage Insurance (LMI)
- Legal Fees
- Inspection Fees
- Other Settlement Costs
```

### Annualized Return % (ROIC)
Return on Invested Capital - measures the total return per year:
```
ROIC = (Total Return / Total Invested / Years Held) × 100

Total Return = Current Equity - Total Invested + Total Cashflow
```

This metric shows the average annual percentage return on your initial investment, accounting for both equity growth and cashflow.

### Cash-on-Cash Return %
First-year return based on actual cashflow:
```
Cash-on-Cash Return = (Year 1 Net Cashflow / Total Invested) × 100
```

This metric shows how much cashflow you receive in the first year relative to your initial investment.

### Years Held
The projection period (currently fixed at 10 years).

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  usePerPropertyTracking Hook                                 │
│                                                              │
│  Inputs:                                                     │
│  • propertyInstanceId                                        │
│                                                              │
│  Sources:                                                    │
│  • useAffordabilityCalculator (timeline properties)          │
│  • PropertyInstanceContext (user customizations)             │
│  • DataAssumptionsContext (growth rates, property data)      │
│                                                              │
│  Calculations:                                               │
│  1. Get property from timeline                               │
│  2. Apply user customizations                                │
│  3. Calculate 10-year projections:                           │
│     For each year (1-10):                                    │
│       • Apply tiered growth rate                             │
│       • Reduce loan balance (if P&I)                         │
│       • Calculate equity                                     │
│       • Calculate detailed cashflow                          │
│  4. Calculate key metrics:                                   │
│     • Current values (Year 10)                               │
│     • Cash-on-Cash return (Year 1)                           │
│     • ROIC (10-year average)                                 │
│                                                              │
│  Outputs:                                                    │
│  • trackingData (all metrics and chart data)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PerPropertyTracking Component                               │
│                                                              │
│  • Displays property selector dropdown                       │
│  • Shows 6 key metric cards                                  │
│  • Renders Equity Growth chart                               │
│  • Renders Cashflow chart                                    │
└─────────────────────────────────────────────────────────────┘
```

## Chart Details

### Equity Growth Chart (Line Chart)
**Purpose:** Visualize wealth accumulation over time

**Lines:**
1. **Property Value (Blue):** Shows property appreciation
2. **Equity (Green):** Shows owner's equity buildup
3. **Loan Balance (Red, Dashed):** Shows remaining debt

**Key Observations:**
- Gap between Property Value and Loan Balance = Equity
- For IO loans, Loan Balance is flat
- For P&I loans, Loan Balance decreases
- Equity grows faster with P&I loans

### Cashflow Chart (Bar Chart)
**Purpose:** Show income and expenses breakdown

**Bars:**
1. **Rental Income (Green):** Gross income after vacancy
2. **Expenses (Red):** All costs (interest, management, rates, insurance, maintenance)
3. **Net Cashflow (Blue):** Rental Income - Expenses

**Key Observations:**
- Rental income grows over time (with property value)
- Expenses also grow (inflation, increased management fees on higher rent)
- Net cashflow typically improves over time
- Negative cashflow means you're paying to hold the property

## Property Selection

The dropdown shows all feasible properties from your timeline:
```
Format: [Property Name] - [Purchase Period]
Example: "House Brisbane - 2025 H1"
```

When you select a different property, all metrics and charts update instantly to show that property's performance.

## Use Cases

### 1. Performance Comparison
Select different properties to compare their projected returns and identify your best performers.

### 2. Hold vs Sell Decision
Use the 10-year projection to decide if it's worth holding a property long-term.

### 3. Portfolio Strategy
Identify properties with:
- High cashflow (for income strategy)
- High equity growth (for wealth accumulation)
- Balanced returns (for stability)

### 4. Due Diligence
Validate purchase decisions by reviewing projected returns before buying.

### 5. Client Presentations
Show clients detailed projections for properties they're considering.

## Technical Notes

- All calculations use the same methods as the main affordability calculator
- Tiered growth rates are applied per-period (6-month intervals) then displayed annually
- Cashflow calculations include all real costs (not simplified estimates)
- Land tax is calculated based on state and property value
- User customizations (if any) are respected in all calculations
- Charts auto-scale based on the data range

## Limitations

1. **Fixed 10-year horizon:** Currently projections are always 10 years
2. **No market shocks:** Assumes steady growth based on assumptions
3. **No refinancing events:** Doesn't model refinancing scenarios
4. **No tax benefits:** After-tax returns not calculated
5. **No depreciation:** Depreciation benefits not included
6. **No capital gains tax:** Sale scenarios not modeled

Future enhancements can address these limitations as needed.




