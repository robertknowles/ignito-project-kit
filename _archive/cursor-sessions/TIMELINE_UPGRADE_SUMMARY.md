# Intelligent Timeline Logic - Implementation Summary

## Overview
Upgraded `src/client-view/utils/timelineGenerator.ts` to replace static timeline generation with a narrative-driven engine that interprets the investment journey with advisor-style commentary.

## Key Features Implemented

### 1. Enhanced Type Definitions
- **Base Interface**: `BaseTimelineItem` for common properties
- **Property Entry**: `PropertyTimelineEntry` (type: 'property') - full property details
- **Milestone Entry**: `MilestoneTimelineEntry` (type: 'milestone') - gap year markers
- **Union Type**: `TimelineItem` exported type combining both entry types

### 2. Intelligent Narrative Milestones

The `generateMilestoneNarrative()` function provides context-aware descriptions:

#### First Purchase (index === 0)
- **Growth-focused**: "Foundation property established. Asset selected for Growth to build initial equity base."
- **Yield-focused**: "Foundation property established. Asset selected for Yield to build initial equity base."

#### High Yield Properties (>5%)
- "High-yield asset added to boost portfolio cashflow and serviceability."

#### Commercial Properties
- Detects commercial via title/type/category containing: commercial, retail, office, industrial
- "Strategic commercial acquisition to diversify income streams."

#### Standard Expansion
- "Portfolio expansion utilizing released equity from Property [N-1]."

### 3. Dynamic "Next Move" Guidance

The `generateNextMove()` function calculates and displays:

- **Next property details**: Property number and year feasibility
- **Equity calculation**: Deposit (20%) + acquisition costs (~5%)
- **Example output**: "Property 2 feasible in 2028 → $125k equity released to fund deposit."
- **Final property**: "Portfolio consolidation phase begins."

### 4. Gap Year Detection

Automatically inserts milestone markers for investment pauses:

- **Logic**: If gap between properties > 3 years
- **Placement**: Midpoint year between properties
- **Title**: "Portfolio Review & Equity Assessment"
- **Description**: "Mid-cycle review to assess equity position and serviceability for next phase."

### 5. Visual Design

Created `MilestoneCard` component with distinctive styling:
- **Color scheme**: Amber/orange gradient background (vs blue for properties)
- **Icon**: CheckCircle2 icon for milestone markers
- **Border**: Amber-colored timeline dot
- **Layout**: Consistent with PropertyCard but visually distinct

## Files Modified

### Core Logic
- `src/client-view/utils/timelineGenerator.ts` - Complete overhaul with intelligent narrative engine

### Components
- `src/client-view/components/MilestoneCard.tsx` - New milestone marker component
- `src/client-view/components 2/MilestoneCard.tsx` - Duplicate for consistency

### Pages
- `src/client-view/pages/PropertyTimelinePage.tsx` - Updated to handle mixed timeline items

## Usage Example

```typescript
const timelineData = generateTimelineData(propertySelections, investmentProfile);

// Returns array of TimelineItem (union type)
// Can be PropertyTimelineEntry or MilestoneTimelineEntry

timelineData.map((item) => {
  if (item.type === 'milestone') {
    return <MilestoneCard {...item} />;
  } else {
    return <TimelineCard {...item} />;
  }
});
```

## Property Detection Logic

### Commercial Property Detection
```typescript
const isCommercial = 
  title.includes('commercial') || 
  type.includes('commercial') || 
  category.includes('commercial') ||
  title.includes('retail') ||
  title.includes('office') ||
  title.includes('industrial');
```

### Growth vs Yield Classification
```typescript
const yieldValue = parseFloat(property.yield || '0');
const growthValue = parseFloat(property.growth || '0');

if (growthValue > yieldValue) {
  // Growth-focused
} else {
  // Yield-focused
}
```

## Expected Outcome

Page 3 now reads like a strategic roadmap:

1. **2025**: "Foundation established. Asset selected for Growth to build initial equity base."
   - **Next Move**: "Property 2 feasible in 2027 → $110k equity released to fund deposit."

2. **2027**: "Portfolio expansion utilizing released equity from Property 1."
   - **Next Move**: "Property 3 feasible in 2029 → $140k equity released to fund deposit."

3. **2030** [Milestone]: "Portfolio Review & Equity Assessment"
   - Mid-cycle review marker (auto-inserted for 4+ year gaps)

4. **2034**: "Strategic commercial acquisition to diversify income streams."
   - **Next Move**: "Portfolio consolidation phase begins."

## Technical Details

### Gap Detection Algorithm
```typescript
const gap = nextYear - currentYear;
if (gap > 3) {
  const midpointYear = Math.round(currentYear + gap / 2);
  // Insert milestone marker
}
```

### Equity Calculation (Next Move)
```typescript
const nextDepositRequired = (nextProperty.cost || 0) * 0.2; // 20% deposit
const acquisitionCosts = (nextProperty.cost || 0) * 0.05; // ~5% stamp duty/fees
const totalRequired = nextDepositRequired + acquisitionCosts;
```

## Benefits

1. **Advisor-style Commentary**: Reads like professional advice, not robotic output
2. **Context Awareness**: Adapts narrative based on property characteristics
3. **Financial Reasoning**: Shows specific dollar amounts and equity logic
4. **Visual Hierarchy**: Milestones visually distinct from property acquisitions
5. **Automatic Gap Handling**: No manual intervention needed for sparse timelines

## Future Enhancements

Potential additions:
- Refinance milestone markers
- Debt consolidation suggestions
- Tax optimization triggers
- Market cycle indicators
- Risk assessment checkpoints

