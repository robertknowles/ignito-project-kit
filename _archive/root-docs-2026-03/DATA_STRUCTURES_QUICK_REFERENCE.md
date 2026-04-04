# PropPath Data Structures - Quick Reference

Condensed mapping for implementing new visualizations. Use this for quick lookups.

---

## Hook Return Values

### useChartDataGenerator()

```typescript
{
  portfolioGrowthData: PortfolioGrowthDataPoint[],  // Year-level portfolio metrics
  cashflowData: CashflowDataPoint[],                 // Year-level income/expense breakdown
  monthlyHoldingCost: { total: number; byProperty: {...}[] },
  netWorthData: Array<{ year, totalAssets, totalDebt, netWorth }>
}
```

#### PortfolioGrowthDataPoint (Annual)
| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `year` | `string` | Loop variable | "2025", "2026", etc. |
| `portfolioValue` | `number` | combineMetrics | Total property value |
| `equity` | `number` | combineMetrics | portfolioValue - totalDebt |
| `doNothingBalance` | `number` | Compound savings | No property investment baseline |
| `totalDebt` | `number` | combineMetrics | Sum of all loans |
| `availableFunds` | `number` | Calculated | Deposit + savings + usable equity |
| `borrowingCapacity` | `number` | Calculated | Remaining capacity |
| `monthlyHoldingCost` | `number` | From cashflow | Annual cashflow / 12 |
| `properties` | `string[]` | Purchase schedule | Property titles bought this year |

#### CashflowDataPoint (Annual)
| Field | Type | Calculation |
|-------|------|-------------|
| `year` | `string` | "2025", "2026", etc. |
| `cashflow` | `number` | rentalIncome - expenses - loanRepayments |
| `rentalIncome` | `number` | Property rent (adjusted for growth) |
| `expenses` | `number` | Operating costs excl. loan interest |
| `loanRepayments` | `number` | Loan interest (or P&I if transitioned) |

### useFinancialFreedomProjection()

```typescript
{
  freedomYear: number | null,           // Year when net cashflow >= target
  freedomYearIndex: number | null,      // Years from BASE_YEAR (2025)
  yearlyData: FreedomYearData[],         // 30-year projection (annual)
  milestones: Milestone[],              // Key events
  piTransitionYear: number | null,      // IO→P&I switch year
  debtFreeYear: number | null,          // Debt reaches $0
  cashflowPositiveYear: number | null   // First positive cashflow year
}
```

#### FreedomYearData (Annual, 30-year projection)
| Field | Type | Notes |
|-------|------|-------|
| `year` | `number` | Calendar year (e.g., 2055) |
| `netCashflow` | `number` | rentalIncome - expenses - loanPayments |
| `totalDebt` | `number` | Remaining debt (reduced by P&I payments) |
| `rentalIncome` | `number` | Grows at 6% annually |
| `totalExpenses` | `number` | Grows at 3.5% annually |
| `loanPayments` | `number` | IO: debt * rate; P&I: amortized |
| `portfolioValue` | `number` | Grows at 6% annually |
| `isPiPhase` | `boolean` | true if year >= piTransitionYear |

---

## PropertyInstanceDetails (39 Fields)

**Used by:** `calculateDetailedCashflow(property, loanAmount)`

### Quick Lookup by Category

#### Income (1 field)
- `rentPerWeek: number` → Annual = × 52

#### Loan Details (4 critical fields)
- `loanProduct: 'IO' | 'PI'` → Determines principal payment
- `interestRate: number` → Annual % (e.g., 6.5)
- `loanOffsetAccount: number` → Reduces effective interest
- `loanTerm: number` → Years (typically 30)

#### Expenses (8 fields)
- `vacancyRate: number` → % of rent (e.g., 2)
- `propertyManagementPercent: number` → % of rent (e.g., 6.6)
- `buildingInsuranceAnnual: number` → Fixed annual cost
- `councilRatesWater: number` → Fixed annual cost
- `strata: number` → Annual body corporate ($0 for houses)
- `maintenanceAllowanceAnnual: number` → Annual amount
- `landTaxOverride: number | null` → Calculated if null
- `potentialDeductionsRebates: number` → Dollar deductions

