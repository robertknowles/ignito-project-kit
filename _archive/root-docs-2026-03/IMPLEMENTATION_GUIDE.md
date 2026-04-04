# Dashboard Visualization Implementation Guide

Step-by-step guide for wiring new chart components into the data pipeline.

---

## Overview

PropPath uses a three-layer data architecture:

```
Raw Input Data (Contexts, Profiles, Properties)
    ↓
Data Hooks (useChartDataGenerator, useFinancialFreedomProjection)
    ↓
Visualization Components (Charts, Tables, Panels)
```

All new visualizations should consume data from hooks, never calculate directly.

---

## Decision Tree: Which Hook Do I Need?

```
Do you need annual portfolio/cashflow data?
├─ YES → useChartDataGenerator()
│   └─ Returns: portfolioGrowthData[], cashflowData[], netWorthData[], monthlyHoldingCost
└─ NO
    └─ Do you need 30-year financial freedom projection?
        ├─ YES → useFinancialFreedomProjection()
        │   └─ Returns: yearlyData[], milestones, freedomYear, piTransitionYear, debtFreeYear
        └─ NO
            └─ Do you need per-property details (39 fields)?
                ├─ YES → getInstance(instanceId) from PropertyInstanceContext
                │   └─ Returns: PropertyInstanceDetails (use with calculateDetailedCashflow)
                └─ NO
                    └─ Do you need timeline property data?
                        ├─ YES → useAffordabilityCalculator().timelineProperties
                        │   └─ Returns: TimelineProperty[] with 100+ fields
                        └─ NO
                            └─ Do you need event impacts (refinance, renovation)?
                                ├─ YES → Use eventProcessing utilities
                                │   └─ getPropertyEffectiveRate(), getRenovationValueIncrease()
                                └─ NO
                                    └─ Do you need metric calculations?
                                        └─ YES → Use metricsCalculator exports
                                            └─ calculatePortfolioMetrics(), combineMetrics()
```

---

## Implementation Workflow

### Step 1: Define Component Props & Data Needs

```typescript
interface MyChartProps {
  // Pass minimal props - derive everything from hooks
  title?: string;
  height?: number;
}

export const MyChart: React.FC<MyChartProps> = ({ title = "My Chart" }) => {
  // What data do you need?
  // ONLY import what the component actually displays
```

### Step 2: Import Required Hooks

```typescript
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator';
// OR
import { useFinancialFreedomProjection } from '@/hooks/useFinancialFreedomProjection';
// OR
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
// OR combinations of above
```

### Step 3: Call Hooks (Unconditionally)

```typescript
export const MyChart: React.FC<MyChartProps> = ({ title }) => {
  // ✅ CORRECT: Call unconditionally (React rule)
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator();

  // ❌ WRONG: Conditional calls break hooks
  // if (showChart) {
  //   const data = useChartDataGenerator();
  // }

  // Optional: Process data (if needed)
  const processedData = useMemo(() => {
    return portfolioGrowthData.map(point => ({
      year: parseInt(point.year),
      value: point.portfolioValue,
    }));
  }, [portfolioGrowthData]);

  return <LineChart data={processedData} title={title} />;
};
```

### Step 4: Map Data to Chart Format

```typescript
// Transform hook output to chart library format
const chartData = useMemo(() => {
  return portfolioGrowthData.map(point => ({
    // X-axis
    year: point.year,

    // Y-axis values
    value: point.portfolioValue,
    equity: point.equity,
    debt: point.totalDebt,

    // Metadata (for tooltips, etc.)
    properties: point.properties?.join(', '),
  }));
}, [portfolioGrowthData]);
```

### Step 5: Render Component

```typescript
return (
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="year" />
      <YAxis />
      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
      <Legend />
      <Line type="monotone" dataKey="value" stroke="#8884d8" name="Portfolio Value" />
      <Line type="monotone" dataKey="debt" stroke="#82ca9d" name="Total Debt" />
    </LineChart>
  </ResponsiveContainer>
);
```

---

## Common Patterns

### Pattern 1: Year-Level Data

**When:** You need annual snapshots (most common)

**Data Source:** `useChartDataGenerator()`

**Implementation:**
```typescript
const { portfolioGrowthData } = useChartDataGenerator();

// Already aggregated to annual level
portfolioGrowthData.forEach(point => {
  console.log(point.year);      // "2025", "2026", etc.
  console.log(point.portfolioValue); // Annual value
});
```

### Pattern 2: Monthly Granularity

**When:** You need monthly data

