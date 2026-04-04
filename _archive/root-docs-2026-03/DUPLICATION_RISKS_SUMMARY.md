# Calculation Duplication Risks - Quick Reference

## The Problem in One Sentence
**Portfolio metrics are recalculated independently by 5 different hooks, and some calculators are duplicated in 2+ places.**

---

## Critical Issues

### 1. ⚠️ Property Growth Calculation Duplicated
**Files:**
- `src/utils/metricsCalculator.ts` (lines 10-44): `calculatePropertyGrowth()`
- `src/hooks/useRoadmapData.ts` (lines 41-95): `calculatePropertyGrowthWithEvents()`

**Impact:** Same algorithm, two implementations
- If growth curve logic changes → must update BOTH
- Currently, useRoadmapData doesn't use metricsCalculator version
- Maintenance nightmare

**Example:** Change Year 1 growth from 12.5% to 13%
- You'd update metricsCalculator, but useRoadmapData still has 12.5%
- Dashboard and Roadmap would show different numbers

---

### 2. 🔴 Redundant Cashflow Calculation in useChartDataGenerator
**File:** `src/hooks/useChartDataGenerator.ts`

**Problem:**
```typescript
// Line 377: First calculation in cashflowData useMemo
for (let year = startYear; year <= endYear; year++) {
  propertiesByThisYear.forEach(property => {
    const cashflowBreakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount);
    // ... use this result
  });
}

// Line 518: SECOND calculation in monthlyHoldingCost useMemo
feasibleProperties.forEach(property => {
  const breakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount);
  // ... recalculate same thing!
});
```

**Impact:**
- Same `calculateDetailedCashflow()` called **twice per property**
- For 10 properties over 10 years: 200 redundant calculations
- monthlyHoldingCost only needs end-of-timeline value, not year-by-year

**Fix:** Calculate once, store in variable, reuse

---

### 3. ❌ Two Hooks Calculate Same Portfolio Metrics
**Hooks:**
- `useChartDataGenerator` (lines 104-278)
- `useRoadmapData` (lines 183+)

**Both:**
- Take `timelineProperties` as input
- Calculate portfolio value per year
- Apply event adjustments
- Build year-by-year structure

**Impact:**
When both are mounted (e.g., Dashboard + RetirementSnapshot):
- Property growth calculated **twice** with same input
- Portfolio value assembled **twice** with same calculation
- No caching, no data sharing

**Current Cost:**
- 100+ `calculatePropertyGrowth()` calls from useChartDataGenerator
- 100+ `calculatePropertyGrowthWithEvents()` calls from useRoadmapData
- **Total: 200+ growth calculations for identical data**

---

### 4. 🔗 RetirementSnapshot Uses Two Inconsistent Sources
**File:** `src/components/RetirementSnapshot.tsx` (lines 102-138)

**Code:**
```typescript
const { years } = useRoadmapData()  // Get year structure from roadmap
const { cashflowData } = useChartDataGenerator()  // Get cashflow from charts

// Comment: "Use cashflow from useChartDataGenerator for consistency"
```

**Problem:**
- If useRoadmapData and useChartDataGenerator calculate year structure differently
- They WILL show different data
- Comment acknowledges this risk but doesn't fix it

**Likelihood:** HIGH
- Both independently process timelineProperties
- Different code paths → different edge case handling
- No validation that they match

---

## What Happens When You Add a New Dashboard Chart?

Assuming new component calls `useChartDataGenerator()`:

### Current Behavior:
```
Dashboard renders
  ├─ useChartDataGenerator() executes
  │   ├─ portfolioGrowthData useMemo: 170+ lines
  │   │   ├─ calculateExistingPortfolioMetrics()
  │   │   ├─ calculatePortfolioMetrics() [calls calculatePropertyGrowth()]
  │   │   ├─ combineMetrics()
  │   │   └─ getRenovationValueIncrease()
  │   │
  │   ├─ cashflowData useMemo: 200+ lines [HEAVY]
  │   │   ├─ calculateDetailedCashflow() × properties
  │   │   ├─ getPropertyEffectiveRate()
  │   │   └─ event processing
  │   │
  │   └─ monthlyHoldingCost useMemo [REDUNDANT]
  │       └─ calculateDetailedCashflow() [AGAIN!]
  │
  └─ New component renders with chart data

RetirementSnapshot also renders
  ├─ useRoadmapData() executes [DUPLICATE WORK]
  │   ├─ calculatePropertyGrowthWithEvents() [SAME AS ABOVE!]
  │   ├─ Portfolio assembly [SAME AS ABOVE!]
  │   └─ Year structure building
  │
  └─ RetirementSnapshot renders
```

### Redundancy:
- **Actual unique calculations:** ~50-100
- **Redundant calculations:** ~150-200
- **Efficiency:** ~25-30% (70% wasted)

---

## Root Cause: Missing Abstraction Layer

**Current architecture:**
```
Context Data
  ↓
[5 independent hooks]
  ├─ useAffordabilityCalculator
  ├─ useChartDataGenerator
  ├─ useRoadmapData
  ├─ usePerPropertyTracking
  └─ useFinancialFreedomProjection
  ↓
Components
```

