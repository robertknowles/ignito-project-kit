# Summary Bar Current Values Fix

## Summary
Fixed the Summary Bar to display **current portfolio status** (as of latest purchase year) instead of end-of-timeline projections (30 years in the future).

## Problem
The Summary Bar was calculating metrics at `timelineEnd = 2025 + profile.timelineYears`, showing projected values 30 years in the future instead of the current portfolio status.

**Example:**
- Buy $350k property in 2025 with 30-year timeline
- **BEFORE:** Showed $2.3M portfolio value (after 30 years of growth)
- **AFTER:** Shows $378k portfolio value (current valuation as of 2025)

## Solution
Changed the calculation point from end-of-timeline to the **latest purchase year**:

### Key Changes in `src/components/SummaryBar.tsx`:

1. **Calculate Latest Purchase Year (Lines 29-34)**
```typescript
// Calculate as of the LATEST PURCHASE YEAR instead of timeline end
// This shows "where you are now" not "where you'll be in 30 years"
const latestPurchaseYear = feasibleProperties.length > 0
  ? Math.max(...feasibleProperties.map(p => Math.round(p.affordableYear)))
  : 2025;
const currentYear = latestPurchaseYear;
```

2. **Use Current Year for Existing Portfolio (Lines 65-73)**
```typescript
// Calculate metrics for existing portfolio (growth up to current year)
const existingMetrics = calculateExistingPortfolioMetrics(
  profile.portfolioValue,
  profile.currentDebt,
  currentYear - 2025,  // Changed from: timelineEnd - 2025
  defaultGrowthRate,
  profile.growthCurve,
  defaultInterestRate
)
```

3. **Use Current Year for New Purchases (Lines 75-83)**
```typescript
// Calculate metrics for new purchases with detailed expense analysis (as of current year)
const newPurchasesMetrics = calculatePortfolioMetrics(
  purchases,
  currentYear,  // Changed from: timelineEnd
  defaultGrowthRate,
  profile.growthCurve,
  defaultInterestRate,
  DEFAULT_PROPERTY_EXPENSES
)
```

4. **Updated Label (Line 131)**
```typescript
<h4 className="text-xs text-[#6b7280] mb-2">Portfolio Value</h4>
// Changed from: "Final Portfolio Value"
```

## What the Summary Bar Now Shows

All metrics are calculated as of the **latest purchase year**:

| Metric | Description |
|--------|-------------|
| **Portfolio Value** | Current total value of all properties (with growth to latest purchase year) |
| **Properties** | Number of properties purchased |
| **Cashflow Goal** | Current annual cashflow vs. target |
| **Equity Goal** | Current total equity vs. target |
| **Total Debt** | Current total debt outstanding |
| **Timeline Progress** | Years elapsed to latest purchase |

## Why This Matters

The Summary Bar should show **"where you are now"** in your investment journey, not "where you'll be in 30 years":

- **Better Decision Making:** Users can see their current position to make decisions about the next purchase
- **Realistic Values:** Shows actual current portfolio value, not highly inflated future projections
- **Progress Tracking:** Reflects real progress made to date, not theoretical future gains

## Testing

1. **Single Property Test:**
   - Add one property in 2025
   - Verify Summary Bar shows reasonable current values (e.g., $350k property → ~$378k with Year 1 growth)
   - Should NOT show $2.3M projected value

2. **Multiple Properties Test:**
   - Add first property in 2025
   - Add second property in 2028
   - Verify Summary Bar updates to show values as of 2028 (latest purchase year)
   - Both properties should show growth to 2028

3. **Equity & Debt Test:**
   - Verify equity = current property values - loan amounts
   - Verify debt shows actual loan amounts (not reduced over 30 years)

## Example Scenario

**Portfolio Setup:**
- Buy Property A ($350k) in 2025
- Buy Property B ($400k) in 2028
- 30-year timeline (2055 end date)

**Summary Bar Display:**

### Before Fix (Calculated at 2055):
- Portfolio Value: $2.3M (30 years of growth)
- Equity: $1.8M
- Very inflated, confusing values

### After Fix (Calculated at 2028):
- Portfolio Value: ~$845k (Property A grown 3 years + Property B just purchased)
- Equity: ~$165k (realistic current equity)
- Clear, actionable current position

## Files Modified
- `src/components/SummaryBar.tsx` - Changed calculation point from `timelineEnd` to `latestPurchaseYear`

## No Breaking Changes
- All existing functionality preserved
- Metrics calculator functions unchanged
- Only the calculation timepoint changed

