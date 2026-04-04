# PropPath Data Structures Reference

Complete mapping of all data structures available for building dashboard visualizations. This document contains EXACT field names, types, and their sources.

---

## 1. useChartDataGenerator Hook

**Location:** `src/hooks/useChartDataGenerator.ts`

**Return Type:**
```typescript
{
  portfolioGrowthData: PortfolioGrowthDataPoint[];
  cashflowData: CashflowDataPoint[];
  monthlyHoldingCost: { total: number; byProperty: Array<{ propertyTitle: string; monthlyCost: number; instanceId: string }> };
  netWorthData: Array<{ year: string; totalAssets: number; totalDebt: number; netWorth: number }>;
}
```

### 1.1 PortfolioGrowthDataPoint[]

**Year-level aggregation (2025, 2026, 2027...) from property purchases**

```typescript
interface PortfolioGrowthDataPoint {
  year: string;              // Year label: "2025", "2026", etc.
  portfolioValue: number;    // Total property portfolio value (rounded)
  equity: number;            // Total equity (portfolioValue - totalDebt, rounded)
  properties?: string[];     // Array of property titles purchased that year

  // Dashboard redesign fields (optional for backward compatibility)
  doNothingBalance?: number;    // Compound savings trajectory with no property investment
  totalDebt?: number;           // Sum of all loan balances
  availableFunds?: number;      // Deposit pool + cumulative savings + usable equity (rounded)
  monthlyHoldingCost?: number;  // Net monthly cost to hold portfolio (rounded, from cashflow/12)
  borrowingCapacity?: number;   // Remaining borrowing capacity (rounded)
}
```

**Data Population Logic:**
- `year` → String from loop (2025 to endYear)
- `portfolioValue` → `combineMetrics(existingMetrics, newPurchasesMetrics).portfolioValue + renovationValueIncrease`
- `equity` → `combineMetrics(...).totalEquity + renovationValueIncrease`
- `doNothingBalance` → Compound: `balance * (1 + SAVINGS_INTEREST_RATE) + profile.annualSavings` per year
- `totalDebt` → `combineMetrics(...).totalDebt` (rounded)
- `availableFunds` → `profile.depositPool + cumulativeSavings + usableEquity - depositsUsed` (capped at 0)
- `monthlyHoldingCost` → Calculated in enrichedPortfolioData from cashflow

### 1.2 CashflowDataPoint[]

**Year-level cashflow breakdown**

```typescript
interface CashflowDataPoint {
  year: string;           // Year label: "2025", "2026", etc.
  cashflow: number;       // Net annual cashflow (rounded)
  rentalIncome: number;   // Total annual rental income (rounded)
  expenses: number;       // Operating expenses excluding loan payments (rounded)
  loanRepayments: number; // Annual loan payments - interest only or P&I (rounded)
  highlight?: boolean;    // True for midpoint year if positive cashflow
}
```

**Calculation:**
- `rentalIncome` = existingRentalIncome + newPurchasesRentalIncome
- `expenses` = existingExpenses + newPurchasesExpenses (excludes loan interest)
- `loanRepayments` = existingLoanPayments + newPurchasesLoanPayments
- `cashflow` = rentalIncome - expenses - loanRepayments

### 1.3 enrichedPortfolioData (PortfolioGrowthDataPoint[])

**Enhanced version with monthly holding costs**

Wraps `portfolioGrowthData` and adds:
```typescript
monthlyHoldingCost: number;  // Rounded to integer (from corresponding cashflowData.cashflow / 12)
```

### 1.4 netWorthData

**Used by NetWorthChart component**

```typescript
Array<{
  year: string;        // "2025", "2026", etc.
  totalAssets: number; // portfolioGrowthData.portfolioValue
  totalDebt: number;   // portfolioGrowthData.totalDebt ?? 0
  netWorth: number;    // totalAssets - totalDebt
}>
```

---

## 2. useFinancialFreedomProjection Hook

**Location:** `src/hooks/useFinancialFreedomProjection.ts`