#### State & Growth
- `state: string` → 'NSW', 'VIC', 'QLD', etc.
- `growthAssumption: 'High' | 'Medium' | 'Low'` → Tiered growth rates

---

## CashflowBreakdown Output

**From:** `calculateDetailedCashflow(property: PropertyInstanceDetails, loanAmount: number)`

```typescript
{
  // Income
  weeklyRent,              // rentPerWeek
  grossAnnualIncome,       // weeklyRent × 52
  vacancyAmount,           // grossAnnualIncome × (vacancyRate / 100)
  adjustedIncome,          // grossAnnualIncome - vacancyAmount

  // Expenses (Operating)
  loanInterest,            // (loanAmount - offset) × (rate / 100)
  propertyManagementFee,   // adjustedIncome × (mgmtPercent / 100)
  buildingInsurance,       // buildingInsuranceAnnual
  councilRatesWater,       // councilRatesWater
  strata,                  // strata
  maintenance,             // maintenanceAllowanceAnnual
  totalOperatingExpenses,  // Sum above

  // Non-Deductible
  landTax,                 // landTaxOverride ?? 0
  principalPayments,       // Calculated for P&I loans
  totalNonDeductibleExpenses,

  // Deductions & Net
  potentialDeductions,     // potentialDeductionsRebates
  netAnnualCashflow,       // adjustedIncome - total expenses + deductions
  netMonthlyCashflow,      // netAnnualCashflow / 12
  netWeeklyCashflow        // netAnnualCashflow / 52
}
```

---

## Event System (Custom Events)

### EventBlock Structure
```typescript
{
  id: string;
  eventType: EventType;  // 'salary_change' | 'refinance' | 'renovate' | etc.
  period: number;        // 1-8 (6-month periods)
  payload: EventPayload; // Event-specific data
}
```

### Refinance Event Processing

```typescript
// Get property-specific interest rate after any refinance
getPropertyEffectiveRate(period, eventBlocks, propertyInstanceId, baseRate)
  ↓
// Returns the new rate as decimal (e.g., 0.065 for 6.5%)
// Priority: Refinance rate > Market rate
```

### Renovation Impact

```typescript
getRenovationValueIncrease(propertyInstanceId, upToPeriod, eventBlocks)
  ↓
// Returns: Cumulative $ value increase for property
// Applied to both portfolioValue and equity in charts
```

---

## Growth Calculation Flow

### Portfolio Growth (New Purchases)
```
calculatePropertyGrowth(initialValue, periods, growthCurve)
  Period 1-2 (Y1):  Apply year1 rate
  Period 3-6 (Y2-3): Apply years2to3 rate
  Period 7-8 (Y4):  Apply year4 rate
  Period 9+ (Y5+):  Apply year5plus rate
```

### Existing Portfolio Growth
```
portfolioValue × (1 + growthRate) ^ yearsGrown
  growthRate: From profile.existingPortfolioGrowthRate (default 3%)
```

### Growth Curve Tiers (Example: High)
```typescript
{
  year1: 12.5,      // 1st year
  years2to3: 10,    // 2nd-3rd year
  year4: 7.5,       // 4th year
  year5plus: 6      // 5th+ year
}
```

---

## Do-Nothing Baseline

**Calculation (No property investment):**
```
For each year:
  balance = balance × (1 + SAVINGS_INTEREST_RATE) + annualSavings

SAVINGS_INTEREST_RATE = 0.02 (2%)
annualSavings = From profile
```

**Used in:**
- `PortfolioGrowthDataPoint.doNothingBalance`
- Shows savings trajectory vs. property investment scenario

---

## Financial Metrics (Property + Portfolio)

### PropertyMetrics (Single Snapshot)
```typescript
{
  portfolioValue: number,        // Total value
  totalEquity: number,           // Value - Debt
  totalDebt: number,             // Sum of loans
  annualCashflow: number,        // Net income
  annualLoanRepayments: number   // Interest/P&I payments
}
```

### Calculation Functions

**Combined Property:**
```
calculatePortfolioMetrics(
  purchases: PropertyPurchase[],
  currentYear: number,
  baseGrowthRate: number,
  growthCurve: GrowthCurve,
  interestRate: number
) → PropertyMetrics
```

