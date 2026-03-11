# Per Property Equity Chart Fix

## Issue
The per property equity chart did not match the portfolio growth chart. They were meant to be replicas of one another but showed completely different values.

## Root Cause
The two charts were using **different growth calculation methods**:

### Portfolio Growth Chart (`PortfolioGrowthChart.tsx`)
- Used `calculatePropertyGrowth()` from `metricsCalculator.ts`
- Applied tiered growth rates **per period** (6-month periods)
- Used the profile's `growthCurve` settings
- Formula: Compound growth over periods with rates: Year 1 (12.5%), Years 2-3 (10%), Year 4 (7.5%), Year 5+ (6%)

### Per Property Tracking Chart (BEFORE FIX)
- Applied tiered growth rates directly as **annual rates**
- Used property-specific growth assumptions from `propertyAssumptions`
- Did NOT use period-based calculations
- Simply multiplied by `(1 + annualRate)` each year

## The Problem
The difference in calculation methods resulted in:
- Different compounding frequencies (semi-annual vs annual)
- Different growth rate sources (profile vs property assumptions)
- Inconsistent equity values between the two charts

## Solution
Updated `usePerPropertyTracking.ts` to match the portfolio growth chart calculation:

### Key Changes

1. **Import the unified growth function**
```typescript
import { calculatePropertyGrowth } from '../utils/metricsCalculator';
import { useInvestmentProfile } from './useInvestmentProfile';
```

2. **Use profile's growth curve** (same as portfolio chart)
```typescript
const { profile } = useInvestmentProfile();
const growthCurve = profile.growthCurve;
```

3. **Apply period-based calculation** (same as portfolio chart)
```typescript
for (let year = 1; year <= 10; year++) {
  // Calculate periods held (using same period-based calculation as portfolio chart)
  const periodsHeld = year * PERIODS_PER_YEAR;
  
  // Use the same growth calculation as portfolio growth chart
  const currentPropertyValue = calculatePropertyGrowth(purchasePrice, periodsHeld, growthCurve);
  // ...
}
```

## How It Works Now

Both charts now use the **exact same growth calculation method**:

### Tiered Growth Rates (Applied per 6-month period)
- **Year 1** (Periods 1-2): 12.5% annual → ~6.07% per period
- **Years 2-3** (Periods 3-6): 10% annual → ~4.88% per period  
- **Year 4** (Periods 7-8): 7.5% annual → ~3.68% per period
- **Year 5+** (Periods 9+): 6% annual → ~2.96% per period

### Period-Based Compounding
Instead of: `value *= (1 + annualRate)` each year

Now uses: `value = calculatePropertyGrowth(initialValue, periodsHeld, growthCurve)`

Where `calculatePropertyGrowth()`:
1. Converts annual rates to per-period rates using: `Math.pow(1 + annualRate, 1/2) - 1`
2. Compounds the value over each 6-month period
3. Applies the appropriate tier rate based on periods owned

## Result
✅ Per property equity chart now **perfectly matches** the portfolio growth chart
✅ Both charts use the same growth curve from the investment profile
✅ Both charts use period-based (6-month) compounding
✅ Consistent equity values across all visualizations

## Files Modified
- `/src/hooks/usePerPropertyTracking.ts` - Updated to use unified growth calculation

## Testing
To verify the fix:
1. Navigate to the Per Property Tracking view
2. Select a property from the dropdown
3. Compare the equity values in the "Equity Growth Over Time" chart
4. Switch to Portfolio Growth view
5. Verify that the same property's equity values match between both charts