**Props:**
```typescript
{
  portfolioGrowthData: PortfolioGrowthDataPoint[];
  cashflowData: CashflowDataPoint[];
  profile: InvestmentProfileData;
  timelineProperties: TimelineProperty[];
}
```

**Return Type:**
```typescript
interface FinancialFreedomProjection {
  freedomYear: number | null;          // Year when net cashflow >= profile.targetPassiveIncome
  freedomYearIndex: number | null;     // Years from BASE_YEAR to freedomYear
  yearlyData: FreedomYearData[];        // 30-year projection beyond accumulation phase
  milestones: Milestone[];             // Key transition events
  piTransitionYear: number | null;     // Year when IO→P&I switch occurs
  debtFreeYear: number | null;         // Year debt reaches zero
  cashflowPositiveYear: number | null; // First year net cashflow > 0
}
```

### 2.1 FreedomYearData[]

**30-year projection data (one point per year after accumulation ends)**

```typescript
interface FreedomYearData {
  year: number;              // Calendar year (e.g., 2055)
  netCashflow: number;       // rentalIncome - expenses - loanPayments (rounded)
  totalDebt: number;         // Remaining debt after principal payments (rounded)
  rentalIncome: number;      // Annual rental income (grows at DEFAULT_GROWTH_RATE, rounded)
  totalExpenses: number;     // Annual expenses ex-loan (grows at ANNUAL_INFLATION_RATE, rounded)
  loanPayments: number;      // Annual loan payments (Interest-only or P&I, rounded)
  portfolioValue: number;    // Portfolio value (grows at DEFAULT_GROWTH_RATE, rounded)
  isPiPhase: boolean;        // true if year >= piTransitionYear
}
```

**Key Logic:**
- IO phase (year < piTransitionYear): `loanPayments = totalDebt * DEFAULT_INTEREST_RATE`
- P&I phase (year >= piTransitionYear):
  - First P&I year: `annualPiPayment = calcAmortization(remainingDebt, rate, 25_years)`
  - Subsequently: Principal reduces debt, interest applies to remaining balance
- Growth: Portfolio and rental grow at `DEFAULT_GROWTH_RATE` (6%)
- Expenses grow at `ANNUAL_INFLATION_RATE` (3.5%)

### 2.2 Milestone[]

```typescript
interface Milestone {
  year: number;
  label: string;  // "IO → P&I transition", "Cashflow positive", "Financial freedom", "Debt free"
  type: 'transition' | 'positive' | 'freedom' | 'debt-free';
}
```

---

## 3. Event Block System (Custom Events)

**Location:** `src/contexts/PropertySelectionContext.tsx` + `src/utils/eventProcessing.ts`

### 3.1 EventBlock

```typescript
interface EventBlock {
  id: string;                // UUID
  type: 'event';             // Fixed literal
  eventType: EventType;      // See EventType union below
  category: EventCategory;   // 'income' | 'portfolio' | 'life' | 'market'
  period: number;            // When event occurs (1, 2, 3... = period number, not year)
  order: number;             // Position in timeline sequence
  payload: EventPayload;     // Event-specific data
  label?: string;            // Optional custom label
}
```

### 3.2 EventType (Union)

```typescript
type EventType =
  // Income events
  | 'salary_change'
  | 'partner_income_change'
  | 'bonus_windfall'
  // Portfolio events
  | 'sell_property'
  | 'refinance'
  | 'renovate'
  // Life events
  | 'inheritance'
  | 'major_expense'
  | 'dependent_change'
  // Market events
  | 'interest_rate_change'
  | 'market_correction'
```

### 3.3 EventPayload

```typescript
interface EventPayload {
  // Income events
  newSalary?: number;           // New salary amount
  previousSalary?: number;
  newPartnerSalary?: number;
  previousPartnerSalary?: number;
  bonusAmount?: number;

  // Portfolio events
  propertyInstanceId?: string;  // Target property
  salePrice?: number;
  newInterestRate?: number;     // As percentage (e.g., 6.5)
  previousInterestRate?: number;
  renovationCost?: number;
  valueIncrease?: number;       // Dollar amount

  // Life events
  cashAmount?: number;          // For inheritance/expense
  dependentChange?: number;     // +1 or -1

  // Market events
  rateChange?: number;          // Percentage points (e.g., +0.5)
  growthAdjustment?: number;    // Percentage points (e.g., -3)
  durationPeriods?: number;     // How long effect lasts
}
```

