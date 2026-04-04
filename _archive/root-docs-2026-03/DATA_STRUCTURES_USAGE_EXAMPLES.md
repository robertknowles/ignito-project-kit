# PropPath Data Structures - Usage Examples

Real code examples showing how to access and use available data for new visualizations.

---

## 1. Using useChartDataGenerator Data

### Example: Building a Portfolio Growth Chart

```typescript
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator';

export const MyPortfolioChart = () => {
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator();

  // Access portfolio value over time
  const chartData = portfolioGrowthData.map(point => ({
    year: point.year,
    value: point.portfolioValue,
    equity: point.equity,
    debt: point.totalDebt,
    doNothing: point.doNothingBalance,
  }));

  return (
    <LineChart data={chartData}>
      <Line dataKey="value" name="Portfolio Value" />
      <Line dataKey="doNothing" name="Do-Nothing Baseline" />
    </LineChart>
  );
};
```

### Example: Cashflow Breakdown

```typescript
const { cashflowData } = useChartDataGenerator();

// Year 5 cashflow details
const year5 = cashflowData.find(d => d.year === '2030');

console.log({
  netCashflow: year5?.cashflow,        // e.g., 45000
  rent: year5?.rentalIncome,           // e.g., 80000
  expenses: year5?.expenses,           // e.g., 25000
  loanPayments: year5?.loanRepayments, // e.g., 10000
});
```

### Example: Available Funds Tracking

```typescript
const { portfolioGrowthData } = useChartDataGenerator();

const availableFundsTimeline = portfolioGrowthData.map(point => ({
  year: point.year,
  funds: point.availableFunds,           // Total available capital
  debt: point.totalDebt,                 // Total loan balance
  borrowingCapacity: point.borrowingCapacity, // Remaining capacity
}));
```

---

## 2. Using Financial Freedom Projection

### Example: Freedom Timeline Panel

```typescript
import { useFinancialFreedomProjection } from '@/hooks/useFinancialFreedomProjection';
import { useChartDataGenerator } from '@/hooks/useChartDataGenerator';

export const FreedomTimelinePanel = () => {
  const { portfolioGrowthData, cashflowData } = useChartDataGenerator();
  const { profile } = useInvestmentProfile();
  const { timelineProperties } = useAffordabilityCalculator();

  const projection = useFinancialFreedomProjection({
    portfolioGrowthData,
    cashflowData,
    profile,
    timelineProperties,
  });

  return (
    <div>
      <h2>Financial Freedom Timeline</h2>

      {/* Show target year */}
      {projection.freedomYear && (
        <p>
          Target income reached in {projection.freedomYear}
          ({projection.freedomYearIndex} years from now)
        </p>
      )}

      {/* Show milestones */}
      <ul>
        {projection.milestones.map(m => (
          <li key={m.year}>
            {m.year}: {m.label}
          </li>
        ))}
      </ul>

      {/* Show 30-year projection */}
      <Table>
        <thead>
          <tr>
            <th>Year</th>
            <th>Net Cashflow</th>
            <th>Debt</th>
            <th>Portfolio Value</th>
            <th>Phase</th>
          </tr>
        </thead>
        <tbody>
          {projection.yearlyData.map(row => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>${row.netCashflow.toLocaleString()}</td>
              <td>${row.totalDebt.toLocaleString()}</td>
              <td>${row.portfolioValue.toLocaleString()}</td>
              <td>{row.isPiPhase ? 'P&I' : 'IO'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
```

### Example: Debt Paydown Schedule

```typescript
const { yearlyData, piTransitionYear, debtFreeYear } = projection;

// Filter to P&I phase only
const piPhaseData = yearlyData.filter(y => y.isPiPhase);

// Show year-by-year debt reduction
const debtReduction = piPhaseData.map(y => ({
  year: y.year,
  principalPaid: y.year === piTransitionYear
    ? piPhaseData[0].totalDebt - piPhaseData[1].totalDebt
    : y.totalDebt, // Simplified
  remainingDebt: y.totalDebt,
}));

console.log(`Debt free in ${debtFreeYear}`);
```

