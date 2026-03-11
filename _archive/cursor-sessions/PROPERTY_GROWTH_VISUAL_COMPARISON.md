# Property Growth Rate Refactor - Visual Comparison

## UI Changes

### Before: Global Growth Curve + Simple Table

**Investment Assumptions Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Investment Assumptions                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Global Economic Factors                                     │
│ ┌─────────────┬─────────────┬─────────────────────────┐  │
│ │ Growth Rate │     LVR     │   Interest Rate         │  │
│ │     7%      │     80%     │         6%              │  │
│ └─────────────┴─────────────┴─────────────────────────┘  │
│                                                             │
│ Property Growth Curve                          [REMOVED]   │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Customize property value growth rates...             │  │
│ │                                                       │  │
│ │ Year 1: [12.5%]    Years 2-3: [10%]                 │  │
│ │ Year 4: [7.5%]     Year 5+: [6%]                    │  │
│ │                                                       │  │
│ │ [Bar Chart Visualization]                            │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
│ Property-Specific Assumptions                               │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Property Type   │ Avg Cost │ Yield │ Growth │ Dep % │  │
│ │────────────────────────────────────────────────────│  │
│ │ Units/Apts      │ 350,000  │   7%  │   5%   │  15%  │  │
│ │ Villas/Towns    │ 325,000  │   7%  │   6%   │  15%  │  │
│ │ ...             │   ...    │  ...  │  ...   │  ...  │  │
│ └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### After: Per-Property Tiered Growth Rates

**Investment Assumptions Page Layout:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Investment Assumptions                                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Global Economic Factors                                                      │
│ ┌─────────────┬─────────────┬─────────────────────────┐                   │
│ │ Growth Rate │     LVR     │   Interest Rate         │                   │
│ │     7%      │     80%     │         6%              │                   │
│ └─────────────┴─────────────┴─────────────────────────┘                   │
│                                                                              │
│ Property-Specific Assumptions                                                │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Property Type   │ Avg Cost │ Yield │ Y1 │ Y2-3 │ Y4  │ Y5+ │ Dep %  │ │
│ │────────────────────────────────────────────────────────────────────────│ │
│ │ Units/Apts      │ 350,000  │   7%  │12.5│ 10%  │ 7.5 │  6% │   15%  │ │
│ │ Villas/Towns    │ 325,000  │   7%  │12.5│ 10%  │ 7.5 │  6% │   15%  │ │
│ │ Houses (Reg)    │ 350,000  │   7%  │12.5│ 10%  │ 7.5 │  6% │   15%  │ │
│ │ Granny Flats    │ 195,000  │   9%  │ 0  │  0   │  0  │  0  │  100%  │ │
│ │ Duplexes        │ 550,000  │   7%  │12.5│ 10%  │ 7.5 │  6% │   15%  │ │
│ │ Small Blocks    │ 900,000  │   7%  │12.5│ 10%  │ 7.5 │  6% │   20%  │ │
│ │ Metro Houses    │ 800,000  │   4%  │12.5│ 10%  │ 7.5 │  6% │   15%  │ │
│ │ Larger Blocks   │3,500,000 │   7%  │12.5│ 10%  │ 7.5 │  6% │   45%  │ │
│ │ Commercial      │3,000,000 │   8%  │12.5│ 10%  │ 7.5 │  6% │   40%  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data Model Changes

### Before: Single Growth Field
```typescript
// Each property had ONE growth rate
{
  type: 'Units / Apartments',
  averageCost: '350000',
  yield: '7',
  growth: '5',          // ← Single value used for all years
  deposit: '15',
  loanType: 'IO'
}
```

### After: Tiered Growth Fields
```typescript
// Each property has FOUR growth rates
{
  type: 'Units / Apartments',
  averageCost: '350000',
  yield: '7',
  growthYear1: '12.5',      // ← Year 1 specific
  growthYears2to3: '10',    // ← Years 2-3 specific
  growthYear4: '7.5',       // ← Year 4 specific
  growthYear5plus: '6',     // ← Year 5+ specific
  deposit: '15',
  loanType: 'IO'
}
```

## Calculation Flow Changes

### Before: Global Growth Curve Applied to All Properties

```
┌──────────────────────────────────────────────────────┐
│              Investment Profile                       │
│  growthCurve: {                                      │
│    year1: 12.5%                                      │
│    years2to3: 10%                                    │
│    year4: 7.5%                                       │
│    year5plus: 6%                                     │
│  }                                                   │
└──────────────────────────┬───────────────────────────┘
                          │ Applied to ALL properties
                          ▼
┌──────────────────────────────────────────────────────┐
│         calculatePropertyGrowth()                     │
│  • Unit/Apartment grows at 12.5% Year 1             │
│  • Villa/Townhouse grows at 12.5% Year 1            │
│  • Metro House grows at 12.5% Year 1                │
│  • Commercial grows at 12.5% Year 1                  │
│  [All properties use SAME curve]                     │
└──────────────────────────────────────────────────────┘
```

### After: Per-Property Growth Curves