### 3.4 Refinance Event Processing

**Function:** `getPropertyEffectiveRate(period, events, propertyInstanceId, baseRate)`

**Returns:** `number` (interest rate as decimal, e.g., 0.065 for 6.5%)

**Logic:**
1. Check for property-specific refinance: `getRefinanceRateForProperty(period, events, propertyInstanceId)`
   - Searches events with `eventType === 'refinance'` and `period <= currentPeriod`
   - Matches if `event.payload.propertyInstanceId === propertyInstanceId` or unspecified (applies to all)
   - Returns `event.payload.newInterestRate / 100` (converts from percentage)
2. If no refinance found, falls back to market-wide rate: `getEffectiveInterestRate(period, events, baseRate)`

### 3.5 Do-Nothing Calculation

**Location:** `src/hooks/useChartDataGenerator.ts` lines 246-253

**Calculation per year:**
```
doNothingBalance = balance
for each year:
  balance = balance * (1 + SAVINGS_INTEREST_RATE) + profile.annualSavings

Where SAVINGS_INTEREST_RATE = from financialParams (typically 2%)
```

**Data Origin:**
- `profile.depositPool` (initial)
- `profile.annualSavings` (per-year addition)
- `SAVINGS_INTEREST_RATE` (compound growth)

**Used in:** `PortfolioGrowthDataPoint.doNothingBalance`

### 3.6 Renovation Events

**Function:** `getRenovationValueIncrease(propertyInstanceId, upToPeriod, events)`

**Returns:** `number` (cumulative value increase in dollars)

**Logic:**
```typescript
events
  .filter(e =>
    e.eventType === 'renovate' &&
    e.payload.propertyInstanceId === propertyInstanceId &&
    e.period <= upToPeriod
  )
  .reduce((sum, e) => sum + (e.payload.valueIncrease || 0), 0)
```

**Impact:**
- Increases `portfolioValue` and `equity` in PortfolioGrowthDataPoint
- Line 233-235 in useChartDataGenerator

---

## 4. Property Instance Details

**Location:** `src/types/propertyInstance.ts`

### 4.1 PropertyInstanceDetails (39 fields total)

**Used by:** `calculateDetailedCashflow()` function

#### Section A: Property Overview (6 fields)
```typescript
{
  state: string;                    // 'NSW', 'VIC', 'QLD', etc.
  purchasePrice: number;            // Purchase price
  valuationAtPurchase: number;      // Valuation at purchase
  rentPerWeek: number;              // Weekly rental income
  growthAssumption: 'High' | 'Medium' | 'Low';  // Growth tier
  minimumYield: number;             // Minimum yield threshold
}
```

#### Section B: Contract & Loan Details (8 fields)
```typescript
{
  daysToUnconditional: number;      // Days to unconditional exchange
  daysForSettlement: number;        // Days to settlement
  lvr: number;                      // Loan-to-value ratio (0-100)
  lmiWaiver: boolean;               // LMI waived flag
  loanProduct: 'IO' | 'PI';        // Interest Only or Principal & Interest
  interestRate: number;             // Annual rate (e.g., 6.5)
  loanTerm: number;                 // Loan term in years
  loanOffsetAccount: number;        // Offset account balance
}
```

#### Section D: One-Off Purchase Costs (12 fields)
```typescript
{
  engagementFee: number;
  conditionalHoldingDeposit: number;
  buildingInsuranceUpfront: number;
  buildingPestInspection: number;
  plumbingElectricalInspections: number;
  independentValuation: number;
  unconditionalHoldingDeposit: number;
  mortgageFees: number;
  conveyancing: number;
  ratesAdjustment: number;
  maintenanceAllowancePostSettlement: number;
  stampDutyOverride: number | null;
}
```

