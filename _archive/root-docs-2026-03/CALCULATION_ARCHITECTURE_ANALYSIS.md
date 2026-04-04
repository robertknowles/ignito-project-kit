# Calculation Architecture Analysis: PropPath

## Executive Summary

The PropPath calculation system has **multiple independent calculation paths** that operate on similar data but maintain separate state. This creates duplication risks and synchronization challenges. The primary issue is that portfolio growth data is computed in multiple places with similar logic but different entry points.

**Key Risk:** Dashboard changes (e.g., adding new chart consumers) trigger **redundant recalculations** of portfolioGrowthData because multiple hooks independently process the same timelineProperties data.

---

## 1. Hook Dependency Map

### Core Dependency Chain

```
INPUT: User Profile + Property Selections (useInvestmentProfile, usePropertySelection)
  │
  ├─→ useAffordabilityCalculator [CORE]
  │    └─ Outputs: timelineProperties (feasible purchases + timing)
  │
  ├─→ useChartDataGenerator
  │    ├─ Consumes: timelineProperties from useAffordabilityCalculator
  │    └─ Outputs: portfolioGrowthData, cashflowData, netWorthData, monthlyHoldingCost
  │
  ├─→ useRoadmapData
  │    ├─ Consumes: timelineProperties from useAffordabilityCalculator
  │    └─ Outputs: years[], events[], funding structure (recalculates property growth)
  │
  └─→ useFinancialFreedomProjection
       ├─ Consumes: portfolioGrowthData + cashflowData from useChartDataGenerator
       └─ Outputs: freedomYear, P&I transition, debt-free year projection
```

### Secondary Hooks

- **useChartDataSync**: Syncs portfolioGrowthData + cashflowData to ScenarioSaveContext
- **usePerPropertyTracking**: Consumes timelineProperties; recalculates detailed property cashflow
- **useGrowthProjections**: Consumes timelineProperties; appears minimal
- **useClientSwitching**: Context management

---

## 2. Number of Hooks/Calculators Producing Portfolio Data

### Hooks Generating Portfolio-Related Data:

1. **useChartDataGenerator** (Main output)
   - Outputs: portfolioGrowthData, cashflowData, netWorthData, monthlyHoldingCost

2. **useRoadmapData** (Roadmap display)
   - Replicates/validates portfolio metrics for year-by-year breakdown
   - Contains duplicate property growth calculation logic

3. **useFinancialFreedomProjection** (Post-accumulation projection)
   - Uses portfolioGrowthData as input; extends beyond timeline years

4. **usePerPropertyTracking** (Property-level detail)
   - Recalculates detailed cashflow per property (different algorithm than useChartDataGenerator)

5. **useAffordabilityCalculator** (Purchase feasibility)
   - Calculates individual purchase affordability
   - Not directly generating chart data, but drives timelineProperties

### Utility Calculators (Used by multiple hooks):

- `calculatePropertyGrowth()` - called by useChartDataGenerator, useRoadmapData, usePerPropertyTracking
- `calculatePortfolioMetrics()` - called by useChartDataGenerator
- `calculateDetailedCashflow()` - called by useChartDataGenerator, usePerPropertyTracking
- `calculateExistingPortfolioGrowthByPeriod()` - called by useChartDataGenerator, useRoadmapData
- Event processing utilities: `getGrowthRateAdjustment()`, `getEffectiveInterestRate()`, etc.

**Total: 5 hooks + 5 major utility functions = 10 sources of portfolio/growth calculations**

---

## 3. Critical Duplication Points

### Duplication #1: Property Growth Calculation

**Location A - metricsCalculator.ts:**
```typescript
export const calculatePropertyGrowth = (
  initialValue: number,
  periods: number,
  growthCurve: GrowthCurve
): number => {
  // Tiered growth (Y1, Y2-3, Y4, Y5+)
  for (let period = 1; period <= periods; period++) {
    let periodRate;
    if (period <= 2) periodRate = year1Rate;
    else if (period <= 6) periodRate = years2to3Rate;
    // ... etc
  }
}
```

**Location B - useRoadmapData.ts (lines 41-95):**
```typescript
const calculatePropertyGrowthWithEvents = (
  initialValue: number,
  periods: number,
  growthCurve: { year1: number; years2to3: number; year4: number; year5plus: number },
  eventBlocks: EventBlock[],
  basePeriod: number = 0
): number => {
  // IDENTICAL logic + event processing
  for (let period = 1; period <= periods; period++) {
    // ... same tiered growth calculation
  }
}
```

**Impact:** When property growth assumptions change, developers must update TWO separate functions. Current code has a fallback (`calculatePropertyGrowth` without events), but this is unmaintained.