---

## 3. Property Instance Details

### Example: Detailed Property Cashflow

```typescript
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { calculateDetailedCashflow } from '@/utils/detailedCashflowCalculator';

export const PropertyCashflowCard = ({ propertyInstanceId }: Props) => {
  const { getInstance } = usePropertyInstance();
  const propertyInstance = getInstance(propertyInstanceId);

  if (!propertyInstance) return null;

  // Get cashflow from property instance
  const breakdown = calculateDetailedCashflow(propertyInstance, propertyInstance.loanAmount);

  return (
    <Card>
      <h3>{propertyInstance.state} - {propertyInstance.purchasePrice}</h3>

      <Section title="Income">
        <Row label="Weekly Rent" value={breakdown.weeklyRent} />
        <Row label="Annual (gross)" value={breakdown.grossAnnualIncome} />
        <Row label="Vacancy Allowance" value={-breakdown.vacancyAmount} />
        <Row label="Adjusted Income" value={breakdown.adjustedIncome} />
      </Section>

      <Section title="Operating Expenses">
        <Row label="Loan Interest" value={-breakdown.loanInterest} />
        <Row label="Management" value={-breakdown.propertyManagementFee} />
        <Row label="Insurance" value={-breakdown.buildingInsurance} />
        <Row label="Council/Water" value={-breakdown.councilRatesWater} />
        <Row label="Strata" value={-breakdown.strata} />
        <Row label="Maintenance" value={-breakdown.maintenance} />
        <Row label="Subtotal" value={-breakdown.totalOperatingExpenses} />
      </Section>

      <Section title="Non-Deductible">
        <Row label="Land Tax" value={-breakdown.landTax} />
        <Row label="Principal" value={-breakdown.principalPayments} />
        <Row label="Subtotal" value={-breakdown.totalNonDeductibleExpenses} />
      </Section>

      <Section title="Deductions">
        <Row label="Potential Deductions" value={breakdown.potentialDeductions} />
      </Section>

      <Section title="Net Cashflow" highlight>
        <Row label="Annual" value={breakdown.netAnnualCashflow} />
        <Row label="Monthly" value={breakdown.netMonthlyCashflow} />
        <Row label="Weekly" value={breakdown.netWeeklyCashflow} />
      </Section>
    </Card>
  );
};
```

### Example: Property Growth Assumption

```typescript
const propertyInstance = getInstance(propertyInstanceId);

console.log({
  growthTier: propertyInstance.growthAssumption,  // 'High' | 'Medium' | 'Low'
  rentPerWeek: propertyInstance.rentPerWeek,
  interestRate: propertyInstance.interestRate,    // e.g., 6.5
  loanProduct: propertyInstance.loanProduct,      // 'IO' or 'PI'
  lvr: propertyInstance.lvr,                      // 0-100
  state: propertyInstance.state,                  // 'NSW', 'VIC', etc.
});
```

---

## 4. Event System Usage

### Example: Refinance Impact

```typescript
import { getPropertyEffectiveRate } from '@/utils/eventProcessing';
import { usePropertySelection } from '@/contexts/PropertySelectionContext';

export const RefinanceImpactChart = ({ propertyInstanceId }: Props) => {
  const { eventBlocks } = usePropertySelection();

  // Show interest rate over time
  const rateHistory = [];
  for (let period = 1; period <= 20; period++) {
    const effectiveRate = getPropertyEffectiveRate(
      period,
      eventBlocks,
      propertyInstanceId,
      0.065 // base rate 6.5%
    );

    rateHistory.push({
      period,
      year: 2025 + Math.floor(period / 2),
      rate: (effectiveRate * 100).toFixed(2) + '%',
    });
  }

  return <LineChart data={rateHistory} />;
};
```

### Example: Renovation Value Impact