#### Section E: Cashflow (8 fields)
```typescript
{
  vacancyRate: number;                        // % (e.g., 2)
  propertyManagementPercent: number;          // % of rent (e.g., 6.6)
  buildingInsuranceAnnual: number;            // Annual cost
  councilRatesWater: number;                  // Annual cost
  strata: number;                             // Annual body corporate
  maintenanceAllowanceAnnual: number;         // Annual allowance
  landTaxOverride: number | null;            // Calculated if null
  potentialDeductionsRebates: number;        // Dollar amount
}
```

#### Section F: Manual Placement (4 fields)
```typescript
{
  isManuallyPlaced?: boolean;      // Drag-and-drop flag
  manualPlacementPeriod?: number;  // Target period (1-8)
  hasBeenAmended?: boolean;        // Amended to fit guardrails
  lmiCapitalized?: boolean;        // Capitalize LMI into loan
}
```

---

## 5. Detailed Cashflow Calculator

**Location:** `src/utils/detailedCashflowCalculator.ts`

**Function:** `calculateDetailedCashflow(property: PropertyInstanceDetails, loanAmount: number)`

**Returns:**
```typescript
interface CashflowBreakdown {
  // Income
  weeklyRent: number;           // property.rentPerWeek
  grossAnnualIncome: number;    // weeklyRent * 52
  vacancyAmount: number;        // grossAnnualIncome * (vacancyRate / 100)
  adjustedIncome: number;       // grossAnnualIncome - vacancyAmount

  // Expenses
  loanInterest: number;         // effectiveLoanAmount * (interestRate / 100)
                                // where effectiveLoanAmount = loanAmount - loanOffsetAccount
  propertyManagementFee: number; // adjustedIncome * (propertyManagementPercent / 100)
  buildingInsurance: number;    // buildingInsuranceAnnual
  councilRatesWater: number;    // councilRatesWater
  strata: number;               // strata
  maintenance: number;          // maintenanceAllowanceAnnual
  totalOperatingExpenses: number; // Sum of above

  // Non-deductible
  landTax: number;              // landTaxOverride ?? 0
  principalPayments: number;    // Calculated if loanProduct === 'PI'
  totalNonDeductibleExpenses: number; // landTax + principalPayments

  // Deductions
  potentialDeductions: number;  // potentialDeductionsRebates

  // Net cashflow
  netAnnualCashflow: number;    // adjustedIncome - totalOperatingExpenses - totalNonDeductibleExpenses + potentialDeductions
  netMonthlyCashflow: number;   // netAnnualCashflow / 12
  netWeeklyCashflow: number;    // netAnnualCashflow / 52
}
```

---

## 6. Metrics Calculator Functions

**Location:** `src/utils/metricsCalculator.ts`

### 6.1 calculatePortfolioMetrics

**Input:**
```typescript
purchases: PropertyPurchase[],
currentYear: number,
baseGrowthRate: number,
growthCurve: GrowthCurve,
interestRate: number = DEFAULT_INTEREST_RATE,
expenses: PropertyExpenses = DEFAULT_PROPERTY_EXPENSES
```

**Returns:** `PropertyMetrics`

```typescript
interface PropertyMetrics {
  portfolioValue: number;        // Sum of all property values
  totalEquity: number;           // portfolioValue - totalDebt
  totalDebt: number;             // Sum of loan amounts (no principal reduction)
  annualCashflow: number;        // Sum of cashflows
  annualLoanRepayments: number;  // Sum of loan repayments
}
```

**Per-Property Calculation:**
- `currentValue` = `calculatePropertyGrowth(cost, periodsHeld, growthCurve)`
- `periodsHeld` = `yearsHeld * PERIODS_PER_YEAR`
- `remainingDebt` = `purchase.loanAmount` (simplified model)
- `propertyEquity` = `max(0, currentValue - remainingDebt)`

### 6.2 calculateExistingPortfolioMetrics

