# Building the Stacked Funding-Source Chart

## Quick Start

The data for a stacked funding-source chart already exists. You just need to build the visualization.

## Data Access

```typescript
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';

export const FundingSourceChart: React.FC = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  
  // Filter for purchased properties only
  const purchasedProperties = timelineProperties.filter(
    p => p.affordableYear !== Infinity
  );
  
  // Extract chart data
  const chartData = purchasedProperties.map(prop => ({
    propertyTitle: prop.title,
    displayPeriod: prop.displayPeriod,
    cost: prop.cost,
    cash: prop.fundingBreakdown.cash,
    savings: prop.fundingBreakdown.savings,
    equity: prop.fundingBreakdown.equity,
    total: prop.fundingBreakdown.total,
  }));
  
  return (
    <BarChart data={chartData}>
      {/* Chart configuration */}
    </BarChart>
  );
};
```

## Data Shape Example

```typescript
[
  {
    propertyTitle: "House A",
    displayPeriod: "2025 H1",
    cost: 550000,
    cash: 0,
    savings: 0,
    equity: 82500,  // (deposit + costs = $82.5k)
    total: 82500
  },
  {
    propertyTitle: "Apartment B",
    displayPeriod: "2025 H2",
    cost: 420000,
    cash: 31500,    // remaining cash
    savings: 31500, // 1 year of savings
    equity: 19500,  // (deposit + costs = $82.5k)
    total: 82500
  },
  {
    propertyTitle: "House C",
    displayPeriod: "2026 H1",
    cost: 650000,
    cash: 0,        // cash exhausted
    savings: 25000, // savings accumulated
    equity: 82500,  // (deposit + costs = $107.5k)
    total: 107500
  }
]
```

## Chart Variants

### Option 1: Absolute Stacked Bar Chart
**Best for:** Showing total funding required per property

```
Property A: [======Equity=====|=Savings=]
Property B: [==Cash==|==Savings==|====Equity====]
Property C: [==Savings==|==============Equity=================]
```

Implementation with Recharts:
```typescript
<BarChart data={chartData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="propertyTitle" />
  <YAxis label={{ value: 'Funding ($)', angle: -90, position: 'insideLeft' }} />
  <Tooltip />
  <Bar dataKey="cash" stackId="a" fill="#9CA3AF" name="Cash" />
  <Bar dataKey="savings" stackId="a" fill="#3B82F6" name="Savings" />
  <Bar dataKey="equity" stackId="a" fill="#10B981" name="Equity" />
</BarChart>
```

### Option 2: 100% Stacked Bar (Proportional)
**Best for:** Seeing funding mix composition

```
Property A: [=====Equity====|=Savings=]  100%
Property B: [Cash|Savings|========Equity========]  100%
Property C: [Savings|==========Equity==========]  100%
```

Implementation:
```typescript
// Normalize values to percentages
const normalizedData = chartData.map(item => ({
  ...item,
  cash: item.total > 0 ? (item.cash / item.total) * 100 : 0,
  savings: item.total > 0 ? (item.savings / item.total) * 100 : 0,
  equity: item.total > 0 ? (item.equity / item.total) * 100 : 0,
}));
```

### Option 3: Running Balance Timeline
**Best for:** Showing how funds deplete over multiple purchases

```
Cash:   [Initial] → Purchase 1 → [Balance] → Purchase 2 → [Balance] → ...
Equity: [Initial] → Purchase 1 → [Balance] → Purchase 2 → [Balance] → ...
Savings: [Initial] → Purchase 1 → [Balance] → Purchase 2 → [Balance] → ...
```

Data for this view:
```typescript
interface BalanceTimeline {
  propertyIndex: number;
  propertyTitle: string;
  displayPeriod: string;
  before: {
    cash: number;
    savings: number;
    equity: number;
  };
  used: {
    cash: number;
    savings: number;
    equity: number;
  };
  after: {
    cash: number;
    savings: number;
    equity: number;
  };
}
```

