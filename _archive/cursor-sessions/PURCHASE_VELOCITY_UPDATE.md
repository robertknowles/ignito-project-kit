# Purchase Velocity Update - Option A Implementation

## Overview

Updated the affordability calculator to allow up to **3 properties to be purchased in the same 6-month period**, removing the previous 1-period gap rule. This enables more aggressive, front-loaded investment strategies as requested by cofounder feedback.

## Changes Made

### File Modified
- `src/hooks/useAffordabilityCalculator.ts`

### Key Changes

#### 1. Removed 6-Month Gap Rule

**Previous Logic (REMOVED):**
```typescript
// 6-MONTH (1 PERIOD) PURCHASE GAP: Enforce minimum gap between purchases
const lastPurchasePeriod = currentPurchases.length > 0 
  ? Math.max(...currentPurchases.map(p => p.period)) 
  : 0;

// Skip periods that don't meet the 1-period gap requirement
// Must wait at least 1 period (6 months) between purchases
const isGapBlocked = lastPurchasePeriod > 0 && period < lastPurchasePeriod + 1;
if (isGapBlocked) {
  if (DEBUG_MODE) {
    console.log(`[GAP CHECK] Period ${period} (${periodToDisplay(period)}): Skipped due to 6-month gap rule (last purchase: ${periodToDisplay(lastPurchasePeriod)})`);
  }
  continue;
}
```

This logic enforced a minimum 6-month gap between consecutive purchases, preventing multiple properties from being purchased in the same period.

#### 2. Implemented Purchase Velocity Limit

**New Logic (ADDED):**
```typescript
// PURCHASE VELOCITY LIMIT: Max 3 properties per 6-month period
const MAX_PURCHASES_PER_PERIOD = 3;
const purchasesInThisPeriod = currentPurchases.filter(p => p.period === period).length;

if (purchasesInThisPeriod >= MAX_PURCHASES_PER_PERIOD) {
  if (DEBUG_MODE) {
    console.log(`[PURCHASE LIMIT] Period ${period} (${periodToDisplay(period)}): Blocked - already ${purchasesInThisPeriod} purchases in this period (max: ${MAX_PURCHASES_PER_PERIOD})`);
  }
  continue; // Skip to the next period
}
```

This new logic:
- Counts how many properties have already been assigned to the current period
- Allows up to 3 properties per period
- Once the limit is reached, moves to the next available period

## How It Works

### Purchase Flow

The affordability calculator processes properties sequentially:

1. **For each property in the user's selection:**
   - Start with period 1 (2025 H1)
   
2. **For each period in the timeline:**
   - Check if the period is paused (skip if yes)
   - **Check if max purchases (3) for THIS PERIOD is reached** (skip to next period if yes)
   - Calculate affordability (deposit + borrowing capacity + serviceability)
   - If affordable:
     - Assign the property to this period
     - Add it to `purchaseHistory`
     - Move to the next property
   - If not affordable:
     - Try the next period

3. **The `purchaseHistory` is updated immediately** after each purchase, so subsequent properties can see previous purchases in the same period when checking the limit.

### Example Scenarios

#### Scenario 1: 5 Properties Selected, Enough Capacity
- **Period 1 (2025 H1):** Properties 1, 2, 3 (max reached)
- **Period 2 (2025 H2):** Property 4
- **Period 3 (2026 H1):** Property 5

#### Scenario 2: 3 Properties Selected, All Affordable
- **Period 1 (2025 H1):** Properties 1, 2, 3 (all in the same period)

#### Scenario 3: 4 Properties Selected, Limited Funds
- **Period 1 (2025 H1):** Property 1 (only 1 affordable in first period)
- **Period 3 (2026 H1):** Property 2 (needs more time to save)
- **Period 4 (2026 H2):** Properties 3, 4 (can afford 2 together)

## Impact on Calculations

### Deposit Calculation
The system correctly accounts for multiple same-period purchases by:
- Tracking `availableFunds` which includes:
  - Base deposit pool
  - Cumulative savings (per period)
  - Cashflow reinvestment from existing properties
  - Equity release (88% LVR cap)
- Deducting each deposit as properties are assigned

### Borrowing Capacity
The dynamic borrowing capacity system handles multiple purchases by:
- Starting with base borrowing capacity
- Adding equity boost from existing portfolio: `usableEquity × equityFactor`
- Checking total debt after each purchase against the effective capacity
- Each property in the same period reduces available capacity

### Serviceability
The enhanced serviceability test accounts for:
- Total annual loan payments across all properties (including same-period purchases)
- Rental income contribution (70% of gross rental income)
- Base capacity (10% of borrowing capacity)
- Formula: `(baseCapacity + rentalContribution) ≥ totalAnnualLoanPayments`

## Testing Recommendations

1. **Test with 4+ Properties:**
   - Verify that exactly 3 properties are assigned to the first affordable period
   - Confirm remaining properties move to subsequent periods

2. **Test Combined Costs:**
   - Ensure deposit requirements are correctly summed for same-period purchases
   - Verify acquisition costs (stamp duty, LMI, legal fees) are calculated for each property

3. **Test Borrowing Capacity:**
   - Confirm that total debt from same-period purchases is correctly checked against effective borrowing capacity
   - Verify that if 3 properties exceed capacity, only affordable ones are placed in that period

4. **Test Serviceability:**
   - Ensure loan payments for all same-period properties are correctly summed
   - Verify serviceability test passes/fails appropriately

5. **Test Edge Cases:**
   - Zero deposit available (should delay all purchases)
   - Exactly at borrowing capacity limit
   - Mixed property types with different deposit requirements

## Debug Mode

To enable detailed logging of the purchase logic:
1. Set `DEBUG_MODE = true` on line 57 of `useAffordabilityCalculator.ts`
2. Open browser console
3. Look for log messages like:
   - `[PURCHASE LIMIT] Period X: Blocked - already Y purchases in this period (max: 3)`
   - `[PAUSE] Period X: Skipped due to active pause period`
   - Detailed affordability traces for each period/property combination

## Backwards Compatibility

This change is **fully backwards compatible**:
- Existing user profiles and scenarios will work without modification
- Properties that were previously spaced out will now potentially be consolidated into fewer periods
- Users who want a more conservative strategy can still achieve it by:
  - Using pause blocks between properties
  - Selecting fewer properties
  - The system still respects affordability constraints

## Related Features

This update works seamlessly with:
- **Pause Blocks:** Can still insert pauses between property purchases
- **Custom Property Blocks:** Custom properties follow the same 3-per-period limit
- **Loan Types (IO/PI):** Both loan types are supported for same-period purchases
- **Equity Recycling:** Continuous equity release still applies across all properties
- **Cashflow Reinvestment:** Self-funding flywheel incorporates all same-period properties

## Future Enhancements

Potential improvements for future consideration:
1. Make `MAX_PURCHASES_PER_PERIOD` a user-configurable setting
2. Add visual indicator in UI showing how many properties are in each period
3. Add warning when approaching the 3-property limit in a period
4. Allow different velocity limits for different property types
5. Add "spread purchases evenly" vs "front-load purchases" strategy toggle

