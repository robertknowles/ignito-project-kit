# PropPath Data Structures - Complete Index

**Master reference for all dashboard visualization data structures and implementation.**

---

## Documentation Set

This package contains 4 focused documents:

### 1. **DATA_STRUCTURES_REFERENCE.md** (22KB) - Complete Specification

**Use when:** You need the full, detailed specification for any data structure.

**Contains:**
- Complete type definitions for all hooks and utilities
- Exact field names, types, and data types
- Calculation logic for complex fields
- Full EventBlock system documentation
- All 39 PropertyInstanceDetails fields explained
- Complete CashflowBreakdown structure
- Financial metrics calculations
- TimelineProperty (100+ fields)
- Constants reference
- Data flow diagrams

**Start here if:** You're building a new visualization and need to understand exactly what data is available.

---

### 2. **DATA_STRUCTURES_QUICK_REFERENCE.md** (11KB) - Fast Lookup

**Use when:** You need a quick answer about a specific field or structure.

**Contains:**
- Hook return values (condensed)
- PortfolioGrowthDataPoint table (one row per field)
- CashflowDataPoint table
- FreedomYearData table
- All property instance details categorized
- CashflowBreakdown output
- Event system (condensed)
- Growth calculations
- Financial metrics (simplified)
- File locations reference

**Start here if:** You know roughly what you need and want to find exact field names fast.

---

### 3. **DATA_STRUCTURES_USAGE_EXAMPLES.md** (15KB) - Real Code Examples

**Use when:** You want to see working code examples.

**Contains:**
- 10 complete usage examples with full code
- Building portfolio growth charts
- Cashflow breakdowns
- Available funds tracking
- Financial freedom projections
- Property instance details access
- Event system usage (refinance, renovation, market correction)
- Timeline property lists
- Metrics calculations
- Per-property monthly costs
- Net worth trajectories
- Do-nothing baseline comparisons
- Loan cost comparisons
- Integration best practices

**Start here if:** You learn by reading code and want to copy-paste patterns.

---

### 4. **IMPLEMENTATION_GUIDE.md** (11KB) - Step-by-Step Implementation

**Use when:** You're building a new visualization component.

**Contains:**
- Decision tree: Which hook to use
- Step-by-step implementation workflow
- 5 common patterns with examples
- Data transformation checklist
- File structure for new components
- Dashboard integration guide
- Scenario support (optional)
- Testing templates
- Performance considerations
- Common pitfalls & solutions
- Complete checklist

**Start here if:** You're ready to write code and want guidance on structure.

---

## Quick Navigation

### By Question

**Q: What hooks are available?**
→ REFERENCE.md Section 1-3, QUICK_REFERENCE.md "Hook Return Values"

**Q: What exact fields does [X] have?**
→ QUICK_REFERENCE.md (fastest), REFERENCE.md (complete)

**Q: How do I access [data type]?**
→ USAGE_EXAMPLES.md (find matching example), IMPLEMENTATION_GUIDE.md (patterns)

**Q: I'm building a new chart, where do I start?**
→ IMPLEMENTATION_GUIDE.md (decision tree + workflow)

**Q: What's the calculation for [metric]?**
→ REFERENCE.md (search metric name), QUICK_REFERENCE.md (tables)

**Q: How do events affect calculations?**
→ REFERENCE.md Section 3 (Event Block System), USAGE_EXAMPLES.md Section 4 (Event Usage)

**Q: What's the data flow?**
→ REFERENCE.md Section 10 (Data Flow Diagram), IMPLEMENTATION_GUIDE.md (Architecture)

**Q: How do I test my component?**
→ IMPLEMENTATION_GUIDE.md (Testing section), USAGE_EXAMPLES.md (patterns)

### By Role

**Frontend Developer (Building Charts)**
1. IMPLEMENTATION_GUIDE.md (entire)
2. QUICK_REFERENCE.md (for field lookups)
3. USAGE_EXAMPLES.md (for patterns)

**Data/Calculation Developer (Adding New Metrics)**
1. REFERENCE.md Section 6 (Metrics Calculator)
2. REFERENCE.md Section 5 (Detailed Cashflow Calculator)
3. USAGE_EXAMPLES.md Section 6 (Metrics Calculation)

**System Architect (Understanding Full Picture)**
1. REFERENCE.md (all sections)
2. IMPLEMENTATION_GUIDE.md (architecture)
3. REFERENCE.md Section 10 (data flow)

**Integration Tester**
1. IMPLEMENTATION_GUIDE.md (common pitfalls)
2. QUICK_REFERENCE.md (field validation)
3. USAGE_EXAMPLES.md (what data looks like)

---

## Key Data Flows

### Portfolio Growth Data

```
Input: TimelineProperty[], InvestmentProfile
Hook: useChartDataGenerator()
Output: PortfolioGrowthDataPoint[]
  ├─ year: "2025", "2026", etc.
  ├─ portfolioValue: Dollar amount (grown from purchases + existing)
  ├─ equity: portfolioValue - totalDebt
  ├─ doNothingBalance: Pure savings baseline
  ├─ totalDebt: Sum of all loan amounts
  ├─ availableFunds: Deposit pool + savings + usable equity
  └─ borrowingCapacity: Remaining capacity

Used by:
├─ PortfolioGrowthChart.tsx
├─ NetWorthChart.tsx
├─ useFinancialFreedomProjection.ts (input)
└─ Dashboard.tsx (aggregation)
```