**Implementation:**
```typescript
const { cashflowData } = useChartDataGenerator();

// Convert annual to monthly
const monthlyData = [];
cashflowData.forEach((point, index) => {
  const baseMonth = (index * 12) + 1;
  for (let m = 0; m < 12; m++) {
    monthlyData.push({
      month: baseMonth + m,
      value: point.cashflow / 12,
    });
  }
});
```

### Pattern 3: Property-Specific Data

**When:** You need details for one property

**Implementation:**
```typescript
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { calculateDetailedCashflow } from '@/utils/detailedCashflowCalculator';

export const PropertyDetails = ({ instanceId }: Props) => {
  const { getInstance } = usePropertyInstance();
  const property = getInstance(instanceId);

  if (!property) return <div>Property not found</div>;

  const cashflow = calculateDetailedCashflow(property, property.loanAmount);

  return (
    <div>
      <h3>{property.state}</h3>
      <p>Monthly: ${cashflow.netMonthlyCashflow.toLocaleString()}</p>
    </div>
  );
};
```

### Pattern 4: Long-Term Projection

**When:** You need 30-year freedom timeline

**Implementation:**
```typescript
const { portfolioGrowthData, cashflowData } = useChartDataGenerator();
const { profile } = useInvestmentProfile();
const { timelineProperties } = useAffordabilityCalculator();

const projection = useFinancialFreedomProjection({
  portfolioGrowthData,
  cashflowData,
  profile,
  timelineProperties,
});

if (projection.freedomYear) {
  console.log(`Financial freedom in ${projection.freedomYear}`);
}
```

### Pattern 5: Event-Adjusted Rates

**When:** Refinance or market corrections affect calculations

**Implementation:**
```typescript
import { getPropertyEffectiveRate } from '@/utils/eventProcessing';

const { eventBlocks } = usePropertySelection();

// Get rate at a specific period
const rate = getPropertyEffectiveRate(
  period,           // 1-8 (6-month periods)
  eventBlocks,
  propertyInstanceId,
  0.065             // base rate
);
```

---

## Data Transformation Checklist

Before rendering, verify:

- [ ] **Nulls handled?** Check optional fields
  - `point.doNothingBalance` can be undefined
  - `freedomYear` can be null
  - `point.properties` can be undefined

- [ ] **Types correct?** All hook returns are typed
  - Don't cast to `any`
  - Use TypeScript inference when possible

- [ ] **Rounding consistent?** Data is pre-rounded
  - Don't round again (creates double-rounding)
  - Exceptions: `year` field (string), calculated percentages

- [ ] **Units correct?** Verify currency/percentage
  - `portfolioValue`: dollars (not thousands)
  - `year`: string ("2025"), not number
  - Interest rates: decimal (0.065), not percent (6.5)

- [ ] **Filtering applied?** Get feasible only
  ```typescript
  const feasible = timelineProperties.filter(p => p.status === 'feasible');
  ```

- [ ] **Dependencies captured?** useMemo deps correct
  ```typescript
  useMemo(() => {
    // ...
  }, [portfolioGrowthData, cashflowData]); // Include all external data
  ```

---

## File Structure for New Visualization

```
src/components/
├── MyNewChart.tsx           (Component file)
├── MyNewChart.stories.tsx   (Storybook test)
├── useMyChartData.ts        (Optional: Custom hook if complex)
└── MyNewChart.test.tsx      (Unit tests)
```

**MyNewChart.tsx:**
```typescript
import React, { useMemo } from 'react';
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator';

interface MyNewChartProps {
  title?: string;
  height?: number;
}

export const MyNewChart: React.FC<MyNewChartProps> = ({
  title = "My New Chart",
  height = 300,
}) => {
  const { portfolioGrowthData } = useChartDataGenerator();

  const chartData = useMemo(() => {
    return portfolioGrowthData.map(point => ({
      year: point.year,
      value: point.portfolioValue,
    }));
  }, [portfolioGrowthData]);

  return (
    <div>
      <h2>{title}</h2>
      {/* Render your chart */}
    </div>
  );
};

export default MyNewChart;
```

---

## Integration with Dashboard

### Add to Dashboard Component

**Location:** `src/components/Dashboard.tsx`

```typescript
import { MyNewChart } from './MyNewChart';

export const Dashboard = () => {
  // ... existing code ...

  return (
    <div className="h-full w-full overflow-y-auto bg-[#f9fafb]">
      <div className="flex flex-col gap-4 px-12 pt-4">

        {/* Existing sections */}

        {/* Add your new chart */}
        <ChartCard title="My New Chart">
          <MyNewChart />
        </ChartCard>

      </div>
    </div>
  );
};
```

### Wrap with ChartCard

