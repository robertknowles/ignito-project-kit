# Property Price Changes Not Affecting Timeline - BUG FIX

## Bug Summary

When a user updated the `purchasePrice` of a property instance in the property details modal, the change was not reflected in the timeline calculations. The timeline continued to use the default property template `cost` value instead of the updated `purchasePrice` from the property instance.

## Root Cause

The issue was in `useAffordabilityCalculator.ts`. Throughout the timeline calculation loop, the code was using `property.cost` (the template default) instead of checking if the property instance had an updated `purchasePrice` value.

**Key Problem Areas:**
1. Initial loan amount calculation (line 905)
2. Portfolio value calculations (line 950)
3. Acquisition costs calculation (lines 1027-1041)
4. Timeline property object creation (lines 1104-1106)
5. Portfolio state calculations (lines 1139-1141)
6. Adding to purchase history (lines 1168-1170)
7. Cashflow calculations (line 969)

## Solution Implemented

### Changes Made to `src/hooks/useAffordabilityCalculator.ts`

#### 1. Get Correct Purchase Price at Start of Loop (Lines 902-914)

**Before:**
```typescript
allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
  const propertyWithInstance = { ...property, instanceId };
  const result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
  const loanAmount = property.cost - property.depositRequired; // ❌ Uses template default
```

**After:**
```typescript
allPropertiesToPurchase.forEach(({ property, index, instanceId }, globalIndex) => {
  // Get the correct purchase price from the instance (if it has been updated)
  const propertyInstance = getInstance(instanceId);
  const correctPurchasePrice = propertyInstance?.purchasePrice ?? property.cost;
  
  // Recalculate deposit and loan amount based on correct purchase price
  const depositPercentage = property.depositRequired / property.cost;
  const correctDepositRequired = correctPurchasePrice * depositPercentage;
  const correctLoanAmount = correctPurchasePrice - correctDepositRequired;
  
  // Attach instanceId to property for use in determineNextPurchasePeriod
  const propertyWithInstance = { ...property, instanceId, cost: correctPurchasePrice, depositRequired: correctDepositRequired };
  const result = determineNextPurchasePeriod(propertyWithInstance, purchaseHistory, globalIndex);
  const loanAmount = correctLoanAmount; // ✅ Uses correct loan amount
```

#### 2. Portfolio Value Calculation (Line 958-960)

**Before:**
```typescript
// Add the current property being purchased
portfolioValueAfter += property.cost; // ❌ Uses template default
totalDebtAfter += loanAmount;
```

**After:**
```typescript
// Add the current property being purchased (use correct purchase price)
portfolioValueAfter += correctPurchasePrice; // ✅ Uses correct price
totalDebtAfter += loanAmount;
```

#### 3. Acquisition Costs Calculation (Lines 1035-1050)

**Before:**
```typescript
const lvr = (loanAmount / property.cost) * 100; // ❌ Uses template default

const acquisitionCosts = calculateAcquisitionCosts({
  propertyPrice: property.cost, // ❌ Uses template default
  loanAmount: loanAmount,
  lvr: lvr,
  isFirstHomeBuyer: false,
  lmiWaiver: timelineLmiWaiver,
});

const totalCashRequired = property.depositRequired + acquisitionCosts.total; // ❌ Uses template default
```

**After:**
```typescript
const lvr = (loanAmount / correctPurchasePrice) * 100; // ✅ Uses correct price

const acquisitionCosts = calculateAcquisitionCosts({
  propertyPrice: correctPurchasePrice, // ✅ Uses correct price
  loanAmount: loanAmount,
  lvr: lvr,
  isFirstHomeBuyer: false,
  lmiWaiver: timelineLmiWaiver,
});

const totalCashRequired = correctDepositRequired + acquisitionCosts.total; // ✅ Uses correct deposit
```

#### 4. Timeline Property Object (Lines 1109-1115)

**Before:**
```typescript
const timelineProperty: TimelineProperty = {
  id: `${property.id}_${index}`,
  instanceId: instanceId,
  title: property.title,
  cost: property.cost, // ❌ Uses template default
  depositRequired: property.depositRequired, // ❌ Uses template default
  loanAmount: loanAmount,
```

**After:**
```typescript
const timelineProperty: TimelineProperty = {
  id: `${property.id}_${index}`,
  instanceId: instanceId,
  title: property.title,
  cost: correctPurchasePrice, // ✅ Uses correct price
  depositRequired: correctDepositRequired, // ✅ Uses correct deposit
  loanAmount: loanAmount,
```

#### 5. Portfolio State Before Purchase (Lines 1147-1150)

**Before:**
```typescript
// Portfolio state before purchase
portfolioValueBefore: portfolioValueAfter - property.cost, // ❌ Uses template default
totalEquityBefore: totalEquityAfter - (property.cost - loanAmount), // ❌ Uses template default
totalDebtBefore: totalDebtAfter - loanAmount,
```

**After:**
```typescript
// Portfolio state before purchase (use correct purchase price)
portfolioValueBefore: portfolioValueAfter - correctPurchasePrice, // ✅ Uses correct price
totalEquityBefore: totalEquityAfter - (correctPurchasePrice - loanAmount), // ✅ Uses correct price
totalDebtBefore: totalDebtAfter - loanAmount,
```

#### 6. Adding to Purchase History (Lines 1173-1184)

