# Loan Type Refactoring - Visual Guide

## Before vs After

### BEFORE: Per-Property-Type System ❌

```
┌─────────────────────────────────────────┐
│  Property Building Blocks (Assumptions) │
└─────────────────────────────────────────┘

┌──────────────────────────────────┐
│ Units / Apartments               │
│ Price: $450k                     │
│ Yield: 4.5%                      │
│ Loan: [IO] [P&I] ← Global Toggle│  ← ALL instances use this!
│ Count: 3 selected                │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Houses (Sydney)                  │
│ Price: $800k                     │
│ Yield: 3.5%                      │
│ Loan: [IO] [P&I] ← Global Toggle│  ← ALL instances use this!
│ Count: 2 selected                │
└──────────────────────────────────┘

        ↓ Results in Timeline ↓

┌──────────────────────────────────┐
│ 2025 H1: Units / Apartments #1   │
│ Loan Type: IO ◄──────┐           │
└──────────────────────┼───────────┘
                       │ Same
┌──────────────────────┼───────────┐
│ 2026 H1: Units / Apartments #2   │
│ Loan Type: IO ◄──────┤           │
└──────────────────────┼───────────┘
                       │ Linked!
┌──────────────────────┼───────────┐
│ 2027 H1: Units / Apartments #3   │
│ Loan Type: IO ◄──────┘           │
└──────────────────────────────────┘

Problem: Can't have different loan types for same property type!
```

### AFTER: Per-Property-Instance System ✅

```
┌─────────────────────────────────────────┐
│  Property Building Blocks (Assumptions) │
└─────────────────────────────────────────┘

┌──────────────────────────────────┐
│ Units / Apartments               │
│ Price: $450k                     │
│ Yield: 4.5%                      │
│ [No loan type toggle here]       │  ← Clean interface!
│ Count: 3 selected                │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Houses (Sydney)                  │
│ Price: $800k                     │
│ Yield: 3.5%                      │
│ [No loan type toggle here]       │  ← Clean interface!
│ Count: 2 selected                │
└──────────────────────────────────┘

        ↓ Results in Timeline ↓

┌──────────────────────────────────┐
│ 2025 H1: Units / Apartments #1   │
│ Loan: [IO] [P&I] ← Independent!  │  ← Can change just this one!
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 2026 H1: Units / Apartments #2   │
│ Loan: [IO] [P&I] ← Independent!  │  ← Can change just this one!
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 2027 H1: Units / Apartments #3   │
│ Loan: [IO] [P&I] ← Independent!  │  ← Can change just this one!
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 2028 H1: Houses (Sydney) #1      │
│ Loan: [IO] [P&I] ← Independent!  │  ← Different property type
└──────────────────────────────────┘

Benefit: Each property instance has its own loan type!
```

## Data Flow Architecture

### Old System (Removed)

```
┌─────────────────────────┐
│ PropertySelectionContext│
│                         │
│ propertyLoanTypes: {    │
│   'property_0': 'IO',   │  ← Stored by property TYPE
│   'property_1': 'PI',   │
│   'custom_xyz': 'IO'    │
│ }                       │
└─────────┬───────────────┘
          │
          ↓ Used by all instances
          │
┌─────────┴────────────────┐
│ useAffordabilityCalculator│
│                          │
│ All "Units/Apartments"   │
│ use same loan type       │
└──────────────────────────┘
```

### New System (Implemented)

```
┌─────────────────────────────┐
│ useAffordabilityCalculator  │
│                             │
│ timelineLoanTypes: {        │
│   'property_0_instance_0': 'IO',  ← Stored by INSTANCE
│   'property_0_instance_1': 'PI',  ← Each property unique!
│   'property_0_instance_2': 'IO',  ← Full flexibility
│   'property_1_instance_0': 'PI',  
│ }                           │
│                             │
│ updateTimelinePropertyLoanType(instanceId, type) │
└──────────────┬──────────────┘
               │
               ↓ Exported to UI
               │
┌──────────────┴──────────────┐
│ InvestmentTimeline          │
│                             │
│ Each TimelineItem renders:  │
│ - Property details          │
│ - LoanTypeToggle component  │
│   onChange calls update fn  │
└─────────────────────────────┘
```

## Instance ID Generation

```javascript
// Stable, deterministic ID generation
propertyId: 'property_0' (Units/Apartments)
index: 0 (first instance)
  ↓
instanceId: 'property_0_instance_0'

propertyId: 'property_0' (Units/Apartments)
index: 1 (second instance)
  ↓
instanceId: 'property_0_instance_1'

propertyId: 'property_1' (Houses)
index: 0 (first instance)
  ↓
instanceId: 'property_1_instance_0'
```

**Why Stable IDs?**
- Same property at same position = same ID across recalculations
- Preserves user's loan type selection
- Enables proper localStorage persistence
- Predictable behavior when properties are added/removed

## Calculation Flow with Loan Types

### Purchase History Structure (NEW)

```javascript
purchaseHistory = [
  {
    period: 1,
    cost: 450000,
    depositRequired: 90000,
    loanAmount: 360000,
    title: 'Units / Apartments',
    instanceId: 'property_0_instance_0',  // ← NEW
    loanType: 'IO'                         // ← NEW (per-instance)
  },
  {
    period: 3,
    cost: 450000,
    depositRequired: 90000,
    loanAmount: 360000,
    title: 'Units / Apartments',
    instanceId: 'property_0_instance_1',  // ← Different instance
    loanType: 'PI'                         // ← Different loan type!
  }
]
```

### Loan Payment Calculation (Respects Instance)