```typescript
import { getRenovationValueIncrease } from '@/utils/eventProcessing';

const { portfolioGrowthData } = useChartDataGenerator();
const { eventBlocks } = usePropertySelection();

const enhancedData = portfolioGrowthData.map((point, index) => {
  const year = 2025 + index;
  const periods = index * 2;

  const renovationIncrease = getRenovationValueIncrease(
    propertyInstanceId,
    periods,
    eventBlocks
  );

  return {
    ...point,
    basePortfolioValue: point.portfolioValue - renovationIncrease,
    renovationValue: renovationIncrease,
  };
});
```

### Example: Market Correction Effects

```typescript
import { getGrowthRateAdjustment } from '@/utils/eventProcessing';

const { eventBlocks } = usePropertySelection();

// Check what growth adjustment applies at period 6 (Year 3)
const adjustmentAtPeriod6 = getGrowthRateAdjustment(6, eventBlocks);

console.log(
  `Growth rate reduced by ${(adjustmentAtPeriod6 * 100).toFixed(1)}% at period 6`
);
```

---

## 5. Timeline Properties Access

### Example: Show All Properties in Timeline

```typescript
import { useAffordabilityCalculator } from '@/hooks/useAffordabilityCalculator';

export const TimelinePropertyList = () => {
  const { timelineProperties } = useAffordabilityCalculator();

  const feasibleProperties = timelineProperties.filter(p => p.status === 'feasible');

  return (
    <div>
      {feasibleProperties.map(property => (
        <PropertyCard key={property.instanceId}>
          <h3>{property.title}</h3>
          <p>Period: {property.displayPeriod}</p>
          <p>Cost: ${property.cost.toLocaleString()}</p>
          <p>Loan: ${property.loanAmount.toLocaleString()}</p>
          <p>Deposit: ${property.depositRequired.toLocaleString()}</p>

          <h4>Cashflow (Period-Specific)</h4>
          <p>Rental Income: ${property.grossRentalIncome.toLocaleString()}</p>
          <p>Expenses: ${property.expenses.toLocaleString()}</p>
          <p>Loan Interest: ${property.loanInterest.toLocaleString()}</p>
          <p>Net: ${property.netCashflow.toLocaleString()}</p>

          <h4>Funding Breakdown</h4>
          <ul>
            <li>Cash: ${property.fundingBreakdown.cash.toLocaleString()}</li>
            <li>Savings: ${property.fundingBreakdown.savings.toLocaleString()}</li>
            <li>Equity: ${property.fundingBreakdown.equity.toLocaleString()}</li>
          </ul>

          <h4>Balances After Purchase</h4>
          <ul>
            <li>Cash Remaining: ${property.balancesAfterPurchase.cash.toLocaleString()}</li>
            <li>Savings Remaining: ${property.balancesAfterPurchase.savings.toLocaleString()}</li>
            <li>Equity Used: ${property.balancesAfterPurchase.equityUsed.toLocaleString()}</li>
          </ul>
        </PropertyCard>
      ))}
    </div>
  );
};
```

---

## 6. Metrics Calculation

### Example: Property Growth Over Time

```typescript
import { calculatePropertyGrowth } from '@/utils/metricsCalculator';
import { getGrowthCurveFromAssumption } from '@/utils/propertyInstanceDefaults';

const propertyInstance = getInstance(propertyInstanceId);

// Get growth curve based on assumption
const growthCurve = propertyInstance.growthAssumption
  ? getGrowthCurveFromAssumption(propertyInstance.growthAssumption)
  : defaultGrowthCurve;

// Show value at each year
const growthProjection = [];
for (let period = 0; period <= 16; period += 2) {
  const value = calculatePropertyGrowth(
    propertyInstance.purchasePrice,
    period,
    growthCurve
  );

  growthProjection.push({
    year: 2025 + (period / 2),
    value: value,
  });
}
```

### Example: Portfolio Metrics at Snapshot