```typescript
import { ChartCard } from '@/components/ui/ChartCard';

<ChartCard
  title="My Chart Title"
  legend={[
    { color: '#8884d8', label: 'Portfolio Value' },
    { color: '#82ca9d', label: 'Equity' },
  ]}
  contentClassName="p-4"
>
  <MyNewChart />
</ChartCard>
```

---

## Scenario Support (Optional)

If your visualization needs to support multi-scenario mode:

```typescript
import { useMultiScenario } from '@/contexts/MultiScenarioContext';
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator';

export const MyScenarioAwareChart = () => {
  const { scenarios, activeScenarioId } = useMultiScenario();

  // Generate data for each scenario
  const scenarioDataA = scenarios[0] ? getScenarioData(scenarios[0]) : undefined;
  const scenarioDataB = scenarios[1] ? getScenarioData(scenarios[1]) : undefined;

  const chartDataA = useChartDataGenerator(scenarioDataA);
  const chartDataB = useChartDataGenerator(scenarioDataB);

  // Render comparison
  return (
    <div>
      <LineChart data={chartDataA.portfolioGrowthData} />
      {scenarios.length > 1 && <LineChart data={chartDataB.portfolioGrowthData} />}
    </div>
  );
};
```

---

## Testing Your Visualization

### Unit Test Template

```typescript
import { render, screen } from '@testing-library/react';
import { MyNewChart } from './MyNewChart';

// Mock hook
jest.mock('@/hooks/useChartDataGenerator', () => ({
  useChartDataGenerator: () => ({
    portfolioGrowthData: [
      { year: '2025', portfolioValue: 500000, equity: 100000 },
      { year: '2026', portfolioValue: 550000, equity: 150000 },
    ],
    cashflowData: [],
  }),
}));

describe('MyNewChart', () => {
  it('renders chart with data', () => {
    render(<MyNewChart title="Test Chart" />);
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });
});
```

---

## Performance Considerations

### Use useMemo for Expensive Calculations

```typescript
const processedData = useMemo(() => {
  // Expensive transformation
  return portfolioGrowthData
    .filter(p => p.portfolioValue > 0)
    .map(p => ({
      year: parseInt(p.year),
      value: p.portfolioValue,
    }));
}, [portfolioGrowthData]); // Only recalculate if portfolioGrowthData changes
```

### Avoid Unnecessary Re-renders

```typescript
interface ChartProps {
  // Stable object reference - memoize if passed from parent
  data: PortfolioGrowthDataPoint[];
}

export const MyChart = React.memo(({ data }: ChartProps) => {
  // Component only re-renders if `data` reference changes
});
```

### Lazy Load Large Datasets

```typescript
const { portfolioGrowthData } = useChartDataGenerator();

// If data has 100+ points, consider pagination
const visibleData = useMemo(() => {
  return portfolioGrowthData.slice(0, 20); // Show first 20 years
}, [portfolioGrowthData]);
```

---

## Common Pitfalls & Solutions

| Issue | Problem | Solution |
|-------|---------|----------|
| Stale data | Component doesn't update when scenarios switch | Ensure hook dependencies include all data sources |
| Type errors | `Cannot read property 'year' of undefined` | Check for null/undefined: `point?.year ?? 'N/A'` |
| Wrong data | Using annual data for monthly chart | Use `cashflowData` for detail, only aggregate if needed |
| Performance | Chart re-renders on every keystroke | Wrap hook call in `useMemo` with proper deps |
| Scenario mismatch | Scenario A chart shows Scenario B data | Use `getScenarioData()` helper from Dashboard |
| Event impacts missing | Refinance/renovation not affecting chart | Events already baked into hook output (no extra step needed) |
| Null milestones | `freedomYear` is null but chart crashes | Always check: `if (freedomYear) { ... }` |

---

## References

- **Full Data Spec:** `DATA_STRUCTURES_REFERENCE.md`
- **Quick Lookup:** `DATA_STRUCTURES_QUICK_REFERENCE.md`
- **Code Examples:** `DATA_STRUCTURES_USAGE_EXAMPLES.md`
- **Hook Source:** `src/hooks/useChartDataGenerator.ts`
- **Freedom Projection:** `src/hooks/useFinancialFreedomProjection.ts`
- **Component Examples:** `src/components/` (PortfolioGrowthChart, CashflowChart, NetWorthChart)

---

## Checklist: Ready to Implement?

- [ ] Identified which hook(s) you need
- [ ] Understood the data structure of each field
- [ ] Mapped transformation from hook output to chart format
- [ ] Handled null/undefined cases
- [ ] Added TypeScript types
- [ ] Created test mocks
- [ ] Integrated into Dashboard.tsx
- [ ] Wrapped with ChartCard component
- [ ] Tested with real scenarios
- [ ] Verified performance with large datasets
