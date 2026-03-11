# Timeline Generator - Usage Examples

## Example 1: Basic Growth Portfolio (No Gaps)

### Input Data
```typescript
const propertySelections = [
  {
    id: 'prop1',
    title: 'Sydney Unit - Growth',
    cost: 500000,
    affordableYear: 2025,
    yield: '4.5',
    growth: '6.5',
    status: 'feasible'
  },
  {
    id: 'prop2',
    title: 'Melbourne Apartment',
    cost: 600000,
    affordableYear: 2027,
    yield: '5.0',
    growth: '6.0',
    status: 'feasible'
  },
  {
    id: 'prop3',
    title: 'Brisbane House',
    cost: 750000,
    affordableYear: 2029,
    yield: '4.8',
    growth: '7.0',
    status: 'feasible'
  }
];

const investmentProfile = {
  depositPool: 100000,
  borrowingCapacity: 1500000,
  annualSavings: 48000,
  equityGoal: 5000000,
  targetYear: 2040
};
```

### Generated Timeline Output

```
Property 1 (2025)
├─ Milestone: "Foundation property established. Asset selected for Growth to build initial equity base."
└─ Next Move: "Property 2 feasible in 2027 → $150k equity released to fund deposit."

Property 2 (2027)
├─ Milestone: "Portfolio expansion utilizing released equity from Property 1."
└─ Next Move: "Property 3 feasible in 2029 → $188k equity released to fund deposit."

Property 3 (2029) [LAST]
├─ Milestone: "Portfolio expansion utilizing released equity from Property 2."
└─ Next Move: "Portfolio consolidation phase begins."
```

---

## Example 2: High-Yield Strategy

### Input Data
```typescript
const propertySelections = [
  {
    id: 'prop1',
    title: 'Regional Investment Unit',
    cost: 400000,
    affordableYear: 2025,
    yield: '5.8',
    growth: '4.5',
    status: 'feasible'
  },
  {
    id: 'prop2',
    title: 'Student Accommodation',
    cost: 450000,
    affordableYear: 2027,
    yield: '6.2',
    growth: '4.0',
    status: 'feasible'
  }
];
```

### Generated Timeline Output

```
Property 1 (2025)
├─ Milestone: "Foundation property established. Asset selected for Yield to build initial equity base."
└─ Next Move: "Property 2 feasible in 2027 → $113k equity released to fund deposit."

Property 2 (2027) [LAST]
├─ Milestone: "High-yield asset added to boost portfolio cashflow and serviceability."
└─ Next Move: "Portfolio consolidation phase begins."
```

**Note**: Property 1 detected as Yield-focused (5.8% > 4.5% growth)
**Note**: Property 2 detected as High-yield (>5%)

---

## Example 3: Commercial Diversification

### Input Data
```typescript
const propertySelections = [
  {
    id: 'prop1',
    title: 'Residential Unit - Sydney',
    cost: 600000,
    affordableYear: 2025,
    yield: '4.5',
    growth: '6.0',
    status: 'feasible'
  },
  {
    id: 'prop2',
    title: 'Retail Commercial Space',
    cost: 1200000,
    affordableYear: 2030,
    yield: '7.2',
    growth: '5.0',
    type: 'commercial',
    status: 'feasible'
  }
];
```

### Generated Timeline Output

```
Property 1 (2025)
├─ Milestone: "Foundation property established. Asset selected for Growth to build initial equity base."
└─ Next Move: "Property 2 feasible in 2030 → $300k equity released to fund deposit."

Property 2 (2030) [LAST]
├─ Milestone: "Strategic commercial acquisition to diversify income streams."
└─ Next Move: "Portfolio consolidation phase begins."
```

**Note**: Commercial property automatically detected via `type: 'commercial'`

---

## Example 4: Gap Year Detection (Auto-Milestone Insertion)

