# Borrowing Capacity Calculation Issue Analysis

## Problem Summary
There are **TWO** different "Borrowing Capacity Remaining" calculations, and they can show different results:
- One allows purchases to proceed
- Another shows negative capacity in the UI

## The Two Calculations

### CALCULATION 1: Purchase Decision (checkAffordability)
**Location:** `src/hooks/useAffordabilityCalculator.ts` lines 464-466

```typescript
// BORROWING CAPACITY TEST: Total debt cannot exceed borrowing capacity
const borrowingCapacityTestPass = totalDebtAfterPurchase <= profile.borrowingCapacity;
const borrowingCapacityTestSurplus = profile.borrowingCapacity - totalDebtAfterPurchase;
```

**Used for:** Determining if a purchase can proceed
**Result:** If this passes, the purchase is marked as "PURCHASED"

### CALCULATION 2A: Display - Main Capacity (for timeline properties)
**Location:** `src/hooks/useAffordabilityCalculator.ts` line 971

```typescript
borrowingCapacityRemaining: Math.max(0, profile.borrowingCapacity - totalDebtAfter),
```

**Flows to:** `DecisionEngineView.tsx` line 135 → `availableBorrowingCapacity`
**Displayed at:** `AffordabilityBreakdownTable.tsx` lines 268, 295

**Key difference:** Uses `Math.max(0, ...)` - **CANNOT show negative values**

### CALCULATION 2B: Display - Test Surplus (for borrowing capacity test)
**Location:** `DecisionEngineView.tsx` lines 156-161

```typescript
borrowingCapacityTest: {
  pass: property.totalDebtAfter <= profile.borrowingCapacity,
  surplus: profile.borrowingCapacity - property.totalDebtAfter,  // ⚠️ NO Math.max(0, ...)
  available: profile.borrowingCapacity,
  required: property.totalDebtAfter,
},
```

**Displayed at:** `AffordabilityBreakdownTable.tsx` line 309

**Key difference:** Does NOT use `Math.max(0, ...)` - **CAN show negative values**

## Why They Differ

The calculations themselves are mathematically identical:
```
Remaining Capacity = Borrowing Capacity - Total Debt After Purchase
```

**BUT:**
1. `availableBorrowingCapacity` (lines 268, 295) uses `Math.max(0, ...)` = shows £0 when negative
2. `borrowingCapacityTest.surplus` (line 309) does NOT = shows -£275k when negative

## The Inconsistency

A purchase in 2027 shows:
- **Status:** "PURCHASED" ✅ (borrowingCapacityTestPass = true)
- **Display:** "Borrowing Capacity Remaining: -£275k" ❌

**This is impossible if both calculations use the same logic!**

## Root Cause **FOUND!**

The bug is in **`useAffordabilityCalculator.ts` lines 861-864**:

```typescript
// Add all previous purchases (with growth based on years owned)
purchaseHistory.forEach(purchase => {
  const yearsOwned = purchaseYear - purchase.year;
  portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
  totalDebtAfter += purchase.loanAmount;  // ⚠️ BUG: No year filtering!
});
```

**This code is missing year filtering!** It adds ALL loans from purchaseHistory regardless of whether they've been purchased by the current year.

Compare to:
1. **checkAffordability** (lines 432-436) - **HAS year filter**:
   ```typescript
   previousPurchases.forEach(purchase => {
     if (purchase.year <= currentYear) {  // ✅ Year filter
       totalAnnualLoanInterest += purchase.loanAmount * interestRate;
     }
   });
   ```

2. **Same file** (lines 933-936) - **HAS year filter**:
   ```typescript
   purchaseHistory.forEach(purchase => {
     if (purchase.year <= purchaseYear) {  // ✅ Year filter
       const yearsOwned = purchaseYear - purchase.year;
       const currentValue = calculatePropertyGrowth(purchase.cost, yearsOwned);
   ```

## Why This Causes the Issue

When calculating `totalDebtAfter` for a property purchased in 2027:
- **Without year filter (BUGGY):** Adds debt from ALL properties in history, including future years
- **With year filter (CORRECT):** Only adds debt from properties purchased by 2027 or earlier

This explains why:
- ✅ `checkAffordability` passes (uses year filter → correct debt calculation)
- ❌ Display shows negative capacity (no year filter → includes future debt)

## Which Calculation is Correct?

**CALCULATION 1 (Purchase Decision) is correct** because:
- It properly filters purchases by year: `if (purchase.year <= currentYear)`
- It represents the actual debt at the time of purchase decision
- It's the one actually used to make purchase decisions

**CALCULATION 2B (Display - Test Surplus) is showing incorrect values** because:
- It doesn't filter by year when summing debt
- It may be including future purchases in the debt calculation
- The display shows negative capacity for a purchase that was approved

## The Fix

**File:** `src/hooks/useAffordabilityCalculator.ts`  
**Lines:** 861-864

**Current (BUGGY) code:**
```typescript
purchaseHistory.forEach(purchase => {
  const yearsOwned = purchaseYear - purchase.year;
  portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
  totalDebtAfter += purchase.loanAmount;
});
```

**Fixed code:**
```typescript
purchaseHistory.forEach(purchase => {
  if (purchase.year <= purchaseYear) {  // ✅ Add year filter
    const yearsOwned = purchaseYear - purchase.year;
    portfolioValueAfter += calculatePropertyGrowth(purchase.cost, yearsOwned);
    totalDebtAfter += purchase.loanAmount;
  }
});
```

This makes the calculation consistent with:
- The purchase decision logic (`checkAffordability`)
- The cashflow calculation logic (lines 933-936 in the same file)
- All other year-based debt calculations

## Additional Recommendations

1. **Remove the `Math.max(0, ...)` wrapper on line 971** so the display can show actual negative capacity when it occurs
2. **Add validation** to ensure `totalDebtAfter` matches `totalDebtAfterPurchase` for the same property
3. **Add console logging** to compare the two calculations and catch future discrepancies

## Which Display is Showing -£275k?

Most likely **Line 309** in `AffordabilityBreakdownTable.tsx`:
```typescript
└─ Remaining Capacity: {formatCurrency(year.borrowingCapacityTest?.surplus || 0, true)}
```

This displays `borrowingCapacityTest.surplus` which does NOT have the `Math.max(0, ...)` protection.