```javascript
// For each purchase in history:
purchase.forEach(p => {
  // Uses the SPECIFIC instance's loan type
  const loanPayment = calculateAnnualLoanPayment(
    p.loanAmount,
    interestRate,
    p.loanType  // ← 'IO' or 'PI' per instance
  );
  
  // IO: Only interest (lower payment)
  // P&I: Principal + Interest (higher payment)
  
  totalLoanPayments += loanPayment;
});
```

## UI Component Structure

```
InvestmentTimeline
├── TimelineItem (Property 1)
│   ├── Property Icon & Name
│   ├── Financial Details
│   └── LoanTypeToggle ← NEW
│       ├── instanceId: 'property_0_instance_0'
│       ├── current: 'IO'
│       └── onChange: (instanceId, newType) => {
│             updateTimelinePropertyLoanType(instanceId, newType)
│             // Triggers full recalculation
│           }
├── TimelineItem (Property 2)
│   └── LoanTypeToggle ← NEW (independent)
│       ├── instanceId: 'property_0_instance_1'
│       └── current: 'PI'
└── TimelineItem (Property 3)
    └── LoanTypeToggle ← NEW (independent)
        ├── instanceId: 'property_1_instance_0'
        └── current: 'IO'
```

## Recalculation Trigger Flow

```
User clicks P&I on Property #2
         ↓
updateTimelinePropertyLoanType('property_0_instance_1', 'PI')
         ↓
setTimelineLoanTypes({ ...prev, 'property_0_instance_1': 'PI' })
         ↓
State change triggers useMemo recalculation
         ↓
calculateTimelineProperties runs
         ↓
For each property:
  - Get instanceId
  - Get loanType from timelineLoanTypes[instanceId]
  - Calculate loan payments using correct type
  - Check affordability with updated cashflow
  - Update timeline positions
         ↓
UI re-renders with updated timeline
         ↓
Property #2 shows P&I selected
Property #3+ may shift to later periods (higher debt service)
```

## Impact Example: IO vs P&I

```
Scenario: $360,000 loan at 6% interest rate

┌─────────────────────────────────┐
│ Interest Only (IO)              │
├─────────────────────────────────┤
│ Annual Payment: $21,600         │
│ (Interest only: $360k × 6%)     │
│                                 │
│ Better for:                     │
│ ✓ Cashflow                      │
│ ✓ Tax deductions                │
│ ✓ Keeping debt constant         │
│ ✓ Faster acquisition            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Principal & Interest (P&I)      │
├─────────────────────────────────┤
│ Annual Payment: ~$25,900        │
│ (Principal + Interest)          │
│                                 │
│ Better for:                     │
│ ✓ Building equity faster        │
│ ✓ Reducing debt over time       │
│ ✓ Long-term hold properties     │
│ ✓ Eventual debt freedom         │
└─────────────────────────────────┘

Difference: ~$4,300/year higher payment with P&I
Impact: Reduces borrowing capacity for next property
Result: May delay subsequent purchases in timeline
```

## localStorage Structure

```
Before (per-type):
localStorage['property_loan_types_123'] = {
  "property_0": "IO",    // All Units/Apartments
  "property_1": "PI",    // All Houses
  "custom_xyz": "IO"     // All Custom blocks
}

After (per-instance):
localStorage['timeline_loan_types_123'] = {
  "property_0_instance_0": "IO",   // Unit #1
  "property_0_instance_1": "PI",   // Unit #2
  "property_0_instance_2": "IO",   // Unit #3
  "property_1_instance_0": "PI",   // House #1
  "property_1_instance_1": "IO"    // House #2
}
```

## Testing Scenarios

### Scenario 1: Mixed Strategy
```
Add 3 Units / Apartments to timeline

Timeline shows:
┌─────────────────────────────────┐
│ 2025 H1: Unit #1                │
│ Loan: [IO]✓ [P&I]  DEFAULT     │ ← Good cashflow early
└─────────────────────────────────┘

Change Unit #2 to P&I:
┌─────────────────────────────────┐
│ 2026 H1: Unit #2                │
│ Loan: [IO] [P&I]✓   CHANGED    │ ← Building equity
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 2027 H2: Unit #3                │ ← Note: Delayed due to
│ Loan: [IO]✓ [P&I]  DEFAULT     │    higher P&I payments
└─────────────────────────────────┘

Result: Flexible strategy, realistic modeling
```

### Scenario 2: Persistence Test
```
1. Set Unit #1 to P&I
2. Set Unit #2 to IO
3. Refresh page
4. Verify: Settings preserved ✓
5. Switch to different client
6. Switch back
7. Verify: Settings still preserved ✓
```

### Scenario 3: Affordability Impact
```
Portfolio with 2 properties:
- Property A: $360k loan at IO → $21,600/yr
- Property B: $360k loan at IO → $21,600/yr
- Total debt service: $43,200/yr

Change Property A to P&I:
- Property A: $360k loan at P&I → $25,900/yr
- Property B: $360k loan at IO → $21,600/yr
- Total debt service: $47,500/yr
- Impact: Reduced capacity for Property C
- Result: Property C delayed by 1-2 periods ✓
```

## Summary

The refactoring provides:

1. **Granular Control**: Each property instance is independent
2. **Realistic Modeling**: Mix IO and P&I in same portfolio
3. **Clear UX**: Toggle where the decision matters (timeline)
4. **Accurate Calculations**: True cashflow and serviceability
5. **Proper Persistence**: Settings saved per instance
6. **Clean Architecture**: Per-instance state management

The knock-on effect on affordability is correctly implemented - changing one property's loan type appropriately affects all subsequent purchase timing and feasibility calculations.