### Input Data
```typescript
const propertySelections = [
  {
    id: 'prop1',
    title: 'Entry Property',
    cost: 500000,
    affordableYear: 2025,
    yield: '4.5',
    growth: '6.0',
    status: 'feasible'
  },
  {
    id: 'prop2',
    title: 'Second Property',
    cost: 600000,
    affordableYear: 2029,  // 4-year gap
    yield: '5.0',
    growth: '6.0',
    status: 'feasible'
  },
  {
    id: 'prop3',
    title: 'Third Property',
    cost: 750000,
    affordableYear: 2034,  // 5-year gap
    yield: '5.5',
    growth: '6.5',
    status: 'feasible'
  }
];
```

### Generated Timeline Output

```
Property 1 (2025)
├─ Milestone: "Foundation property established. Asset selected for Growth to build initial equity base."
└─ Next Move: "Property 2 feasible in 2029 → $150k equity released to fund deposit."

⭐ MILESTONE MARKER (2027) ⭐  [AUTO-INSERTED: Gap > 3 years]
├─ Title: "Portfolio Review & Equity Assessment"
└─ Description: "Mid-cycle review to assess equity position and serviceability for next phase."

Property 2 (2029)
├─ Milestone: "Portfolio expansion utilizing released equity from Property 1."
└─ Next Move: "Property 3 feasible in 2034 → $188k equity released to fund deposit."

⭐ MILESTONE MARKER (2031) ⭐  [AUTO-INSERTED: Gap > 3 years]
├─ Title: "Portfolio Review & Equity Assessment"
└─ Description: "Mid-cycle review to assess equity position and serviceability for next phase."

Property 3 (2034) [LAST]
├─ Milestone: "High-yield asset added to boost portfolio cashflow and serviceability."
└─ Next Move: "Portfolio consolidation phase begins."
```

**Note**: Midpoint markers inserted automatically at years 2027 and 2031

---

## Example 5: Mixed Strategy with All Features

### Input Data
```typescript
const propertySelections = [
  {
    id: 'prop1',
    title: 'Foundation Growth Property',
    cost: 550000,
    affordableYear: 2025,
    yield: '4.2',
    growth: '7.0',
    status: 'feasible'
  },
  {
    id: 'prop2',
    title: 'High-Yield Regional Unit',
    cost: 400000,
    affordableYear: 2027,
    yield: '6.5',
    growth: '4.5',
    status: 'feasible'
  },
  {
    id: 'prop3',
    title: 'Commercial Office Space',
    cost: 1500000,
    affordableYear: 2033,  // 6-year gap from previous
    yield: '7.8',
    growth: '5.0',
    type: 'commercial',
    status: 'feasible'
  },
  {
    id: 'prop4',
    title: 'Final Residential Addition',
    cost: 700000,
    affordableYear: 2036,
    yield: '5.2',
    growth: '6.0',
    status: 'feasible'
  }
];
```

### Generated Timeline Output

```
Property 1 (2025) 🏡
├─ Purchase: $550k | Equity: $100k
├─ Yield: 4.2% | Cashflow: -$3.2k p.a.
├─ Milestone: "Foundation property established. Asset selected for Growth to build initial equity base."
└─ Next Move: "Property 2 feasible in 2027 → $100k equity released to fund deposit."

Property 2 (2027) 🏡
├─ Purchase: $400k | Equity: $180k
├─ Yield: 6.5% | Cashflow: +$1.8k p.a.
├─ Milestone: "High-yield asset added to boost portfolio cashflow and serviceability."
└─ Next Move: "Property 3 feasible in 2033 → $375k equity released to fund deposit."

⭐ MILESTONE (2030) ✓
├─ Title: "Portfolio Review & Equity Assessment"
└─ Description: "Mid-cycle review to assess equity position and serviceability for next phase."

Property 3 (2033) 🏢
├─ Purchase: $1.5M | Equity: $520k
├─ Yield: 7.8% | Cashflow: +$18k p.a.
├─ Milestone: "Strategic commercial acquisition to diversify income streams."
└─ Next Move: "Property 4 feasible in 2036 → $175k equity released to fund deposit."

Property 4 (2036) 🏡 [LAST]
├─ Purchase: $700k | Equity: $980k
├─ Yield: 5.2% | Cashflow: +$25k p.a.
├─ Milestone: "Portfolio expansion utilizing released equity from Property 3."
└─ Next Move: "Portfolio consolidation phase begins."
```