Get balances from:
```typescript
const balanceTimeline = purchasedProperties.map((prop, idx) => ({
  propertyIndex: idx + 1,
  propertyTitle: prop.title,
  displayPeriod: prop.displayPeriod,
  before: {
    cash: prop.baseDeposit,           // Start-of-year from breakdown
    savings: prop.cumulativeSavings,  // Start-of-year from breakdown
    equity: prop.equityRelease,       // Start-of-year from breakdown
  },
  used: {
    cash: prop.fundingBreakdown.cash,
    savings: prop.fundingBreakdown.savings,
    equity: prop.fundingBreakdown.equity,
  },
  after: {
    cash: prop.balancesAfterPurchase.cash,
    savings: prop.balancesAfterPurchase.savings,
    equity: prop.balancesAfterPurchase.equityUsed,
  }
}));
```

## Color Palette

```typescript
const FUNDING_COLORS = {
  cash: '#9CA3AF',      // Gray-400 (neutral)
  savings: '#3B82F6',   // Blue-500 (primary)
  equity: '#10B981',    // Emerald-500 (success)
};
```

## Tooltip Content

Show detailed breakdown on hover:

```typescript
const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
        <p className="font-semibold text-gray-800">{data.propertyTitle}</p>
        <p className="text-sm text-gray-600">{data.displayPeriod}</p>
        <p className="text-xs text-gray-500 mt-2">Total Required: ${data.total.toLocaleString()}</p>
        {data.cash > 0 && <p className="text-xs text-gray-600">Cash: ${data.cash.toLocaleString()}</p>}
        {data.savings > 0 && <p className="text-xs text-blue-600">Savings: ${data.savings.toLocaleString()}</p>}
        {data.equity > 0 && <p className="text-xs text-emerald-600">Equity: ${data.equity.toLocaleString()}</p>}
      </div>
    );
  }
  return null;
};

// Use in chart:
<Tooltip content={<CustomTooltip />} />
```

## Potential Insights to Surface

The stacked chart can highlight:

1. **Equity-heavy strategy:** Early purchases funded mostly by equity extraction
2. **Self-funding transition:** Later purchases increasingly funded by accumulated savings
3. **Cash depletion:** Initial cash pool used quickly, then reliance on equity/savings
4. **Savings accumulation:** Visible growth in savings segment with each passing year
5. **Affordability risk:** When equity unavailable and savings insufficient

## Integration Points

### 1. Add to CashflowRoadmap component
```typescript
// In CashflowRoadmap.tsx or new FundingAnalysis.tsx
export const FundingSourceChart = () => {
  const { timelineProperties } = useAffordabilityCalculator();
  // ... render chart
};
```

### 2. Add tab in ClientDashboard
```typescript
// New tab next to existing tabs:
<Tab label="Funding Sources">
  <FundingSourceChart />
</Tab>
```

### 3. Add section to property detail modal
```typescript
// Show funding breakdown for selected property:
<div>
  <h3>How This Property Was Funded</h3>
  <StackedBar
    cash={property.fundingBreakdown.cash}
    savings={property.fundingBreakdown.savings}
    equity={property.fundingBreakdown.equity}
  />
</div>
```

## Testing Data

Use this scenario to test:
- Initial deposit: $150,000
- Annual savings: $80,000 (25% usable = $20k/year)
- Existing equity: $400,000
- Properties: 3 houses at $450k, $480k, $520k (all ~20% LVR deposit)

Expected pattern:
- Property 1: ~95% equity, ~5% cash
- Property 2: ~60% equity, ~40% cash+savings (cash depleted)
- Property 3: ~70% equity, ~30% savings (cash exhausted)

## Notes

- Funding data is **calculated per purchase**, not estimated
- **Equity-first allocation** is enforced by the calculator
- Custom events (inheritance, bonuses) modify cash available for later purchases
- The breakdown is **independent of property selection order** (uses chronological purchase periods)
- Chart should update **reactively** when user adjusts profile or adds properties