```typescript
import {
  calculatePortfolioMetrics,
  calculateExistingPortfolioMetrics,
  combineMetrics,
} from '@/utils/metricsCalculator';

const newPurchasesMetrics = calculatePortfolioMetrics(
  purchases,
  2030,
  0.06,        // baseGrowthRate
  growthCurve,
  0.065        // interestRate
);

const existingMetrics = calculateExistingPortfolioMetrics(
  portfolioValue,
  currentDebt,
  5,           // yearsGrown
  0.03,        // growthRate (flat for existing)
  growthCurve
);

const totalMetrics = combineMetrics(newPurchasesMetrics, existingMetrics);

console.log({
  portfolioValue: totalMetrics.portfolioValue,
  totalEquity: totalMetrics.totalEquity,
  totalDebt: totalMetrics.totalDebt,
  annualCashflow: totalMetrics.annualCashflow,
});
```

---

## 7. Monthly Holding Cost Breakdown

### Example: Per-Property Monthly Costs

```typescript
const { monthlyHoldingCost } = useChartDataGenerator();

return (
  <div>
    <h2>Monthly Holding Costs</h2>
    <p>Total Portfolio: ${monthlyHoldingCost.total.toLocaleString()}</p>

    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Monthly Cost</th>
        </tr>
      </thead>
      <tbody>
        {monthlyHoldingCost.byProperty.map(item => (
          <tr key={item.instanceId}>
            <td>{item.propertyTitle}</td>
            <td>${item.monthlyCost.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

---

## 8. Net Worth Trajectory

### Example: Assets vs Debt vs Net Worth

```typescript
const { netWorthData } = useChartDataGenerator();

// Data ready for chart
const chartData = netWorthData.map(point => ({
  year: point.year,
  assets: point.totalAssets,
  debt: point.totalDebt,
  netWorth: point.netWorth,
}));

return (
  <AreaChart data={chartData}>
    <Area dataKey="assets" stackId="1" name="Total Assets" fill="#82ca9d" />
    <Area dataKey="debt" stackId="1" name="Total Debt" fill="#ffc658" />
    <Line dataKey="netWorth" name="Net Worth" stroke="#8884d8" />
  </AreaChart>
);
```

---

## 9. Do-Nothing Baseline Comparison

### Example: Investment vs Savings

```typescript
const { portfolioGrowthData } = useChartDataGenerator();

const comparisonData = portfolioGrowthData.map(point => ({
  year: point.year,
  investment: point.portfolioValue,
  doNothing: point.doNothingBalance,
  difference: point.portfolioValue - (point.doNothingBalance || 0),
}));

return (
  <ComboChart data={comparisonData}>
    <Line dataKey="investment" name="Property Investment" />
    <Line dataKey="doNothing" name="Pure Savings" />
    <Bar dataKey="difference" name="Investment Benefit" />
  </ComboChart>
);
```

---

## 10. Refinance vs Original Rate Impact

### Example: Compare Loan Costs

```typescript
const originalRate = 0.065;  // 6.5%
const { eventBlocks } = usePropertySelection();

let totalOriginalInterest = 0;
let totalRefinancedInterest = 0;

for (let period = 1; period <= 20; period++) {
  const effectiveRate = getPropertyEffectiveRate(
    period,
    eventBlocks,
    propertyInstanceId,
    originalRate
  );

  const loanBalance = 500000; // simplified

  totalOriginalInterest += loanBalance * originalRate;
  totalRefinancedInterest += loanBalance * effectiveRate;
}

const savings = totalOriginalInterest - totalRefinancedInterest;
console.log(`Refinance saves: $${savings.toLocaleString()}`);
```

---

## Key Integration Points

1. **Always call hooks unconditionally** (React rules)
2. **Filter data by status** before using (feasible vs challenging)
3. **Round numbers** for display (most data comes pre-rounded)
4. **Check for nulls** (freedomYear, piTransitionYear can be null if never reached)
5. **Use instanceId not id** for property identification across contexts
6. **Events affect periods**, not years directly (period = years × 2)