**What's missing:**
```
Context Data
  ↓
[Calculation Engine - Single Source]
  ├─ timelineProperties (from useAffordabilityCalculator)
  ├─ portfolioMetrics cache
  ├─ cashflow cache
  └─ growth calculations cache
  ↓
[Consumer Hooks - Format Output]
  ├─ useChartDataGenerator → reads cache, formats for charts
  ├─ useRoadmapData → reads cache, formats for roadmap
  └─ usePerPropertyTracking → reads cache, formats per-property
  ↓
Components
```

---

## Files Containing Duplication

### Duplicate Growth Calculation:
- `src/utils/metricsCalculator.ts` (line 10): `calculatePropertyGrowth()`
- `src/hooks/useRoadmapData.ts` (line 41): `calculatePropertyGrowthWithEvents()` ← DUPLICATE

### Redundant Cashflow:
- `src/hooks/useChartDataGenerator.ts` (line 377): First calculation
- `src/hooks/useChartDataGenerator.ts` (line 518): Second calculation ← REDUNDANT

### Multiple Independent Paths:
- `src/hooks/useChartDataGenerator.ts` (lines 104-494): Full calculation
- `src/hooks/useRoadmapData.ts` (lines 183+): Same calculation ← INDEPENDENT

### Synchronization Risk:
- `src/components/RetirementSnapshot.tsx` (lines 102-138): Uses both sources

---

## Recommended Priority 1 Fix (Quick Win)

**Eliminate the duplicate calculateDetailedCashflow() call in monthlyHoldingCost:**

### Current Code (useChartDataGenerator.ts lines 509-530):
```typescript
const monthlyHoldingCost = useMemo(() => {
  const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');
  const byProperty = feasibleProperties.map(property => {
    const propertyInstance = getInstance(property.instanceId);
    if (!propertyInstance) return { ... };

    // THIS RECALCULATES calculateDetailedCashflow FOR EACH PROPERTY
    const breakdown = calculateDetailedCashflow(propertyInstance, property.loanAmount);
    return {
      propertyTitle: property.title,
      monthlyCost: Math.round(breakdown.netWeeklyCashflow * 52 / 12),
      instanceId: property.instanceId,
    };
  });
  // ...
}, [timelineProperties, cashflowData, getInstance]);
```

### What Should Happen:
The cashflow was ALREADY calculated in the `cashflowData` useMemo (line 377-494).
Just extract the final year's per-property breakdown from existing calculations.

### Estimated Savings:
- 100+ redundant function calls per render
- No change to external API or component behavior

---

## Recommended Priority 2 Fix (Medium Effort, High Impact)

**Merge duplicate property growth calculations:**

### Current:
```
metricsCalculator.calculatePropertyGrowth()
  └─ Used by: useChartDataGenerator, calculatePortfolioMetrics

useRoadmapData.calculatePropertyGrowthWithEvents()
  └─ Used by: useRoadmapData (independently)
```

### Refactor To:
```
metricsCalculator.calculatePropertyGrowthWithEvents()
  ├─ Input: initialValue, periods, growthCurve, eventBlocks, basePeriod
  ├─ Output: grown value
  └─ Used by: useChartDataGenerator, useRoadmapData, calculatePortfolioMetrics
```

### Benefit:
- Single algorithm for growth calculation
- Easier to maintain (change once, everywhere updates)
- Ensures consistency

---

## Testing the Duplication Risk

### Scenario: Change Profile Growth Rate

1. Open Dashboard (loads useChartDataGenerator + useRoadmapData)
2. Update profile.growthCurve to { year1: 13%, years2to3: 11%, ... }
3. Monitor component re-renders and calculation calls

**Current Behavior:**
- useChartDataGenerator.portfolioGrowthData useMemo re-runs: 170+ lines
- useRoadmapData useMemo re-runs: Full calculation
- **Both process identical timelineProperties with different code paths**

**Problem Manifestation:**
If growth curve handling differs between hooks:
- Portfolio values diverge
- Charts show different numbers than roadmap
- RetirementSnapshot shows inconsistent data

---

## Summary: Risk Levels

| Issue | Location | Severity | Likelihood | Impact |
|-------|----------|----------|-----------|--------|
| Duplicate growth calc | metricsCalculator + useRoadmapData | CRITICAL | HIGH | Wrong numbers if logic diverges |
| Redundant cashflow | useChartDataGenerator line 377 + 518 | HIGH | IMMEDIATE | 100+ wasted calls/render |
| Independent portfolio paths | useChartDataGenerator + useRoadmapData | HIGH | HIGH | Inconsistency between charts/roadmap |
| Sync risk | RetirementSnapshot using 2 sources | MEDIUM | HIGH | Data divergence over time |
| Different algorithms | usePerPropertyTracking vs useChartDataGenerator | MEDIUM | MEDIUM | Per-property totals won't match aggregates |

---

## Next Steps

1. **Review** `CALCULATION_ARCHITECTURE_ANALYSIS.md` for deep dive
2. **Review** `DEPENDENCY_MAP.txt` for visual dependency chain
3. **Decide** whether to fix Priority 1 (quick) or refactor entire layer (big effort, big payoff)
4. **Test** hypothesis: Add console.log to `calculatePropertyGrowth()` and count calls before/after fixing monthlyHoldingCost