```
┌──────────────────────────────────────────────────────┐
│         Property Assumptions (Per Type)               │
├──────────────────────────────────────────────────────┤
│ Units/Apartments:                                     │
│   growthYear1: 12.5%, years2to3: 10%, ...           │
├──────────────────────────────────────────────────────┤
│ Villas/Townhouses:                                    │
│   growthYear1: 12.5%, years2to3: 10%, ...           │
├──────────────────────────────────────────────────────┤
│ Granny Flats:                                         │
│   growthYear1: 0%, years2to3: 0%, ...               │
└──────────┬────────────────────────────────────────┬──┘
           │                                        │
           ▼                                        ▼
┌──────────────────────┐              ┌──────────────────────┐
│ calculatePropertyGrowth()           │ calculatePropertyGrowth()
│ (Units/Apartments)                  │ (Granny Flats)        │
│ • Uses 12.5% Year 1                 │ • Uses 0% Year 1      │
│ • Uses 10% Years 2-3                │ • Uses 0% Years 2-3   │
│ • Uses 7.5% Year 4                  │ • Uses 0% Year 4      │
│ • Uses 6% Year 5+                   │ • Uses 0% Year 5+     │
└──────────────────────┘              └──────────────────────┘
      [Independent]                        [Independent]
```

## Example: Property Value Over Time

### Scenario: $500,000 Unit/Apartment

**Before (Using Global Curve 5% flat):**
```
Year 1: $500,000 → $525,000  (+5%)
Year 2: $525,000 → $551,250  (+5%)
Year 3: $551,250 → $578,813  (+5%)
Year 4: $578,813 → $607,753  (+5%)
Year 5: $607,753 → $638,141  (+5%)
```

**After (Using Per-Property Tiered Rates):**
```
Year 1: $500,000 → $562,500  (+12.5%)  [Property-specific Y1 rate]
Year 2: $562,500 → $618,750  (+10%)    [Property-specific Y2-3 rate]
Year 3: $618,750 → $680,625  (+10%)    [Property-specific Y2-3 rate]
Year 4: $680,625 → $731,672  (+7.5%)   [Property-specific Y4 rate]
Year 5: $731,672 → $775,572  (+6%)     [Property-specific Y5+ rate]
```

### Scenario: $195,000 Granny Flat

**Before (Using Global Curve):**
```
Year 1: $195,000 → $219,375  (+12.5%)  [Incorrect - should be 0%]
Year 2: $219,375 → $241,313  (+10%)    [Incorrect - should be 0%]
Year 3: $241,313 → $265,444  (+10%)    [Incorrect - should be 0%]
Year 4: $265,444 → $285,352  (+7.5%)   [Incorrect - should be 0%]
Year 5: $285,352 → $302,473  (+6%)     [Incorrect - should be 0%]
```

**After (Using Granny Flat-Specific Rates):**
```
Year 1: $195,000 → $195,000  (+0%)     [Correct - no capital growth]
Year 2: $195,000 → $195,000  (+0%)     [Correct - no capital growth]
Year 3: $195,000 → $195,000  (+0%)     [Correct - no capital growth]
Year 4: $195,000 → $195,000  (+0%)     [Correct - no capital growth]
Year 5: $195,000 → $195,000  (+0%)     [Correct - no capital growth]
```

## Key Benefits Visualized

```
GLOBAL CURVE (Before)          PER-PROPERTY CURVES (After)
     One-Size-Fits-All         →    Tailored for Each Type
  
┌──────────────────┐           ┌──────────────────┐
│   12.5% Y1       │           │ Units: 12.5% Y1  │
│   Applied to:    │           │ Villas: 12.5% Y1 │
│   - Units        │           │ Granny: 0% Y1    │
│   - Villas       │      →    │ Commercial: 12.5%│
│   - Granny Flats │           └──────────────────┘
│   - Commercial   │           Each property can have
│   - ALL others   │           DIFFERENT growth rates
└──────────────────┘           per year tier!
   Unrealistic                    Realistic
```

## Affordability Calculation Impact

### Example Timeline: Buying 3 Properties

**Before:**
```
2025 H1: Buy Unit ($350k) → Grows at global 12.5% Y1
2025 H2: Buy Villa ($325k) → Grows at global 12.5% Y1
2026 H1: Buy Granny Flat ($195k) → Grows at global 12.5% Y1 ⚠️ Wrong!
```

**After:**
```
2025 H1: Buy Unit ($350k) → Grows at Unit-specific 12.5% Y1
2025 H2: Buy Villa ($325k) → Grows at Villa-specific 12.5% Y1  
2026 H1: Buy Granny Flat ($195k) → Grows at Granny-specific 0% Y1 ✓ Correct!
```

### Equity Calculation Example (After 2 Years)

**Before (Global Curve):**
- Unit: $350k → $433k (equity incorrectly inflated)
- Granny Flat: $195k → $242k (equity incorrectly inflated) ⚠️

**After (Per-Property Curves):**
- Unit: $350k → $433k (correct)
- Granny Flat: $195k → $195k (correct - no false equity) ✓

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Growth Rates per Property** | 1 (inherited from global) | 4 (property-specific tiers) |
| **UI Sections** | 2 (Global Curve + Table) | 1 (Integrated Table) |
| **Accuracy** | One-size-fits-all | Property-specific |
| **Granny Flats** | Incorrect capital growth | Correct 0% growth |
| **User Control** | Limited (4 global inputs) | Extensive (4 inputs × 9 properties = 36 inputs) |
| **Realism** | Low (all properties grow same) | High (each property independent) |
| **Calculation Calls** | profile.growthCurve | propertyAssumption object |
| **Code Complexity** | Lower (shared curve) | Slightly higher (per-property) |
| **Flexibility** | Low | High |