### Cashflow Data

```
Input: PropertyInstanceDetails[], TimelineProperty[]
Hook: useChartDataGenerator()
Output: CashflowDataPoint[]
  ├─ year: "2025", "2026", etc.
  ├─ rentalIncome: Gross annual rent (adjusted for property growth)
  ├─ expenses: Operating costs excluding loan interest
  ├─ loanRepayments: Annual interest or P&I payment
  └─ cashflow: rentalIncome - expenses - loanRepayments

Used by:
├─ CashflowChart.tsx
├─ SummaryBar.tsx (monthly holding cost)
├─ useFinancialFreedomProjection.ts (input)
└─ Financial summary calculations
```

### Financial Freedom Data

```
Input: PortfolioGrowthDataPoint[], CashflowDataPoint[], InvestmentProfile
Hook: useFinancialFreedomProjection()
Output: FinancialFreedomProjection
  ├─ yearlyData[]: 30-year projection
  │   ├─ year: Calendar year
  │   ├─ netCashflow: Passive income for year
  │   ├─ totalDebt: Remaining after P&I payments
  │   └─ isPiPhase: IO vs P&I phase flag
  ├─ freedomYear: Target income achieved
  ├─ piTransitionYear: IO→P&I switch
  ├─ debtFreeYear: Debt reaches zero
  └─ milestones[]: Key events

Used by:
├─ FinancialFreedomPanel.tsx
├─ RetirementSnapshot.tsx
└─ Client reports (milestone tracking)
```

### Property Instance Details

```
Input: Property card (39 fields)
Context: PropertyInstanceContext
Source: calculateDetailedCashflow()
Output: CashflowBreakdown
  ├─ weeklyRent: From property instance
  ├─ grossAnnualIncome: weeklyRent × 52
  ├─ loanInterest: (loanAmount - offset) × rate
  ├─ propertyManagementFee: % of income
  ├─ (building, council, strata, maintenance)
  ├─ potentialDeductions: Tax benefits
  └─ netAnnualCashflow: Income - all costs + deductions

Used by:
├─ Property detail cards
├─ Timeline property rows
├─ Monthly holding cost calculation
└─ Per-property summaries
```

### Event Processing

```
Input: EventBlock[] (from PropertySelectionContext)
Functions:
├─ getPropertyEffectiveRate()
│   └─ Returns: Interest rate after refinance
├─ getRenovationValueIncrease()
│   └─ Returns: Dollar value increase from renovations
├─ getGrowthRateAdjustment()
│   └─ Returns: Growth rate adjustment from market corrections
└─ getInterestRateAdjustment()
    └─ Returns: Rate adjustment from market interest changes

Impact: Already applied to hook outputs
├─ Chart data includes refinance effects
├─ Portfolio values include renovations
├─ Growth rates account for corrections
└─ Interest rates reflect market changes
```

---

## Field Lookup Matrix

| Need This Field | Find In | Document | Section |
|-----------------|---------|----------|---------|
| `portfolioValue` | PortfolioGrowthDataPoint | QUICK_REFERENCE | Hook Return Values |
| `doNothingBalance` | PortfolioGrowthDataPoint | REFERENCE | 1.1 |
| `netCashflow` | FreedomYearData | QUICK_REFERENCE | FreedomYearData table |
| `rentPerWeek` | PropertyInstanceDetails | REFERENCE | 4.1 |
| `loanOffsetAccount` | PropertyInstanceDetails | REFERENCE | 4.1 |
| `weeklyRent` | CashflowBreakdown | REFERENCE | 5.1 |
| `fundingBreakdown` | TimelineProperty | REFERENCE | 8 |
| All 39 property fields | PropertyInstanceDetails | REFERENCE | 4.1 |

---

## Constants Used

| Constant | Value | Used For |
|----------|-------|----------|
| `PERIODS_PER_YEAR` | 2 | Period calculations (6-month periods) |
| `DEFAULT_INTEREST_RATE` | 0.065 | 6.5% default loan rate |
| `DEFAULT_GROWTH_RATE` | 0.06 | 6% growth in 30-year projection |
| `ANNUAL_INFLATION_RATE` | 0.035 | 3.5% expense inflation |
| `SAVINGS_INTEREST_RATE` | 0.02 | 2% on savings account (do-nothing baseline) |
| `EQUITY_EXTRACTION_LVR_CAP` | 0.8 | 80% LVR for available equity calc |
| `BASE_YEAR` | 2025 | Starting year |

---

## Common Transformation Patterns

### Convert Annual to Monthly
```
monthlyValue = annualValue / 12
```
Example: `monthlyHoldingCost = cashflow.cashflow / 12`

### Apply Growth Over Periods
```
finalValue = initialValue × (1 + rate)^periods
```
Example: `calculatePropertyGrowth(cost, periods, growthCurve)`

