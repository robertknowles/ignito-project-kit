# PropPath Funding Allocation Analysis

## Executive Summary

PropPath has **COMPREHENSIVE per-property funding source tracking**. The system already captures:
- What funding source each property was funded from (equity vs savings vs cash)
- The running balances after each purchase
- A stacked breakdown showing cash, savings, and equity contributions

The data structure is in place and actively used in the UI. You do NOT need to add tracking—you only need to build the visualization.

---

## 1. Funding Allocation Logic

### Location
**Main file:** `/src/hooks/useAffordabilityCalculator.ts` (lines 327-504)

### Strategy: EQUITY-FIRST ALLOCATION

The system uses a cascading allocation strategy:

```
For each purchase, funding comes from (in order):
1. EQUITY RELEASE     (extracted from existing properties at 80% LVR)
2. CASH POOL          (remaining deposits + initial capital)
3. SAVINGS            (accumulated at 25% of annual salary savings)
```

### Key Variables Tracked

```typescript
// Per-purchase breakdown
fundingBreakdown: {
  cash: number;       // Amount from cash pool
  savings: number;    // Amount from savings (max 25% of savings)
  equity: number;     // Amount from extracted equity
  total: number;      // Total funded (should equal totalCashRequired)
}

// Running balances AFTER purchase
balancesAfterPurchase: {
  cash: number;              // Cash remaining after this purchase
  savings: number;           // Savings remaining after this purchase
  equityUsed: number;        // Cumulative equity used (including this purchase)
}
```

### The Calculation

From `useAffordabilityCalculator.ts` lines 440-457:

```typescript
// For each purchase in the current period:
const availableEquity = Math.max(0, extractableEquityThisPeriod - cumulativeEquityUsed);
const fromEquity = Math.min(remaining, availableEquity);  // Take equity first
remaining -= fromEquity;
cumulativeEquityUsed += fromEquity;

const fromCash = Math.min(remaining, runningCashBalance);  // Then cash
remaining -= fromCash;
runningCashBalance = Math.max(0, runningCashBalance - fromCash);

const savingsAvailableForPurchase = runningSavingsBalance;
const fromSavings = Math.min(remaining, savingsAvailableForPurchase);  // Finally savings
runningSavingsBalance = Math.max(0, runningSavingsBalance - fromSavings);
```

---

## 2. Per-Property Data Storage

### TimelineProperty Structure
**File:** `/src/types/property.ts` (lines 138-154)

```typescript
interface TimelineProperty {
  // ... other fields ...
  
  // FUNDING BREAKDOWN - SINGLE SOURCE OF TRUTH
  fundingBreakdown: {
    cash: number;      // Amount from cash pool
    savings: number;   // Amount from savings
    equity: number;    // Amount from extracted equity
    total: number;     // Total funded
  };
  
  // RUNNING BALANCES AT TIME OF PURCHASE
  balancesAfterPurchase: {
    cash: number;              // Cash remaining after this purchase
    savings: number;           // Savings remaining after this purchase
    equityUsed: number;        // Cumulative equity used (including this purchase)
  };
}
```

### What This Means

✅ **EACH PROPERTY has its own funding breakdown**
✅ **Balances are tracked chronologically** (property 1 → property 2 → property 3)
✅ **Equity-first allocation is explicit** (shows which properties used equity extraction)

---

## 3. Data in the Financial Summary Table

### "Funds" Row Display
**File:** `/src/components/FinancialSummaryTable.tsx` (lines 175-220)

The "Funds" row shows:
```
Available Funds = Cash + Savings + Equity (start of year)
```

When expanded, it shows the breakdown:
- **Cash:** `yearData.yearBreakdownData.baseDeposit`
- **Sav:** `yearData.yearBreakdownData.cumulativeSavings`
- **Eq:** `yearData.yearBreakdownData.equityRelease`

### Where Data Flows From

1. **useAffordabilityCalculator** calculates `fundingBreakdown` & `balancesAfterPurchase` for each property
2. **useRoadmapData** reads these values and builds `yearBreakdownData`
3. **FinancialSummaryTable** displays the annual summaries (start-of-year values)

---

## 4. Custom Events & Cash Injections

### Event System
**File:** `/src/hooks/useAffordabilityCalculator.ts` (lines 180-322)

The `getProfileAtPeriod()` function processes events:

```typescript
// One-time cash events that affect depositPool
case 'inheritance':
  oneTimeCashAdjustment += event.payload.cashAmount;
  break;

case 'bonus_windfall':
  oneTimeCashAdjustment += event.payload.bonusAmount;
  break;

case 'major_expense':
  oneTimeCashAdjustment -= event.payload.cashAmount;  // Deduction
  break;

case 'renovate':
  oneTimeCashAdjustment -= event.payload.renovationCost;  // Deduction
  break;
```

### How Events Affect Funding

```typescript
// Cash events modify the base deposit pool
modifiedProfile.depositPool = baseProfile.depositPool + oneTimeCashAdjustment;
```

**Result:** An inheritance at period 3 increases available cash for properties purchased in period 3+, and the funding breakdown will show the extra cash sourced from that inheritance.

---

## 5. Available Funds Over Time - Running Balance

### Chronological Tracking
**File:** `/src/hooks/useRoadmapData.ts` (lines 214-443)

The system maintains running balances:

```typescript
let runningCashBalance = profile.depositPool;           // Starts at initial deposit
let runningSavingsBalance = 0;                          // Accumulates each year
let cumulativeEquityUsed = 0;                           // Tracks total equity used
```