---

### Duplication #2: Portfolio Metrics Assembly

**useChartDataGenerator (lines 104-278):**
- Full year-by-year portfolio growth calculation
- Calls: `calculateExistingPortfolioMetrics()`, `calculatePortfolioMetrics()`, `combineMetrics()`
- Includes event adjustments, renovation tracking

**useRoadmapData (lines ~200+):**
- Recalculates portfolio value and equity per year
- Uses same utility functions but for different output format
- Builds year-by-year breakdown with property purchase listings

**Risk:** Both hooks depend on the same calculators but independently assemble the data. A bug fix in one place doesn't guarantee consistency in the other.

---

### Duplication #3: Cashflow Calculation

**useChartDataGenerator (lines 280-494):**
```typescript
const cashflowData = useMemo((): CashflowDataPoint[] => {
  for (let year = startYear; year <= endYear; year++) {
    // Calculate existing portfolio cashflow
    // Calculate new purchases cashflow
    // Combine metrics
  }
}, [timelineProperties, profile, ...])
```

**usePerPropertyTracking.ts (lines ~140-180):**
```typescript
// Similar cashflow logic per property
// Calls calculateDetailedCashflow() for each property
// Produces per-property breakdowns
```

**Problem:** useChartDataGenerator aggregates to portfolio level; usePerPropertyTracking breaks it down per property. But both process the same underlying data independently.

---

## 4. useMemo Dependency Analysis

### High-Risk Dependencies (Trigger Unnecessary Recalculation):

**useChartDataGenerator:**
```typescript
const portfolioGrowthData = useMemo((): PortfolioGrowthDataPoint[] => {
  // ... 170+ lines of calculation
}, [
  timelineProperties,      // ← PRIMARY DEPENDENCY
  profile,                 // ← Broad dependency (any profile change = recalc)
  globalFactors,
  getPropertyData,         // ← Function reference (changes if context updates)
  eventBlocks,
  getInstance,             // ← Function reference (changes if context updates)
]);

const cashflowData = useMemo((): CashflowDataPoint[] => {
  // ... 200+ lines of calculation
}, [timelineProperties, profile, globalFactors, getPropertyData, getInstance, eventBlocks]);

const enrichedPortfolioData = useMemo((): PortfolioGrowthDataPoint[] => {
  return portfolioGrowthData.map(...); // Depends on portfolioGrowthData
}, [portfolioGrowthData, cashflowData]);

const monthlyHoldingCost = useMemo(() => {
  // ... recalculates detailed cashflow per property
}, [timelineProperties, cashflowData, getInstance]);
```

**Problem:**
- `monthlyHoldingCost` depends on `cashflowData`, which triggers full recalculation
- `enrichedPortfolioData` adds a wrapper layer that doesn't add substantive computation
- Every change to `profile` (even if unrelated to properties) triggers full recalculation

---

### High-Risk Dependencies (useRoadmapData):

```typescript
export const useRoadmapData = (scenarioData?: ScenarioDataInput) => {
  const { timelineProperties: contextTimelineProperties } = useAffordabilityCalculator();
  // Depends on useAffordabilityCalculator → triggers whenever affordability changes
  // Then independently recalculates property growth
}
```

---

## 5. Shared State & Multi-Path Issues

### Single Source of Truth: timelineProperties

✅ **GOOD:** `useAffordabilityCalculator` is the single source for which properties are affordable and when.

❌ **BAD:** Multiple consumers independently process this data:
- `useChartDataGenerator`: Generates portfolio growth projections
- `useRoadmapData`: Generates roadmap with year-by-year breakdown
- `usePerPropertyTracking`: Generates per-property cashflow
- `useFinancialFreedomProjection`: Uses the output (portfolioGrowthData)

Each recomputes similar metrics (property growth, portfolio value, debt tracking) in slightly different ways.

---

## 6. Data Flow Diagram: From Input to Display