### Accumulate Yearly
```
total = 0
for year 0 to yearsElapsed:
  total = total × (1 + rate) + annualAddition
```
Example: `doNothingBalance` calculation

### Compound P&I Amortization
```
monthlyPayment = principal × [r(1+r)^n] / [(1+r)^n - 1]
annualPayment = monthlyPayment × 12
```
Example: Freedom projection P&I phase

---

## Type Safety Checklist

Before using data:

- [ ] Field is not optional (`?`), or null-check applied
- [ ] Number fields are in correct units (dollars, not thousands)
- [ ] Rate fields are decimals (0.065), not percentages (6.5)
- [ ] Year fields are strings ("2025"), not numbers
- [ ] Period numbers are 1-based (1, 2, 3...), not 0-based
- [ ] Growth curves match tier names (High, Medium, Low)

---

## When to Update This Documentation

This documentation is **source of truth** for data structures. Update when:

1. **New hook added** → Add to Section 1, QUICK_REFERENCE
2. **New field added to type** → Update REFERENCE, QUICK_REFERENCE
3. **Calculation changed** → Update REFERENCE, USAGE_EXAMPLES
4. **New visualization pattern discovered** → Add to USAGE_EXAMPLES
5. **Constants updated** → Update all four docs
6. **New event type added** → Update REFERENCE Section 3
7. **Breaking changes** → Highlight in IMPLEMENTATION_GUIDE

---

## Related Code Files

**Keep synchronized with this documentation:**

- `src/hooks/useChartDataGenerator.ts` - Primary data source
- `src/hooks/useFinancialFreedomProjection.ts` - Projection logic
- `src/types/propertyInstance.ts` - PropertyInstanceDetails (39 fields)
- `src/types/property.ts` - TimelineProperty, GrowthCurve, types
- `src/utils/detailedCashflowCalculator.ts` - CashflowBreakdown
- `src/utils/metricsCalculator.ts` - Metric calculations
- `src/utils/eventProcessing.ts` - Event effects
- `src/contexts/PropertySelectionContext.tsx` - EventBlock types
- `src/constants/financialParams.ts` - All constants
- `src/components/Dashboard.tsx` - Hook usage example

---

## Quick Start Paths

### Path 1: Build Chart Component (30 mins)
1. Read: IMPLEMENTATION_GUIDE.md "Decision Tree"
2. Read: USAGE_EXAMPLES.md (matching pattern)
3. Code: Follow "Step-by-Step Implementation" section
4. Reference: QUICK_REFERENCE.md for field names

### Path 2: Understand Data Flow (20 mins)
1. Read: QUICK_REFERENCE.md "Hook Return Values"
2. Read: IMPLEMENTATION_GUIDE.md "Overview"
3. Study: REFERENCE.md "Data Flow Diagram"
4. Trace: Field sources in type definitions

### Path 3: Add New Metric (45 mins)
1. Read: REFERENCE.md Section 6 (Metrics)
2. Read: USAGE_EXAMPLES.md Section 6 (Metrics Usage)
3. Understand: Hook dependencies
4. Code: Add function to metricsCalculator.ts
5. Test: Create example in USAGE_EXAMPLES.md

### Path 4: Fix Data Bug (15 mins)
1. Identify: Which data field is wrong
2. Reference: QUICK_REFERENCE.md or REFERENCE.md
3. Check: Calculation or source
4. Look: Corresponding hook or utility
5. Trace: Back through data flow

---

## Glossary

| Term | Definition | Document |
|------|-----------|----------|
| Portfolio Growth Data | Year-level property values and equity | REFERENCE 1.1 |
| Cashflow Data | Year-level income, expenses, loan payments | REFERENCE 1.2 |
| Do-Nothing Baseline | Compound savings with no property investment | REFERENCE 3.5 |
| Available Funds | Deposit + savings + usable equity | REFERENCE 1.1 |
| Borrowing Capacity | Remaining loan borrowing limit | REFERENCE 1.1 |
| PropertyInstanceDetails | 39-field property instance data | REFERENCE 4.1 |
| EventBlock | Custom event (refinance, renovation, etc.) | REFERENCE 3.1 |
| GrowthCurve | Tiered growth rates (Y1, Y2-3, Y4, Y5+) | REFERENCE 7 |
| P&I Phase | Principal & Interest (debt reduction phase) | REFERENCE 2.1 |
| IO Phase | Interest-only (debt maintains balance) | REFERENCE 2.1 |
| Periods | 6-month time units (1, 2, 3...) | QUICK_REFERENCE |
| TimelineProperty | Property in acquisition timeline (100+ fields) | REFERENCE 8 |
| FreedomYear | Year when passive income meets target | REFERENCE 2.1 |
| Refinance Event | Change to property interest rate | REFERENCE 3.4 |
| Renovation Event | Value increase from improvements | REFERENCE 3.6 |
| Market Correction | Temporary growth rate adjustment | USAGE_EXAMPLES 4.3 |

---

**Last Updated:** 2026-03-14

**Version:** 1.0

**Scope:** Complete PropPath data structures for dashboard visualization implementation

**Contact:** This documentation represents the single source of truth for PropPath data structures.