**Existing Portfolio:**
```
calculateExistingPortfolioMetrics(
  portfolioValue: number,
  currentDebt: number,
  yearsGrown: number,
  growthRate: number,           // Flat rate (e.g., 3%)
  growthCurve: GrowthCurve
) → PropertyMetrics
```

**Combine Multiple:**
```
combineMetrics(...metrics: PropertyMetrics[]) → PropertyMetrics
  // Sums all fields
```

---

## TimelineProperty (Property Instance in Timeline)

**39+ fields per property.** Key ones for visualizations:

```typescript
{
  // Identity
  instanceId: string;           // Unique instance ID
  title: string;
  period: number;               // When affordable (1-8)
  affordableYear: number;       // 2025, 2025.5, 2026, etc.

  // Financial
  cost: number;
  depositRequired: number;
  loanAmount: number;

  // Cashflow (Period-specific)
  grossRentalIncome: number;
  loanInterest: number;
  expenses: number;
  netCashflow: number;

  // Portfolio State After Purchase
  portfolioValueAfter: number;
  totalEquityAfter: number;
  totalDebtAfter: number;

  // Funding Breakdown
  fundingBreakdown: {
    cash: number;
    savings: number;
    equity: number;
    total: number;
  };

  // Running Balances
  balancesAfterPurchase: {
    cash: number;
    savings: number;
    equityUsed: number;
  };

  // Test Results
  depositTestPass: boolean;
  depositTestSurplus: number;
  serviceabilityTestPass: boolean;
  borrowingCapacityUsed: number;

  // Growth Assumption
  state: string;
  loanType?: 'IO' | 'PI';
}
```

---

## Constants Reference

```typescript
PERIODS_PER_YEAR = 2           // 6-month periods
DEFAULT_INTEREST_RATE = 0.065  // 6.5%
DEFAULT_GROWTH_RATE = 0.06     // 6% (Freedom projection)
DEFAULT_RENTAL_YIELD = 0.04    // 4%
ANNUAL_INFLATION_RATE = 0.035  // 3.5%
SAVINGS_INTEREST_RATE = 0.02   // 2% (Do-nothing baseline)
EQUITY_EXTRACTION_LVR_CAP = 0.8  // 80% LVR max
BASE_YEAR = 2025
```

---

## Data Availability Checklist

Before implementing a new visualization, check:

- [ ] Data sourced from `useChartDataGenerator()`?
  - Yes → Use `portfolioGrowthData`, `cashflowData`, `netWorthData`
  - No → Check if available from `useFinancialFreedomProjection()`

- [ ] Per-property details needed?
  - Yes → Use `getInstance(propertyInstanceId)` from PropertyInstanceContext
  - Also available: `timelineProperties` from useAffordabilityCalculator()

- [ ] Event impacts (refinance, renovation, market correction)?
  - Yes → Use `eventProcessing.ts` utilities
  - `getPropertyEffectiveRate()`, `getRenovationValueIncrease()`, `getGrowthRateAdjustment()`

- [ ] Growth assumptions vary by property?
  - Yes → Property instance has `growthAssumption` field
  - Maps to tiered `GrowthCurve` via `getGrowthCurveFromAssumption()`

- [ ] Loan type (IO vs P&I) affects calculation?
  - Yes → Check `propertyInstance.loanProduct` or `timelineProperty.loanType`

If data isn't available, new hook required.

---

## File Locations Reference

| Concept | File |
|---------|------|
| Main data generation | `src/hooks/useChartDataGenerator.ts` |
| Freedom projection | `src/hooks/useFinancialFreedomProjection.ts` |
| Property instance details | `src/types/propertyInstance.ts` |
| Cashflow calculation | `src/utils/detailedCashflowCalculator.ts` |
| Metrics & growth | `src/utils/metricsCalculator.ts` |
| Event processing | `src/utils/eventProcessing.ts` |
| Event types | `src/contexts/PropertySelectionContext.tsx` |
| Constants | `src/constants/financialParams.ts` |
| Type definitions | `src/types/property.ts` |
| Timeline calculation | `src/hooks/useAffordabilityCalculator.ts` |
| Property instances | `src/contexts/PropertyInstanceContext.tsx` |