```
USER INPUT
  ↓
useInvestmentProfile (profile state)
  ├─ timelineYears, growthCurve, depositPool, etc.
  │
usePropertySelection (property selections + events)
  ├─ selections: { propertyId: quantity }
  ├─ eventBlocks: market corrections, refinances, etc.
  │
useDataAssumptions (property type templates)
  ├─ propertyData (growth rates, yields by type)
  │
usePropertyInstance (individual property overrides)
  ├─ per-property rent, growth assumptions, costs
  │
────────────────────────────────────────────────────

CALCULATION LAYER 1: useAffordabilityCalculator
  ├─ Processes: profile + selections + instances
  ├─ Output: timelineProperties (feasible purchases + timing)
  │
  ├─→ CALCULATION LAYER 2A: useChartDataGenerator
  │   ├─ Input: timelineProperties
  │   ├─ Calculations:
  │   │   - portfolioGrowthData (via calculatePortfolioMetrics + calculatePropertyGrowth)
  │   │   - cashflowData (via calculateDetailedCashflow)
  │   │   - netWorthData (derived from portfolioGrowthData)
  │   │   - monthlyHoldingCost (recalculates from timelineProperties)
  │   └─ Output: { portfolioGrowthData, cashflowData, netWorthData, monthlyHoldingCost }
  │       ↓
  │       CALCULATION LAYER 3A: useFinancialFreedomProjection
  │       ├─ Input: portfolioGrowthData + cashflowData (end-of-timeline snapshot)
  │       └─ Output: 30-year freedom projection (freedomYear, P&I transition)
  │
  ├─→ CALCULATION LAYER 2B: useRoadmapData
  │   ├─ Input: timelineProperties (same input as 2A)
  │   ├─ Calculations:
  │   │   - Duplicates property growth (calculatePropertyGrowthWithEvents)
  │   │   - Recalculates portfolio value per year
  │   │   - Rebuilds year data with purchase details
  │   └─ Output: { years[], events[], fundingBreakdown }
  │
  ├─→ CALCULATION LAYER 2C: usePerPropertyTracking
  │   ├─ Input: timelineProperties
  │   ├─ Calculations:
  │   │   - Recalculates detailed cashflow per property
  │   │   - Different algorithm than useChartDataGenerator
  │   └─ Output: per-property metrics (different shape)
  │
────────────────────────────────────────────────────

DISPLAY LAYER
  ├─ Dashboard: Uses portfolioGrowthData + cashflowData (useChartDataGenerator)
  ├─ ClientDashboard: Uses comparison logic on multiple scenarios
  ├─ RetirementSnapshot: Uses useRoadmapData + useChartDataGenerator (dual sources!)
  ├─ FinancialFreedomPanel: Uses useChartDataGenerator + useFinancialFreedomProjection
  └─ PropertyPerformanceTabs: Uses usePerPropertyTracking
```

---

## 7. Known Issues & Workarounds

### Issue #1: Duplicate Growth Calculation

**File:** useAffordabilityCalculator.ts (lines 1393, 1432, 1539, 1548)

**Comments in code:**
```typescript
// Balances AFTER this purchase (SINGLE SOURCE OF TRUTH for useRoadmapData)
// These will be passed to useRoadmapData to avoid recalculation
// Calculated here, consumed by useRoadmapData for display
// Used by useRoadmapData to display correct balances without recalculating
```

**Reality:** Despite these comments, useRoadmapData **still independently recalculates** property growth. The balances are calculated, but the growth function is duplicated.

---

### Issue #2: RetirementSnapshot Uses Two Sources

**File:** RetirementSnapshot.tsx (lines 102-104)

```typescript
const { years } = useRoadmapData()
const { cashflowData } = useChartDataGenerator()

// Line 138: "Use cashflow from useChartDataGenerator (same source as charts) for consistency"
// But gets year structure from useRoadmapData
```

**Risk:** If useRoadmapData and useChartDataGenerator calculate differently, they'll diverge. This is a synchronization point.

---

### Issue #3: monthlyHoldingCost Recalculation

**File:** useChartDataGenerator.ts (lines 509-530)

```typescript
const monthlyHoldingCost = useMemo(() => {
  const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');
  feasibleProperties.map(property => {
    const propertyInstance = getInstance(property.instanceId);
    const breakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount);
    // ... recalculates for each property
  });
}, [timelineProperties, cashflowData, getInstance]);
```

**Problem:** This recalculates `calculateDetailedCashflow()` for every property, even though `cashflowData` already contains aggregated cashflow. This is redundant computation.

---

## 8. Duplication Risk Assessment

### Risk Level: **HIGH**

| Duplication Point | Location | Risk Level | Impact |
|---|---|---|---|
| Property growth calculation | metricsCalculator + useRoadmapData | **CRITICAL** | Growth assumptions changes require updates in 2+ places |
| Portfolio metrics assembly | useChartDataGenerator + useRoadmapData | **HIGH** | Inconsistency in year-by-year valuations |
| Cashflow calculation | useChartDataGenerator + usePerPropertyTracking | **HIGH** | Different algorithms for same data |
| Detailed cashflow per property | useChartDataGenerator + monthlyHoldingCost | **MEDIUM** | Redundant recalculation of same breakdown |
| Growth curve application | Multiple hooks apply event adjustments | **MEDIUM** | Event logic must be consistent across 3+ places |

---

## 9. What Happens When You Add a New Dashboard Consumer?

