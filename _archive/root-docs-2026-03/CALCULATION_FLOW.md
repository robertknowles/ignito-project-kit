# PropPath Calculation Flow Diagram

## Complete Data Flow: Input → Calculation → Output

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INPUT CONTEXTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [useInvestmentProfile]      [usePropertySelection]            │
│  ├─ profile.timelineYears    ├─ selections: { id: qty }       │
│  ├─ profile.growthCurve      ├─ eventBlocks (market events)   │
│  ├─ profile.depositPool      ├─ pauseBlocks                   │
│  ├─ profile.annualSavings    └─ propertyOrder                 │
│  ├─ profile.borrowingCapacity                                 │
│  └─ profile.currentDebt      [usePropertyInstance]             │
│                              ├─ instances[id].rentPerWeek     │
│  [useDataAssumptions]        ├─ instances[id].growthAssumption│
│  ├─ propertyData[]           └─ instances[id].purchasePrice   │
│  │  └─ growth rates, yield                                    │
│  └─ globalFactors.interestRate                                │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PRIMARY CALCULATION LAYER                      │
│                  (Single Source of Truth)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [useAffordabilityCalculator]                                  │
│  Input:  profile, selections, propertyData, instances          │
│                                                                 │
│  Process:                                                       │
│  ├─ For each selected property:                                │
│  │  ├─ Check deposit availability (deposit test)              │
│  │  ├─ Check borrowing capacity (borrowing test)              │
│  │  ├─ Check serviceability (income test)                     │
│  │  └─ If passes: add to timelineProperties with timing       │
│  │                                                              │
│  └─ Return: timelineProperties[]                               │
│     ├─ [0]: { title, cost, loanAmount, affordableYear, ... }  │
│     ├─ [1]: { title, cost, loanAmount, affordableYear, ... }  │
│     └─ [n]: ...                                                │
│                                                                 │
│  Dependencies (useMemo line 1580):                             │
│  ├─ profile values                                             │
│  ├─ selections                                                 │
│  ├─ instances (property overrides)                            │
│  ├─ eventBlocks (market events)                               │
│  └─ propertyData (templates)                                  │
│                                                                │
│  ⚠️ SINGLE SOURCE: All hooks depend on timelineProperties     │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│              SECONDARY CALCULATION LAYER                        │
│          (Multiple Independent Implementations)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From timelineProperties, THREE hooks independently            │
│  calculate portfolio metrics (HIGH DUPLICATION RISK):          │
│                                                                 │
│  ┌─────────────────────────────────────────┐                  │
│  │ [useChartDataGenerator] ◄─── PRIMARY   │                  │
│  │ Input: timelineProperties               │                  │
│  │                                          │                  │
│  │ useMemo #1: portfolioGrowthData         │                  │
│  │ ├─ for year = startYear to endYear:    │                  │
│  │ │  ├─ calculateExistingPortfolioMetrics│                  │
│  │ │  ├─ for purchase in purchases:       │                  │
│  │ │  │  ├─ getGrowthCurveFromAssumption()                   │
│  │ │  │  ├─ calculatePropertyGrowth()     │                  │
│  │ │  │  ├─ calculateMortgagePayments()   │                  │
│  │ │  │  └─ getRenovationValueIncrease()  │                  │
│  │ │  ├─ calculatePortfolioMetrics()      │                  │
│  │ │  ├─ combineMetrics()                 │                  │
│  │ │  └─ data.push({ year, equity, ... }) │                  │
│  │ └─ return: PortfolioGrowthDataPoint[]  │                  │
│  │   [~170 lines of calculation]          │                  │
│  │                                          │                  │
│  │ useMemo #2: cashflowData [HEAVY]       │                  │
│  │ ├─ for year = startYear to endYear:    │                  │
│  │ │  ├─ existingPortfolio:               │                  │
│  │ │  │  ├─ existing rental income        │                  │
│  │ │  │  └─ existing expenses             │                  │
│  │ │  ├─ newPurchases:                    │                  │
│  │ │  │  ├─ for property in properties:   │                  │
│  │ │  │  │  ├─ getRenovationValueIncrease│                  │
│  │ │  │  │  ├─ calculatePropertyGrowth() │                  │
│  │ │  │  │  ├─ calculateDetailedCashflow│                  │
│  │ │  │  │  └─ getPropertyEffectiveRate()│                  │
│  │ │  │  └─ aggregate property cashflows │                  │
│  │ │  └─ data.push({ year, cashflow, ... })                 │
│  │ └─ return: CashflowDataPoint[]         │                  │
│  │   [~200 lines of calculation]          │                  │
│  │                                          │                  │
│  │ useMemo #3: enrichedPortfolioData      │                  │
│  │ └─ portfolioGrowthData.map(...merge    │                  │
│  │    with monthlyHoldingCost)            │                  │
│  │                                          │                  │
│  │ useMemo #4: monthlyHoldingCost ⚠️ RED │                  │
│  │ ├─ for property in feasibleProperties: │                  │
│  │ │  └─ calculateDetailedCashflow()     │                  │
│  │ │     [RECALCULATES - REDUNDANT!]      │                  │
│  │ └─ return: { total, byProperty[] }     │                  │
│  │                                          │                  │
│  │ useMemo #5: netWorthData               │                  │
│  │ └─ enrichedPortfolioData.map(...)      │                  │
│  │                                          │                  │
│  │ Output: {                               │                  │
│  │   portfolioGrowthData[],               │                  │
│  │   cashflowData[],                      │                  │
│  │   netWorthData[],                      │                  │
│  │   monthlyHoldingCost                   │                  │
│  │ }                                       │                  │
│  └─────────────────────────────────────────┘                  │
│                                                                 │
│  ┌─────────────────────────────────────────┐                  │
│  │ [useRoadmapData] ◄─── DUPLICATE        │                  │
│  │ Input: timelineProperties (SAME!)       │                  │
│  │                                          │                  │
│  │ Process:                                 │                  │
│  │ ├─ for year = startYear to endYear:    │                  │
│  │ │  ├─ calculatePropertyGrowthWithEvents│                  │
│  │ │  │  [DUPLICATE IMPLEMENTATION!]       │                  │
│  │ │  ├─ calculateExistingPortfolioGrowth │                  │
│  │ │  ├─ Event adjustments                │                  │
│  │ │  └─ Year data assembly               │                  │
│  │ └─ return: years[]                      │                  │
│  │   [Recalculates same portfolio metrics]│                  │
│  │                                          │                  │
│  │ Output: {                               │                  │
│  │   years[],                              │                  │
│  │   events[],                             │                  │
│  │   fundingBreakdown                      │                  │
│  │ }                                       │                  │
│  └─────────────────────────────────────────┘                  │
│                                                                 │
│  ┌─────────────────────────────────────────┐                  │
│  │ [usePerPropertyTracking]                │                  │
│  │ Input: timelineProperties (SAME!)       │                  │
│  │                                          │                  │
│  │ Process:                                 │                  │
│  │ ├─ for property in feasibleProperties: │                  │
│  │ │  └─ calculateDetailedCashflow()      │                  │
│  │ │     [DIFFERENT ALGORITHM]             │                  │
│  │ └─ return: perPropertyMetrics[]        │                  │
│  │                                          │                  │
│  │ Output: Per-property breakdowns         │                  │
│  └─────────────────────────────────────────┘                  │
│                                                                 │
│  ⚠️ CRITICAL: All three process SAME timelineProperties      │
│     independently. When both useChartDataGenerator and         │
│     useRoadmapData are mounted:                               │
│     • property growth calculated TWICE                        │
│     • portfolio value assembled TWICE                         │
│     • ~200+ redundant calculations per render                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│           TERTIARY CALCULATION LAYER                           │
│       (Depends on Secondary Layer Outputs)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [useFinancialFreedomProjection]                              │
│  Input: portfolioGrowthData, cashflowData (from               │
│         useChartDataGenerator + profile + timelineProperties) │
│                                                                 │
│  Process:                                                       │
│  ├─ Get end-of-timeline snapshot from portfolioGrowthData    │
│  ├─ For i = 0 to PROJECTION_YEARS:                            │
│  │  ├─ Extend debt/equity/cashflow                            │
│  │  ├─ Model IO→P&I transition                               │
│  │  ├─ Calculate amortization                                 │
│  │  └─ Track milestones                                       │
│  └─ Find freedomYear (passive income >= target)              │
│                                                                 │
│  Output: {                                                     │
│    freedomYear,                                               │
│    piTransitionYear,                                          │
│    debtFreeYear,                                              │
│    yearlyData[],                                              │
│    milestones[]                                               │
│  }                                                             │
│                                                                 │
│  ⚠️ Depends on useChartDataGenerator output                   │
│     If useChartDataGenerator changes, this cascades           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     COMPONENT DISPLAY LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Dashboard]                                                   │
│  ├─ useChartDataGenerator() → portfolioGrowthData             │
│  ├─ useChartDataGenerator() → cashflowData                    │
│  ├─ useChartDataGenerator(scenarioA) → chartDataA             │
│  ├─ useChartDataGenerator(scenarioB) → chartDataB             │
│  ├─ Render: PortfolioChart, CashflowChart, etc.              │
│  └─ generateComparisonChartData(chartDataA, chartDataB)       │
│                                                                 │
│  [RetirementSnapshot] ◄─── DUAL SOURCE                       │
│  ├─ useRoadmapData() → years[]                                │
│  ├─ useChartDataGenerator() → cashflowData                    │
│  ├─ Combine data from BOTH sources                            │
│  └─ Risk: If they calculate differently, divergence occurs    │
│                                                                 │
│  [FinancialFreedomPanel]                                       │
│  ├─ useChartDataGenerator() → portfolioGrowthData             │
│  ├─ useChartDataGenerator() → cashflowData                    │
│  ├─ useFinancialFreedomProjection() → freedom metrics         │
│  └─ Render: Freedom chart + milestones                        │
│                                                                 │
│  [PropertyPerformanceTabs]                                     │
│  ├─ usePerPropertyTracking() → perPropertyMetrics             │
│  └─ Render: Per-property performance breakdown                │
│                                                                 │
│  [NetWorthChart]                                              │
│  ├─ useChartDataGenerator() → netWorthData                    │
│  └─ Render: Net worth over time                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Redundancy Example: Single Property, 10-Year Timeline

