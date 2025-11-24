# Timeline Structure - Visual Guide

## Timeline Flow with Intelligent Narratives

```
┌─────────────────────────────────────────────────────────────┐
│  Property Investment Timeline                                │
│  20-Year Investment Roadmap                                  │
└─────────────────────────────────────────────────────────────┘

     │
     │  VERTICAL TIMELINE LINE (blue)
     │
    ⊕ 2025  ───────────────────────────────────────┐
     │                                              │
     │  🏡 Property 1                               │  PROPERTY CARD
     │  Purchase: $500k | Equity: $100k             │  (white, blue border)
     │  Yield: 4.5% | Cashflow: -$2.4k p.a.         │
     │                                              │
     │  💡 "Foundation property established.        │  MILESTONE TEXT
     │      Asset selected for Growth to build      │  (blue background)
     │      initial equity base."                   │
     │                                              │
     │  📈 Next Move:                               │  NEXT MOVE
     │  Property 2 feasible in 2027 → $125k         │  (with TrendingUp icon)
     │  equity released to fund deposit.            │
     └──────────────────────────────────────────────┘
     │
     │
    ⊕ 2027  ───────────────────────────────────────┐
     │                                              │
     │  🏡 Property 2                               │  PROPERTY CARD
     │  Purchase: $600k | Equity: $230k             │
     │  Yield: 5.2% | Cashflow: +$1.8k p.a.         │
     │                                              │
     │  💡 "High-yield asset added to boost         │  SMART NARRATIVE
     │      portfolio cashflow and serviceability." │  (detects >5% yield)
     │                                              │
     │  📈 Next Move:                               │
     │  Property 3 feasible in 2032 → $160k         │
     │  equity released to fund deposit.            │
     └──────────────────────────────────────────────┘
     │
     │  ... GAP > 3 YEARS DETECTED ...
     │
    ⊙ 2030  ───────────────────────────────────────┐
     │                                              │
     │  ✓ Portfolio Review & Equity Assessment     │  MILESTONE MARKER
     │                                              │  (amber gradient)
     │  "Mid-cycle review to assess equity          │  (amber border)
     │   position and serviceability for next       │
     │   phase."                                    │
     └──────────────────────────────────────────────┘
     │
     │
    ⊕ 2032  ───────────────────────────────────────┐
     │                                              │
     │  🏡 Property 3                               │  PROPERTY CARD
     │  Purchase: $750k | Equity: $420k             │
     │  Yield: 4.8% | Cashflow: +$5.2k p.a.         │
     │                                              │
     │  💡 "Portfolio expansion utilizing released  │  STANDARD NARRATIVE
     │      equity from Property 2."                │
     │                                              │
     │  📈 Next Move:                               │
     │  Property 4 feasible in 2035 → $300k         │
     │  equity released to fund deposit.            │
     └──────────────────────────────────────────────┘
     │
     │
    ⊕ 2035  ───────────────────────────────────────┐
     │                                              │
     │  🏡 Property 4                               │  PROPERTY CARD
     │  Purchase: $1.2M | Equity: $680k             │
     │  Yield: 7.2% | Cashflow: +$15k p.a.          │
     │                                              │
     │  💡 "Strategic commercial acquisition to     │  COMMERCIAL DETECTION
     │      diversify income streams."              │  (auto-detected)
     │                                              │
     │  📈 Next Move:                               │  FINAL PROPERTY
     │  Portfolio consolidation phase begins.       │
     └──────────────────────────────────────────────┘
     │
     │
    ⊕ 2045  ───────────────────────────────────────┐
     │                                              │
     │  🎯 Goal Achieved                            │  GOAL CARD
     │  Financial Independence Reached               │
     │  Portfolio Value: $7M                        │
     └──────────────────────────────────────────────┘

```

## Visual Legend

| Symbol | Type | Color | Purpose |
|--------|------|-------|---------|
| ⊕ | Property | Blue border | Property acquisition |
| ⊙ | Milestone | Amber border | Portfolio review/gap marker |
| 🎯 | Goal | Green accent | Final goal achievement |

## Narrative Decision Tree

```
Property Added to Timeline
    |
    ├─ Is First Property (index = 0)?
    │   ├─ Yes → Check Growth vs Yield
    │   │   ├─ Growth > Yield → "Foundation property... Growth to build equity"
    │   │   └─ Yield > Growth → "Foundation property... Yield to build equity"
    │   │
    │   └─ No → Continue to next check
    │
    ├─ Is Commercial Property?
    │   ├─ Yes → "Strategic commercial acquisition to diversify income"
    │   └─ No → Continue to next check
    │
    ├─ Is High Yield (>5%)?
    │   ├─ Yes → "High-yield asset to boost cashflow and serviceability"
    │   └─ No → Continue to next check
    │
    └─ Standard → "Portfolio expansion utilizing equity from Property N-1"
```

## Next Move Calculation

```
Current Property at Year X
    |
    ├─ Is there a Next Property?
    │   |
    │   ├─ Yes → Calculate Requirements
    │   │   |
    │   │   ├─ Next Property Cost: $600k
    │   │   ├─ Deposit (20%): $120k
    │   │   ├─ Acquisition (5%): $30k
    │   │   └─ Total Required: $150k
    │   │
    │   │   → Display: "Property N feasible in YYYY → $150k equity released"
    │   │
    │   └─ No → Display: "Portfolio consolidation phase begins."
    |
    └─ Check Gap to Next Property
        |
        ├─ Gap > 3 years?
        │   ├─ Yes → Insert Milestone at Midpoint Year
        │   │   └─ "Portfolio Review & Equity Assessment"
        │   └─ No → Continue to next property
        |
        └─ Continue timeline
```

## Component Structure

```typescript
// Type Definitions
type TimelineItem = PropertyTimelineEntry | MilestoneTimelineEntry

interface PropertyTimelineEntry {
  type: 'property'
  propertyNumber: number
  year: number
  purchasePrice: string
  equity: string
  yield: string
  cashflow: string
  milestone: string      // ← Intelligent narrative
  nextMove: string       // ← Dynamic guidance
  isLast?: boolean
}

interface MilestoneTimelineEntry {
  type: 'milestone'
  year: number
  title: string
  description: string
  isLast?: boolean
}

// Rendering Logic
{timelineData.map((item) => {
  if (item.type === 'milestone') {
    return <MilestoneCard {...item} />   // Amber styling
  } else {
    return <TimelineCard {...item} />    // Blue styling
  }
})}
```

## Styling Differences

### Property Card (TimelineCard)
- **Dot**: Blue border (`border-blue-500`)
- **Background**: White (`bg-white`)
- **Icon**: 🏡 House emoji
- **Sections**: Purchase details, milestone text, next move

### Milestone Card (MilestoneCard)
- **Dot**: Amber border (`border-amber-500`)
- **Background**: Amber gradient (`from-amber-50 to-orange-50`)
- **Icon**: CheckCircle2 (lucide-react)
- **Content**: Title + description only

## Data Flow

```
PropertySelections[] + InvestmentProfile
    ↓
generateTimelineData()
    ↓
    ├─ Filter feasible properties
    ├─ Sort by affordableYear
    ├─ For each property:
    │   ├─ Generate intelligent milestone narrative
    │   ├─ Calculate next move guidance
    │   ├─ Check gap to next property
    │   └─ Insert milestone if gap > 3 years
    ↓
TimelineItem[] (mixed array)
    ↓
PropertyTimelinePage component
    ↓
Render with conditional logic
    ├─ item.type === 'property' → TimelineCard
    └─ item.type === 'milestone' → MilestoneCard
```