**Input:**
```typescript
portfolioValue: number,
currentDebt: number,
yearsGrown: number,
growthRate: number,  // Default 3% from profile.existingPortfolioGrowthRate
growthCurve: GrowthCurve,
interestRate: number = DEFAULT_INTEREST_RATE
```

**Returns:** `PropertyMetrics`

**Logic:**
- `currentValue` = `portfolioValue * (1 + growthRate) ^ yearsGrown`
- `equity` = `max(0, currentValue - currentDebt)`
- `annualRepayments` = `currentDebt * interestRate`

### 6.3 calculatePropertyGrowth (Tiered Growth)

**Input:**
```typescript
initialValue: number,
periods: number,  // 6-month periods (1, 2, 3...)
growthCurve: { year1, years2to3, year4, year5plus }
```

**Returns:** `number` (final property value)

**Growth Tiers:**
- Periods 1-2 (Year 1): `year1` rate
- Periods 3-6 (Years 2-3): `years2to3` rate
- Periods 7-8 (Year 4): `year4` rate
- Periods 9+ (Year 5+): `year5plus` rate

### 6.4 combineMetrics

**Input:** `...metrics: PropertyMetrics[]`

**Returns:** `PropertyMetrics` (sum of all inputs)

```typescript
{
  portfolioValue: sum,
  totalEquity: sum,
  totalDebt: sum,
  annualCashflow: sum,
  annualLoanRepayments: sum
}
```

---

## 7. GrowthCurve Type

**Location:** `src/types/property.ts`

```typescript
interface GrowthCurve {
  year1: number;        // 1st year growth % (e.g., 12.5)
  years2to3: number;    // 2nd-3rd year growth % (e.g., 10)
  year4: number;        // 4th year growth % (e.g., 7.5)
  year5plus: number;    // 5th+ year growth % (e.g., 6)
}
```

**Default (High growth):**
```typescript
{ year1: 12.5, years2to3: 10, year4: 7.5, year5plus: 6 }
```

**Sourced from:**
1. `propertyInstance.growthAssumption` (if set) → converted via `getGrowthCurveFromAssumption()`
2. Property type template (propertyData.growthYear1, etc.)
3. Profile fallback: `profile.growthCurve`

---

## 8. TimelineProperty Type

**Location:** `src/types/property.ts`

**Complete structure with 100+ fields for detailed property tracking**

### Core Identity (4 fields)
```typescript
{
  id: string;                     // Property ID
  instanceId: string;             // Unique instance identifier
  title: string;                  // Property name
  period: number;                 // When affordable (1-8 typically)
}
```

### Financial Metrics (12 fields)
```typescript
{
  cost: number;                   // Purchase price
  depositRequired: number;        // Deposit amount
  loanAmount: number;             // Loan amount
  portfolioValueAfter: number;
  totalEquityAfter: number;
  totalDebtAfter: number;
  availableFundsUsed: number;
  totalCashRequired: number;      // deposit + acquisition costs

  // Running balances after purchase
  balancesAfterPurchase: {
    cash: number;
    savings: number;
    equityUsed: number;
  };
}
```

### Cashflow (7 fields)
```typescript
{
  grossRentalIncome: number;
  loanInterest: number;
  expenses: number;
  netCashflow: number;
  loanType?: 'IO' | 'PI';
  expenseBreakdown?: {
    councilRatesWater: number;
    strataFees: number;
    insurance: number;
    managementFees: number;
    repairsMaintenance: number;
    landTax: number;
    other: number;
  };
}
```

### Test Results (6 fields)
```typescript
{
  depositTestSurplus: number;
  depositTestPass: boolean;
  serviceabilityTestSurplus: number;
  serviceabilityTestPass: boolean;
  borrowingCapacityUsed: number;
  borrowingCapacityRemaining: number;
}
```

### Funding Breakdown (8 fields)
```typescript
{
  fundingBreakdown: {
    cash: number;       // From cash pool
    savings: number;    // Up to 25% of annual savings
    equity: number;     // From extracted equity
    total: number;
  };
  baseDeposit: number;
  cumulativeSavings: number;
  cashflowReinvestment: number;
  equityRelease: number;
}
```