### Scenario: User updates property rent

**Input Change:**
```
instances[propertyId].rentPerWeek = $500 (changed from $450)
```

**Recalculation Cascade:**

```
Change detected in PropertyInstanceContext
  ↓ (getInstance dependency triggers)
useChartDataGenerator.portfolioGrowthData useMemo re-runs
  ├─ calculateExistingPortfolioMetrics() × 1
  ├─ calculatePortfolioMetrics() × 1
  ├─ calculatePropertyGrowth() × 10 years = 10 calls
  ├─ getRenovationValueIncrease() × 10 years = 10 calls
  └─ SUBTOTAL: ~20 calls
  ↓
useChartDataGenerator.cashflowData useMemo re-runs
  ├─ getPropertyEffectiveRate() × 10 years = 10 calls
  ├─ calculatePropertyGrowth() × 10 years = 10 calls ◄── DUPLICATE
  ├─ getRenovationValueIncrease() × 10 years = 10 calls ◄── DUPLICATE
  ├─ calculateDetailedCashflow() × 10 years = 10 calls
  └─ SUBTOTAL: ~40 calls (10 are duplicates from above)
  ↓
useChartDataGenerator.enrichedPortfolioData useMemo re-runs
  └─ Just maps existing data, no calculation
  ↓
useChartDataGenerator.monthlyHoldingCost useMemo re-runs
  ├─ calculateDetailedCashflow() × 1 = 1 call ◄── REDUNDANT!
  │  (This was already calculated above)
  └─ SUBTOTAL: ~1 call (redundant)
  ↓
useChartDataGenerator.netWorthData useMemo re-runs
  └─ Just maps existing data, no calculation
  ↓
[If RetirementSnapshot also mounts]
useRoadmapData useMemo re-runs
  ├─ calculatePropertyGrowthWithEvents() × 10 years = 10 calls ◄── DUPLICATE!
  │  (Same as calculatePropertyGrowth calls above)
  ├─ Portfolio assembly
  └─ SUBTOTAL: ~10 calls (duplicates from useChartDataGenerator)
  ↓
All components using these hooks re-render

TOTAL FUNCTION CALLS:
  ├─ calculatePropertyGrowth: 10 (useChartDataGenerator) + 10 (useRoadmapData) = 20 ◄── 10 REDUNDANT
  ├─ calculateDetailedCashflow: 10 (cashflowData) + 1 (monthlyHoldingCost) = 11 ◄── 1 REDUNDANT
  ├─ getRenovationValueIncrease: 20 calls
  └─ Total redundant calculations: 11 out of ~50 = 22% waste

SCALING TO 10 PROPERTIES:
  ├─ calculatePropertyGrowth: 100 (useChartDataGenerator) + 100 (useRoadmapData) = 200 ◄── 100 REDUNDANT
  ├─ calculateDetailedCashflow: 100 (cashflowData) + 10 (monthlyHoldingCost) = 110 ◄── 10 REDUNDANT
  └─ Total redundant calculations: 110 out of ~250 = 44% waste
```