**Intelligent Features Demonstrated**:
1. ✅ Growth-focused foundation property detected
2. ✅ High-yield property (>5%) narrative
3. ✅ Gap detection: 6-year gap → milestone inserted at 2030
4. ✅ Commercial property detection and narrative
5. ✅ Dynamic equity calculations for each next move
6. ✅ Final property marked with consolidation message

---

## Detection Logic Summary

### 1. Foundation Property Narrative
```typescript
if (propertyNumber === 1) {
  if (growthValue > yieldValue) {
    return "Foundation property established. Asset selected for Growth...";
  } else {
    return "Foundation property established. Asset selected for Yield...";
  }
}
```

### 2. Commercial Property Detection
```typescript
const isCommercial = 
  title.includes('commercial') || 
  type.includes('commercial') || 
  category.includes('commercial') ||
  title.includes('retail') ||
  title.includes('office') ||
  title.includes('industrial');

if (isCommercial) {
  return "Strategic commercial acquisition to diversify income streams.";
}
```

### 3. High-Yield Detection
```typescript
const yieldValue = parseFloat(property.yield || '0');

if (yieldValue > 5) {
  return "High-yield asset added to boost portfolio cashflow and serviceability.";
}
```

### 4. Gap Detection & Milestone Insertion
```typescript
const gap = nextYear - currentYear;

if (gap > 3) {
  const midpointYear = Math.round(currentYear + gap / 2);
  
  // Insert milestone marker
  {
    type: 'milestone',
    year: midpointYear,
    title: "Portfolio Review & Equity Assessment",
    description: "Mid-cycle review to assess equity position and serviceability for next phase."
  }
}
```

### 5. Next Move Calculation
```typescript
const nextDepositRequired = (nextProperty.cost || 0) * 0.2;    // 20% deposit
const acquisitionCosts = (nextProperty.cost || 0) * 0.05;       // 5% costs
const totalRequired = nextDepositRequired + acquisitionCosts;

return `Property ${nextPropertyNumber} feasible in ${nextYear} → ${formatCurrency(totalRequired)} equity released to fund deposit.`;
```

---

## Testing Scenarios

### Scenario A: Empty Portfolio
```typescript
generateTimelineData([], investmentProfile)
// Returns: []
```

### Scenario B: Single Property
```typescript
generateTimelineData([
  { cost: 500000, affordableYear: 2025, yield: '4.5', growth: '6.0', status: 'feasible' }
], investmentProfile)
// Returns: 1 property entry with "Portfolio consolidation phase begins."
```

### Scenario C: Two Properties (Close Years)
```typescript
// Properties in 2025 and 2027 (2-year gap)
// Result: 2 property entries, NO milestone inserted (gap ≤ 3)
```

### Scenario D: Two Properties (Wide Gap)
```typescript
// Properties in 2025 and 2030 (5-year gap)
// Result: 3 entries (Property → Milestone → Property)
```

---

## Return Type Structure

```typescript
type TimelineItem = PropertyTimelineEntry | MilestoneTimelineEntry

// Property Entry Example
{
  type: 'property',
  propertyNumber: 1,
  year: 2025,
  purchasePrice: '$500k',
  equity: '$100k',
  yield: '4.5%',
  cashflow: '-$2.4k p.a.',
  milestone: 'Foundation property established...',
  nextMove: 'Property 2 feasible in 2027 → $125k equity released...',
  isLast: false
}

// Milestone Entry Example
{
  type: 'milestone',
  year: 2027,
  title: 'Portfolio Review & Equity Assessment',
  description: 'Mid-cycle review to assess equity position...',
  isLast: false
}
```

---

## Edge Cases Handled

1. **No Properties**: Returns empty array `[]`
2. **Missing Fields**: Defaults applied (yield: 4%, growth: 6%, cost: 0)
3. **Last Property**: `isLast: true` + "Portfolio consolidation phase begins."
4. **Multiple Gaps**: Multiple milestones inserted independently
5. **Exact 3-Year Gap**: No milestone (threshold is `> 3`)
6. **Commercial Detection**: Case-insensitive, checks title/type/category
7. **Fractional Years**: Rounded to nearest integer for display