### Additional (18+ fields)
- Status, affordableYear, displayPeriod
- Portfolio state before/after
- Acquisition costs breakdown
- Growth assumptions
- Rental recognition rate
- Gap rule flags
- State location
- propertyIndex for ordering

---

## 9. Constants

**Location:** `src/constants/financialParams.ts`

```typescript
PERIODS_PER_YEAR: number;           // 2 (6-month periods)
DEFAULT_INTEREST_RATE: number;      // 0.065 (6.5%)
DEFAULT_RENTAL_YIELD: number;       // 0.04 (4%)
DEFAULT_EXPENSE_RATIO: number;      // 0.35 (35% of rent)
DEFAULT_GROWTH_RATE: number;        // 0.06 (6%)
ANNUAL_INFLATION_RATE: number;      // 0.035 (3.5%)
SAVINGS_INTEREST_RATE: number;      // 0.02 (2%)
EQUITY_EXTRACTION_LVR_CAP: number;  // 0.8 (80% LVR for equity)
BASE_YEAR: number;                  // 2025
```

---

## 10. Data Flow Diagram

```
useChartDataGenerator Hook (MAIN SOURCE)
├── Input: scenarios (optional) or contexts
├── Process:
│   ├── portfolioGrowthData[] calculation
│   │   ├── calculatePortfolioMetrics (new purchases)
│   │   ├── calculateExistingPortfolioMetrics (existing)
│   │   ├── combineMetrics (merge)
│   │   ├── getRenovationValueIncrease (event effects)
│   │   └── Calculate: doNothingBalance, totalDebt, availableFunds
│   │
│   ├── cashflowData[] calculation
│   │   ├── calculateDetailedCashflow (per property)
│   │   ├── getEffectiveInterestRate (event-adjusted)
│   │   ├── Apply inflation & growth factors
│   │   └── Combine existing + new purchases
│   │
│   ├── enrichedPortfolioData (add monthlyHoldingCost)
│   ├── monthlyHoldingCost breakdown (byProperty)
│   └── netWorthData (for NetWorthChart)
│
├── Return:
│   ├── portfolioGrowthData: PortfolioGrowthDataPoint[]
│   ├── cashflowData: CashflowDataPoint[]
│   ├── monthlyHoldingCost: { total, byProperty }
│   └── netWorthData: { year, totalAssets, totalDebt, netWorth }[]
│
└── Consumed by:
    ├── Dashboard.tsx
    ├── PortfolioGrowthChart.tsx
    ├── CashflowChart.tsx
    ├── NetWorthChart.tsx
    ├── useFinancialFreedomProjection (chains from growth/cashflow data)
    └── FinancialFreedomPanel.tsx
```

---

## 11. New Visualization Implementation Checklist

When building a new dashboard visualization, verify you have access to:

- [ ] **Portfolio Growth Data:** `portfolioGrowthData[]` from useChartDataGenerator
  - Contains: year, portfolioValue, equity, doNothingBalance, totalDebt, availableFunds, borrowingCapacity

- [ ] **Cashflow Data:** `cashflowData[]` from useChartDataGenerator
  - Contains: year, cashflow, rentalIncome, expenses, loanRepayments

- [ ] **Financial Freedom Data:** `yearlyData[]` from useFinancialFreedomProjection
  - Contains: year, netCashflow, totalDebt, rentalIncome, totalExpenses, loanPayments, portfolioValue, isPiPhase

- [ ] **Per-Property Details:** Access via `getInstance(propertyInstanceId)` → PropertyInstanceDetails
  - 39 fields including rental, costs, loan terms, expenses

- [ ] **Event Effects:** Via eventProcessing utilities
  - `getPropertyEffectiveRate()` for refinance impacts
  - `getRenovationValueIncrease()` for renovation events
  - `getGrowthRateAdjustment()` for market corrections

- [ ] **Constants:** From financialParams
  - Interest rates, growth rates, inflation, periods/year

If data isn't available from existing hooks, you'll need to:
1. Extend an existing hook return type, OR
2. Create a new hook that builds from available data sources