---

## Architecture Comparison: Current vs Ideal

### Current Architecture (Multiple Independent Paths)

```
timelineProperties
  │
  ├──→ useChartDataGenerator
  │    ├─ calculatePropertyGrowth() × 100 calls
  │    ├─ calculateDetailedCashflow() × 100 calls
  │    ├─ calculateDetailedCashflow() × 100 calls (REDUNDANT!)
  │    └─ Output: portfolioGrowthData, cashflowData
  │
  ├──→ useRoadmapData
  │    ├─ calculatePropertyGrowthWithEvents() × 100 calls (DUPLICATE!)
  │    └─ Output: years[], events[]
  │
  └──→ usePerPropertyTracking
       ├─ calculateDetailedCashflow() × 100 calls (DIFFERENT ALGORITHM)
       └─ Output: perPropertyMetrics

TOTAL: ~400 calculations
UNIQUE: ~200
REDUNDANT: ~200 (50% efficiency)
```

### Ideal Architecture (Single Calculation Engine)

```
timelineProperties
  │
  └──→ CalculationEngine (single useMemo)
       ├─ calculatePropertyGrowth() × 100 calls
       ├─ calculateDetailedCashflow() × 100 calls
       └─ Cache results: {
           portfolioMetricsByYear: [...],
           cashflowByYear: [...],
           perPropertyCashflow: {...}
         }

  ├──→ useChartDataGenerator
  │    └─ Read cache → format for charts
  │
  ├──→ useRoadmapData
  │    └─ Read cache → format for roadmap
  │
  └──→ usePerPropertyTracking
       └─ Read cache → format per-property

TOTAL: ~200 calculations
UNIQUE: ~200
REDUNDANT: 0 (100% efficiency)
```

