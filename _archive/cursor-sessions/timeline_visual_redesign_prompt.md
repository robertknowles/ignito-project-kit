# Cursor Prompt: Add Pipedrive-Style Timeline Visualization

## Context

We want to add a visual timeline similar to Pipedrive's activity feed, with year circles on the left connected to property cards on the right. This will make it easy to scan purchase years at a glance.

## Reference Image

[User has attached Pipedrive screenshot showing the timeline style]

Key elements to replicate:
- Circles on the left for each year
- Vertical line connecting items within the same year
- Horizontal line extending from circle to content
- Clean, minimal grey styling

## Task: Add Left Timeline with Year Circles

### Visual Layout

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  2025 ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│       │                                                │
│       ├─ Property #1 - Units/Apartments (2025 H1)     │
│       │  [Full property card details...]              │
│       │                                                │
│       └─ Property #2 - Units/Apartments (2025 H2)     │
│          [Full property card details...]              │
│          ▶ Expand Decision Engine Analysis for 2025   │
│                                                        │
│          ▶ Show 2026-2028 progression (3 years)       │
│                                                        │
│  2029 ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│       │                                                │
│       └─ Property #3 - Units/Apartments (2029 H1)     │
│          [Full property card details...]              │
│          ▶ Expand Decision Engine Analysis for 2029   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Implementation

**File:** `src/components/InvestmentTimeline.tsx`

**Step 1: Update Container Layout**

Wrap the timeline in a flex container with left sidebar for years:

```tsx
<div className="flex gap-6">
  {/* Left: Year Timeline */}
  <div className="flex-shrink-0 w-20">
    {/* Year circles will go here */}
  </div>
  
  {/* Right: Property Cards */}
  <div className="flex-1">
    {/* Existing property cards */}
  </div>
</div>
```

**Step 2: Create Year Circle Component**

Create a new component for the year circles:

```tsx
interface YearCircleProps {
  year: number;
  propertyCount: number;
}

const YearCircle: React.FC<YearCircleProps> = ({ year, propertyCount }) => {
  return (
    <div className="relative flex items-start">
      {/* Circle */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-600 text-white font-bold text-sm shadow-sm">
        {year}
      </div>
      
      {/* Horizontal line extending right */}
      <div className="absolute left-12 top-6 w-8 h-0.5 bg-gray-300"></div>
      
      {/* Vertical line connecting to next property (if multiple in year) */}
      {propertyCount > 1 && (
        <div className="absolute left-6 top-12 w-0.5 bg-gray-300" style={{ height: 'calc(100% - 48px)' }}></div>
      )}
    </div>
  );
};
```

**Step 3: Render Timeline Structure**

Group properties by year and render year circles:

```tsx
// Group properties by year
const propertiesByYear = timelineProperties.reduce((acc, property) => {
  const year = Math.round(property.affordableYear);
  if (!acc[year]) acc[year] = [];
  acc[year].push(property);
  return acc;
}, {} as Record<number, typeof timelineProperties>);

const purchaseYears = Object.keys(propertiesByYear).map(Number).sort();

return (
  <div className="flex gap-6">
    {/* Left: Year Timeline */}
    <div className="flex-shrink-0 w-20 pt-2">
      {purchaseYears.map((year, yearIndex) => {
        const propertiesInYear = propertiesByYear[year];
        const nextYear = purchaseYears[yearIndex + 1];
        const hasGap = nextYear && nextYear > year + 1;
        
        return (
          <div key={year} className="relative">
            <YearCircle year={year} propertyCount={propertiesInYear.length} />
            
            {/* Spacer for gap years */}
            {hasGap && (
              <div className="h-16"></div>
            )}
          </div>
        );
      })}
    </div>
    
    {/* Right: Property Cards */}
    <div className="flex-1 space-y-4">
      {purchaseYears.map((year, yearIndex) => {
        const propertiesInYear = propertiesByYear[year];
        const nextYear = purchaseYears[yearIndex + 1];
        const hasGap = nextYear && nextYear > year + 1;
        
        return (
          <div key={year}>
            {/* Properties in this year */}
            {propertiesInYear.map((property, propIndex) => {
              const isLastInYear = propIndex === propertiesInYear.length - 1;
              
              return (
                <div key={property.id || propIndex} className="mb-4">
                  <PropertyCard 
                    property={property}
                    showDecisionEngine={isLastInYear}
                    yearData={getYearDataForYear(year)}
                  />
                </div>
              );
            })}
            
            {/* Gap Period Control */}
            {hasGap && (
              <div className="my-6 text-center">
                <button 
                  onClick={() => toggleGap(`${year}-${nextYear}`)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {isGapExpanded(`${year}-${nextYear}`) ? '▼' : '▶'} 
                  Show {year + 1}-{nextYear - 1} progression ({nextYear - year - 1} years)
                </button>
                
                {isGapExpanded(`${year}-${nextYear}`) && (
                  <div className="mt-4 space-y-2">
                    <AISummaryForGap gapYears={getGapYearData(year + 1, nextYear - 1)} />
                    {getGapYearData(year + 1, nextYear - 1).map(yearData => (
                      <GapYearRow key={yearData.year} yearData={yearData} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
```

**Step 4: Styling Details**

**Year Circle:**
- Size: `w-12 h-12` (48px)
- Background: `bg-gray-600` (medium grey)
- Text: `text-white font-bold text-sm`
- Shadow: `shadow-sm`

**Horizontal Line:**
- Width: `w-8` (32px extending right)
- Height: `h-0.5` (2px)
- Color: `bg-gray-300` (light grey)
- Position: Centered vertically with circle

**Vertical Line (for multiple properties):**
- Width: `w-0.5` (2px)
- Color: `bg-gray-300`
- Position: From bottom of circle to bottom of last property card
- Only show when `propertyCount > 1`

**Branch Lines (connecting to each property):**
- Add small horizontal lines from vertical line to each property card
- Same styling as horizontal line

### Alignment

Ensure property cards align perfectly with the horizontal lines from the year circles:

```tsx
<div className="mb-4 relative">
  {/* Small connector line from vertical timeline */}
  {!isFirstInYear && (
    <div className="absolute -left-10 top-6 w-10 h-0.5 bg-gray-300"></div>
  )}
  
  <PropertyCard property={property} />
</div>
```

### Responsive Behavior

On mobile screens, consider stacking or simplifying:

```tsx
<div className="flex gap-6">
  {/* Hide year circles on mobile, show inline */}
  <div className="hidden md:flex flex-shrink-0 w-20">
    {/* Year circles */}
  </div>
  
  <div className="flex-1">
    {/* On mobile, show year as header above cards */}
    <div className="md:hidden mb-2 font-bold text-gray-700">
      {year}
    </div>
    {/* Property cards */}
  </div>
</div>
```

## Testing Checklist

After implementation:

1. ✅ Year circles appear on the left for each purchase year
2. ✅ Horizontal lines extend from circles to property cards
3. ✅ Vertical line connects multiple properties in same year
4. ✅ Branch lines connect from vertical line to each property card
5. ✅ Gap controls appear between year sections
6. ✅ Alignment is perfect (circles line up with cards)
7. ✅ Styling matches Pipedrive reference (grey circles, clean lines)
8. ✅ Responsive on mobile (circles hidden or adapted)

## Success Criteria

Task is complete when:
- Timeline has visual year markers on the left
- Property cards are connected with clean lines
- Layout is scannable and professional
- All existing functionality preserved
- Matches the Pipedrive aesthetic