**Before:**
```typescript
// Add to purchase history if affordable
if (result.period !== Infinity) {
  purchaseHistory.push({
    period: result.period,
    cost: property.cost, // ❌ Uses template default
    depositRequired: property.depositRequired, // ❌ Uses template default
    loanAmount: loanAmount,
    title: property.title,
    instanceId: instanceId,
    loanType: instanceLoanType,
    cumulativeEquityReleased: 0
  });
```

**After:**
```typescript
// Add to purchase history if affordable (use correct purchase price)
if (result.period !== Infinity) {
  purchaseHistory.push({
    period: result.period,
    cost: correctPurchasePrice, // ✅ Uses correct price
    depositRequired: correctDepositRequired, // ✅ Uses correct deposit
    loanAmount: loanAmount,
    title: property.title,
    instanceId: instanceId,
    loanType: instanceLoanType,
    cumulativeEquityReleased: 0
  });
```

#### 7. Cashflow Calculations (Line 977-978)

**Before:**
```typescript
// Get the correct purchase price from the instance (if it has been updated)
const currentPropertyInstance = getInstance(instanceId);
const correctPurchasePrice = currentPropertyInstance?.purchasePrice ?? property.cost;

// Recalculate deposit and loan amount based on correct purchase price
const depositPercentage = property.depositRequired / property.cost;
const correctDepositRequired = correctPurchasePrice * depositPercentage;
const correctLoanAmount = correctPurchasePrice - correctDepositRequired;

// Calculate cashflow from all properties including this one
[...purchaseHistory, { period: purchasePeriod, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: correctLoanAmount, ... }]
```

**After:**
```typescript
// Calculate cashflow from all properties including this one (use correct purchase price from top of loop)
[...purchaseHistory, { period: purchasePeriod, cost: correctPurchasePrice, depositRequired: correctDepositRequired, loanAmount: loanAmount, ... }]
```

The duplicate calculation was removed since we now calculate `correctPurchasePrice`, `correctDepositRequired`, and `correctLoanAmount` at the start of the loop.

## How It Works Now

1. **At the start of each property loop iteration**, the code:
   - Gets the property instance using `getInstance(instanceId)`
   - Retrieves the `purchasePrice` from the instance (or falls back to template `cost`)
   - Calculates the correct deposit based on the deposit percentage
   - Calculates the correct loan amount

2. **Throughout the calculation**, all references use:
   - `correctPurchasePrice` instead of `property.cost`
   - `correctDepositRequired` instead of `property.depositRequired`
   - `correctLoanAmount` (assigned to `loanAmount`)

3. **The correct values flow through**:
   - Affordability checks
   - Portfolio value calculations
   - Acquisition cost calculations
   - Timeline property display
   - Purchase history tracking
   - Cashflow calculations

## Expected Behavior

### Before Fix
- User updates property price from $500,000 to $600,000 in property details modal
- Timeline still shows property being purchased at $500,000
- All calculations (deposit, loan, cashflow, equity) based on $500,000
- User confusion and incorrect projections

### After Fix
- User updates property price from $500,000 to $600,000 in property details modal
- Timeline immediately recalculates using $600,000
- All calculations (deposit, loan, cashflow, equity) based on $600,000
- Accurate projections reflecting the updated purchase price
- Purchase period may shift based on new affordability calculations

## Testing Checklist

- [ ] Update property purchase price in property details modal
- [ ] Verify timeline recalculates immediately
- [ ] Check that deposit amount updates proportionally
- [ ] Verify loan amount reflects new purchase price
- [ ] Confirm acquisition costs (stamp duty, LMI) recalculate correctly
- [ ] Check that purchase period shifts if affordability changes
- [ ] Verify equity calculations use correct property value
- [ ] Confirm cashflow calculations reflect updated price
- [ ] Test with multiple properties to ensure all instances update correctly
- [ ] Verify that properties not yet edited still use template defaults

## Files Modified

1. `/src/hooks/useAffordabilityCalculator.ts` - Main fix implementation

## Related Context

- Property instances store user-customized values in `PropertyInstanceDetails` interface
- The `purchasePrice` field can differ from the template's default `cost`
- The `getInstance()` function retrieves property instance data from context
- Timeline calculations happen in a `useMemo` hook that depends on `instances` state
- When instances change, the timeline automatically recalculates

## Technical Notes

### Deposit Percentage Preservation

The fix maintains the deposit percentage from the template:

```typescript
const depositPercentage = property.depositRequired / property.cost;
const correctDepositRequired = correctPurchasePrice * depositPercentage;
```

This ensures that if a template has a 20% deposit ($100k on $500k), updating the price to $600k will result in a $120k deposit (still 20%).

### Fallback Behavior

If a property instance doesn't exist or hasn't been customized:

```typescript
const correctPurchasePrice = propertyInstance?.purchasePrice ?? property.cost;
```

The code gracefully falls back to the template default, ensuring backward compatibility.

### Calculation Consistency

By calculating `correctPurchasePrice`, `correctDepositRequired`, and `correctLoanAmount` once at the top of the loop, we ensure consistency across all calculations within that iteration.

## Impact

This fix ensures that:
1. ✅ Property price changes immediately affect timeline calculations
2. ✅ Deposit and loan amounts scale proportionally
3. ✅ Acquisition costs (stamp duty, LMI) reflect updated prices
4. ✅ Affordability checks use correct values
5. ✅ Portfolio tracking is accurate
6. ✅ Cashflow projections are based on actual purchase prices
7. ✅ User confidence in the tool increases with accurate projections