---

## Synchronization Points (Data Divergence Risk)

### Point 1: RetirementSnapshot (RISKY)
```typescript
// src/components/RetirementSnapshot.tsx
const { years } = useRoadmapData()           // From PATH A
const { cashflowData } = useChartDataGenerator()  // From PATH B

// If PATH A and PATH B calculate year structure differently:
// → years[0].portfolioValue ≠ portfolioGrowthData[0].portfolioValue
```

### Point 2: Dashboard Scenario Comparison
```typescript
// src/components/Dashboard.tsx
const chartDataA = useChartDataGenerator(scenarioAData)
const chartDataB = useChartDataGenerator(scenarioBData)

// Both run independently with slightly different inputs
// If there's floating-point precision handling, they could diverge
```

### Point 3: Saved Scenarios
```typescript
// When saving a scenario, useChartDataSync saves portfolioGrowthData
// If useChartDataGenerator logic changes, old saved scenarios become stale
// and won't match current calculations
```

---

## Calculation Weight Profile

### By Hook: CPU Time Per Render

| Hook | Lines of Code | Calculation Load | Called Per Render | Risk Level |
|------|---|---|---|---|
| useAffordabilityCalculator | 1500+ | MEDIUM | Every change | Core (single) |
| useChartDataGenerator | 450+ | **HIGH** | Every profile/timeline change | **CRITICAL** |
| useRoadmapData | 300+ | **HIGH** | Every timeline change | **CRITICAL** |
| usePerPropertyTracking | 200+ | MEDIUM | Every timeline change | High |
| useFinancialFreedomProjection | 150+ | LOW | When chart data changes | Dependent |

### By Function: Call Frequency Per Render (10 properties, 10 years)

| Function | useChartDataGenerator | useRoadmapData | usePerPropertyTracking | Total | Unique |
|---|---|---|---|---|---|
| calculatePropertyGrowth | 100 | 100 | - | 200 | 100 ◄── 50% REDUNDANT |
| calculateDetailedCashflow | 110 | - | 100 | 210 | 100 ◄── 52% REDUNDANT |
| getRenovationValueIncrease | 20 | - | - | 20 | 20 |
| getPropertyEffectiveRate | 10 | - | - | 10 | 10 |
| getGrowthCurveFromAssumption | 10 | - | - | 10 | 10 |
| **TOTAL** | ~250 | ~100 | ~100 | ~450 | ~240 ◄── 47% REDUNDANCY |

---

## Root Cause Summary

**Architecture Decision:** Each hook independently processes `timelineProperties` to calculate metrics

**Why It's a Problem:**
- No caching of calculations
- No sharing of intermediate results
- No deduplication of repeated work
- Multiple implementations of same algorithm
- High cognitive load on developers (consistency across 3+ places)

**Why It Happened:**
- Evolved organically as requirements changed
- No central calculation layer from the start
- Each feature team added their own hook
- Premature optimization (thought independent paths were better)
- No performance monitoring to catch duplication

**Cost:**
- 47% of CPU time wasted on redundant calculations
- 100+ wasted function calls per render
- Maintenance burden (updates in multiple places)
- Synchronization risks (data divergence)