For each year:
1. **Savings accumulate:** `runningSavingsBalance += profile.annualSavings * SAVINGS_RATE * yearsElapsed`
2. **Cash depletes:** When purchases happen
3. **Equity used tracked:** Cumulative total across all purchases

### Property 1 vs Property 2 Example

```
Year 2025 (Period 1):
  - Start: Cash=$100k, Savings=$0, Equity=$200k
  - Property 1 costs $150k (deposit + costs)
  - Funded by: Equity=$150k
  - After: Cash=$100k, Savings=$0, Equity=$50k used (cumulative)

Year 2026 (Period 3):
  - Start: Cash=$100k, Savings=$25k (1 year saved), Equity=$50k remaining
  - Property 2 costs $120k
  - Funded by: Equity=$50k + Cash=$70k
  - After: Cash=$30k, Savings=$25k, Equity=$100k used (cumulative)
```

**This running balance is maintained in:**
- `balancesAfterPurchase` (per property, for internal tracking)
- `baseDeposit`, `cumulativeSavings`, `equityRelease` in YearBreakdownData (for display)

---

## 6. Chart Data Availability

### Data Structure for Stacked Chart
**Current data already has:**

For each property:
```typescript
fundingBreakdown: {
  cash: number;       // ← Width of cash segment
  savings: number;    // ← Width of savings segment
  equity: number;     // ← Width of equity segment
  total: number;      // ← Total bar width
}
```

### Building a Stacked Funding-Source Chart

**What you need to do:**

1. **Get timeline properties** from `useAffordabilityCalculator().timelineProperties`
2. **Filter for purchased properties:** `property.affordableYear !== Infinity`
3. **Extract funding data:**
   ```typescript
   properties.map(prop => ({
     propertyTitle: prop.title,
     period: prop.displayPeriod,
     cash: prop.fundingBreakdown.cash,
     savings: prop.fundingBreakdown.savings,
     equity: prop.fundingBreakdown.equity,
   }))
   ```
4. **Render stacked bar chart** (100% stacked or absolute values, your choice)

**Color coding suggestion:**
- Cash: Gray/Neutral
- Savings: Blue/Primary
- Equity: Green/Success

---

## 7. Summary: What Already Exists vs What You Need

### Already Built ✅
- Per-property funding breakdown tracking (`fundingBreakdown`)
- Running balance tracking after each purchase (`balancesAfterPurchase`)
- Available funds at start of each year (cash + savings + equity)
- Custom event handling (inheritance, lump sums, expenses)
- Chronological allocation (properties fund sequentially)
- Display of funding breakdown in MiniPurchaseCard (hidden by default)

### You Need to Build 🛠️
- **Stacked funding-source chart** showing:
  - X-axis: Property purchases (or time periods)
  - Y-axis: Funding amount
  - Segments: Cash | Savings | Equity (stacked or proportional)
  - Tooltip: Show exact amounts for each source per property

### Where to Add the Chart
1. **Page location:** Probably alongside the timeline or in a new "Funding Analysis" section
2. **Data source:** `useAffordabilityCalculator().timelineProperties.filter(p => p.affordableYear !== Infinity)`
3. **Chart library:** Likely Recharts (already in the project for other charts)

---

## 8. Example: Property 1 Funded with Equity, Property 2 with Savings + Cash

### Scenario Setup
- Initial cash: $150k
- Annual savings: $50k (25% rate = $12.5k/year usable)
- Existing equity: $300k
- Property 1: $400k purchase (year 2025)
- Property 2: $380k purchase (year 2026)

### Funding Allocation (from the engine)

**Property 1 (Period 1):**
```
Cost:           $400k (deposit + costs)
Available:      Equity=$300k, Cash=$150k, Savings=$0
Allocated:      Equity=$300k + Cash=$100k = $400k ✓
After:          Equity=$0 remaining, Cash=$50k, Savings=$0
```

**Property 2 (Period 3, one year later):**
```
Cost:           $380k (deposit + costs)
Available:      Equity=$0, Cash=$50k, Savings=$12.5k (1 year accumulated)
Shortfall:      Need $317.5k more
Result:         FAILS (insufficient funds)
```

### In the Data Structure

After Property 1:
```typescript
property1.fundingBreakdown = {
  cash: 100000,
  savings: 0,
  equity: 300000,
  total: 400000
}
property1.balancesAfterPurchase = {
  cash: 50000,
  savings: 0,
  equityUsed: 300000  // Cumulative
}
```

Before Property 2:
```typescript
property2.fundingBreakdown = {
  cash: 50000,
  savings: 12500,
  equity: 0,
  total: 62500  // Falls short of 380k!
}
```

---

## 9. Key Design Principles in the Code

1. **Single Source of Truth:** `fundingBreakdown` calculated in `useAffordabilityCalculator`, consumed in `useRoadmapData`
2. **Chronological Processing:** Properties processed in order (purchase 1 → 2 → 3), running balances maintained
3. **Equity-First Strategy:** Always prefer equity extraction > cash > savings
4. **Event Integration:** Custom events (inheritance, etc.) modify `depositPool` before allocation
5. **Transactional Tracking:** `balancesAfterPurchase` records state after each purchase for future period calculations

---

## Files to Reference

| File | Purpose |
|------|---------|
| `/src/hooks/useAffordabilityCalculator.ts` | Lines 327-504: Funding allocation logic |
| `/src/types/property.ts` | Lines 138-154: Data structure definitions |
| `/src/hooks/useRoadmapData.ts` | Lines 214-443: Running balance tracking |
| `/src/components/FinancialSummaryTable.tsx` | Lines 175-220: Display of Funds row |
| `/src/components/MiniPurchaseCard.tsx` | Lines 81-102: Funding breakdown display (hidden) |