### Scenario: Add a new chart component that consumes portfolioGrowthData

**Current Flow:**
```
Component mounts
  → calls useChartDataGenerator()
  → triggers portfolioGrowthData useMemo (if dependencies changed)
    → calls calculatePortfolioMetrics() × (endYear - startYear)
    → calls calculatePropertyGrowth() × (properties × years)
    → calls event processing functions
    → calls calculateDetailedCashflow() × properties
  → Also triggers:
    - enrichedPortfolioData useMemo
    - monthlyHoldingCost useMemo (recalculates cashflow again!)
    - cashflowData useMemo (200+ lines)
```

**Duplicate Work:**
- If RetirementSnapshot also mounts and calls useRoadmapData:
  - useRoadmapData recalculates property growth (duplicate calculatePropertyGrowth calls)
  - Rebuilds year data structure
  - No caching of results

---

## 10. Recommended Architecture Changes

### Phase 1: Eliminate Duplicate Growth Calculation
- Merge `calculatePropertyGrowth` and `calculatePropertyGrowthWithEvents` into single function
- Store event-adjusted growth in a cached lookup

### Phase 2: Consolidate Portfolio Metrics
- Create `calculatePortfolioSnapshot(year, timelineProperties)` utility
- Both useChartDataGenerator and useRoadmapData call this instead of reimplementing

### Phase 3: Separate Concerns
- Keep useChartDataGenerator as chart-specific output
- Keep useRoadmapData as roadmap display (no calculation, just formatting)
- Have useRoadmapData consume already-calculated data from a shared source

### Phase 4: Reduce Dependency Chaining
- Memoize `timelineProperties` at the source (useAffordabilityCalculator)
- Use stable function references or `useCallback` for getInstance, getPropertyData

---

## 11. File Paths & Key Code References

### Core Calculation Hooks:
- `/src/hooks/useAffordabilityCalculator.ts` - Timeline property feasibility (lines 50-1605)
- `/src/hooks/useChartDataGenerator.ts` - Main portfolio metrics (lines 93-548)
- `/src/hooks/useRoadmapData.ts` - Roadmap-specific metrics (lines 183+)
- `/src/hooks/useFinancialFreedomProjection.ts` - Post-accumulation projection (lines 55+)
- `/src/hooks/usePerPropertyTracking.ts` - Property-level tracking

### Calculation Utilities:
- `/src/utils/metricsCalculator.ts` - `calculatePropertyGrowth`, `calculatePortfolioMetrics`, `combineMetrics`
- `/src/utils/eventProcessing.ts` - Event adjustment functions
- `/src/utils/detailedCashflowCalculator.ts` - Cashflow detail calculations
- `/src/utils/comparisonCalculator.ts` - Comparison logic

### Problematic Duplications:
- **Property growth:** lines 10-44 in metricsCalculator.ts vs. lines 41-95 in useRoadmapData.ts
- **Portfolio assembly:** lines 104-278 in useChartDataGenerator.ts vs. useRoadmapData.ts (full file)
- **Cashflow:** lines 280-494 in useChartDataGenerator.ts vs. usePerPropertyTracking.ts
- **Monthly cost:** lines 509-530 in useChartDataGenerator.ts (recalculates existing metrics)

---

## 12. Summary Table: Hook Dependencies

| Hook | Input | Output | Recalc Triggers | Risk |
|---|---|---|---|---|
| useAffordabilityCalculator | profile, selections | timelineProperties | profile, selections, events | Core (single source) |
| useChartDataGenerator | timelineProperties | portfolioGrowthData, cashflowData | timelineProperties, profile, instances | HIGH (dual impl) |
| useRoadmapData | timelineProperties | years[], events[] | timelineProperties (same) | HIGH (duplication) |
| useFinancialFreedomProjection | portfolioGrowthData, cashflowData | freedomYear, milestones | those inputs | MEDIUM (dependent) |
| usePerPropertyTracking | timelineProperties | perPropertyMetrics | timelineProperties | HIGH (separate algorithm) |

---

## Conclusion

The PropPath calculation system has **5 independent calculation paths** that process similar data with overlapping logic. Key risks:

1. **Property growth calculation duplicated** in 2 places
2. **Portfolio metrics assembled independently** by multiple hooks
3. **Cashflow calculated differently** by useChartDataGenerator vs. usePerPropertyTracking
4. **Adding new consumers** triggers full recalculation cascade without deduplication
5. **Multiple sources of truth** for the same metrics (e.g., RetirementSnapshot uses both useRoadmapData and useChartDataGenerator)

Refactoring to consolidate calculations into a single, memoized pathway would eliminate redundant work and ensure consistency across the dashboard.
