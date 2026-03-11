# Cursor Prompt: Add Timeline Progress Bar Navigation

## Context

Add a Pipedrive-style progress bar at the top of the Investment Timeline that shows all years in a single horizontal line. Years up to the latest purchase are green, future years are grey. Clicking a year scrolls to that section.

## Reference Image

[User has attached Pipedrive screenshot showing the stage progress bar]

Key elements:
- Horizontal segments representing stages/years
- Green for completed, grey for future
- Clickable for navigation
- Connecting lines between segments
- All in a single line

## Task: Add Timeline Progress Bar

### Visual Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  2025 ━━━ 2026 ━━━ 2027 ━━━ 2028 ━━━ 2029 ━━━ 2030 ━━━ 2031 ━━━ 2032 ━━━  │
│ [Green]   [Green]   [Green]   [Green]   [Green]   [Green]   [Grey]   [Grey]  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                        [Timeline content below]
```

### Implementation

**File:** `src/components/InvestmentTimeline.tsx`

**Step 1: Create Progress Bar Component**

Add this new component at the top of the file:

```tsx
interface TimelineProgressBarProps {
  startYear: number;
  endYear: number;
  latestPurchaseYear: number;
  onYearClick: (year: number) => void;
}

const TimelineProgressBar: React.FC<TimelineProgressBarProps> = ({
  startYear,
  endYear,
  latestPurchaseYear,
  onYearClick,
}) => {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-3 px-6 mb-6">
      <div className="flex items-center justify-start gap-1 overflow-x-auto">
        {years.map((year, index) => {
          const isCompleted = year <= latestPurchaseYear;
          const isLast = index === years.length - 1;
          
          return (
            <React.Fragment key={year}>
              {/* Year Segment */}
              <button
                onClick={() => onYearClick(year)}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap
                  transition-all hover:opacity-80
                  ${isCompleted 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                  }
                `}
              >
                {year}
              </button>
              
              {/* Connecting Line */}
              {!isLast && (
                <div 
                  className={`h-0.5 w-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
```

**Step 2: Calculate Year Range and Latest Purchase**

Add this logic in the main `InvestmentTimeline` component:

```tsx
// Calculate year range
const startYear = BASE_YEAR; // 2025
const endYear = startYear + Math.ceil(profile.investmentHorizon || 15); // e.g., 2040

// Find latest purchase year
const latestPurchaseYear = timelineProperties.length > 0
  ? Math.max(...timelineProperties.map(p => Math.round(p.affordableYear)))
  : startYear;

// Scroll to year function
const scrollToYear = (year: number) => {
  const element = document.getElementById(`year-${year}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }
};
```

**Step 3: Add ID Anchors to Year Sections**

Update the year rendering to include ID anchors:

```tsx
{purchaseYears.map((year, yearIndex) => {
  const propertiesInYear = propertiesByYear[year];
  
  return (
    <div key={year} id={`year-${year}`}> {/* ADD THIS ID */}
      {/* Existing year circle and properties */}
    </div>
  );
})}
```

**Step 4: Render Progress Bar**

Add the progress bar at the top of the timeline:

```tsx
return (
  <div className="w-full">
    {/* Progress Bar */}
    <TimelineProgressBar
      startYear={startYear}
      endYear={endYear}
      latestPurchaseYear={latestPurchaseYear}
      onYearClick={scrollToYear}
    />
    
    {/* Existing Timeline Content */}
    <div className="flex gap-6">
      {/* Year circles and property cards */}
    </div>
  </div>
);
```

### Styling Details

**Progress Bar Container:**
- Sticky positioning: `sticky top-0 z-10`
- White background: `bg-white`
- Border bottom: `border-b border-gray-200`
- Padding: `py-3 px-6`
- Margin bottom: `mb-6`

**Year Segments (Completed - Green):**
- Background: `bg-green-500`
- Text: `text-white`
- Padding: `px-3 py-1.5`
- Font: `text-sm font-medium`
- Rounded: `rounded`
- Hover: `hover:opacity-80`

**Year Segments (Future - Grey):**
- Background: `bg-gray-300`
- Text: `text-gray-600`
- Same padding and font as green

**Connecting Lines:**
- Height: `h-0.5` (2px)
- Width: `w-4` (16px)
- Color: `bg-green-500` (completed) or `bg-gray-300` (future)

**Responsive:**
- Horizontal scroll if too many years: `overflow-x-auto`
- No wrapping: `whitespace-nowrap` on year buttons
- Compact on mobile: reduce padding if needed

### Smart Year Calculation

If the timeline is very long (e.g., 20+ years), consider showing only:
- Purchase years
- Current year
- Start and end years

```tsx
// Optional: Filter to key years only if timeline is long
const displayYears = years.length > 15
  ? years.filter(year => 
      year === startYear || 
      year === endYear || 
      purchaseYears.includes(year) ||
      year === new Date().getFullYear()
    )
  : years;
```

### Scroll Behavior

**Smooth Scroll:**
```typescript
const scrollToYear = (year: number) => {
  const element = document.getElementById(`year-${year}`);
  if (element) {
    // Offset for sticky header
    const yOffset = -80; 
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};
```

**Highlight on Click (Optional):**
```tsx
const [activeYear, setActiveYear] = useState<number | null>(null);

const handleYearClick = (year: number) => {
  setActiveYear(year);
  scrollToYear(year);
  
  // Remove highlight after 2 seconds
  setTimeout(() => setActiveYear(null), 2000);
};

// In the year segment button:
className={`
  ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
  ${activeYear === year ? 'ring-2 ring-blue-500' : ''}
`}
```

## Testing Checklist

After implementation:

1. ✅ Progress bar appears at top of timeline
2. ✅ All years from start to end are shown in a single line
3. ✅ Years up to latest purchase are green
4. ✅ Future years are grey
5. ✅ Connecting lines match segment colors
6. ✅ Clicking a year scrolls to that section
7. ✅ Smooth scroll animation works
8. ✅ Progress bar is sticky (stays at top when scrolling)
9. ✅ Horizontal scroll works if many years
10. ✅ No wrapping to second line

## Success Criteria

Task is complete when:
- Progress bar shows all years in single horizontal line
- Green/grey coloring indicates progress
- Clicking navigates to year sections
- Bar stays visible while scrolling (sticky)
- Works responsively on all screen sizes
