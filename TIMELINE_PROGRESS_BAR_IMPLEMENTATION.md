# Timeline Progress Bar Implementation

## Overview

A Pipedrive-style progress bar has been added to the Investment Timeline that shows all years in a single horizontal line at the top. Years up to the latest purchase are displayed in green, while future years are shown in grey. Users can click any year to navigate directly to that section of the timeline.

## Visual Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  2025 ━━━ 2026 ━━━ 2027 ━━━ 2028 ━━━ 2029 ━━━ 2030 ━━━ 2031 ━━━ 2032 ━━━  │
│ [Green]   [Green]   [Green]   [Green]   [Green]   [Green]   [Grey]   [Grey]  │
└──────────────────────────────────────────────────────────────────────────────┐
                                    ↓
                        [Timeline content below]
```

## Implementation Details

### Component Structure

**File**: `src/components/InvestmentTimeline.tsx`

#### 1. TimelineProgressBar Component

A new component added at the top of the file:

```typescript
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
  // Generates array of all years from start to end
  // Renders each year as a clickable button
  // Adds connecting lines between years
  // Colors segments green (completed) or grey (future)
}
```

#### 2. Year Range Calculation

In the main `InvestmentTimeline` component:

```typescript
// Calculate year range for progress bar
const startYear = BASE_YEAR; // 2025
const endYear = startYear + (profile.timelineYears || 15) - 1; // e.g., 2025 + 15 - 1 = 2039

// Find latest purchase year
const latestPurchaseYear = timelineProperties.length > 0
  ? Math.max(...timelineProperties.map(p => Math.round(p.affordableYear)))
  : startYear;
```

#### 3. Scroll Navigation

Smooth scroll functionality with offset for the sticky header:

```typescript
const scrollToYear = (year: number) => {
  const element = document.getElementById(`year-${year}`);
  if (element) {
    // Offset for sticky header
    const yOffset = -100; 
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
};
```

#### 4. Year Section Anchors

Each year section now has an ID for scroll targeting:

```typescript
<div
  key={`section-${group.year}-${groupIndex}`}
  id={`year-${group.year}`}  // Added for scroll navigation
  ref={(el) => {
    sectionRefs.current[group.year] = el;
  }}
>
```

## Styling Details

### Progress Bar Container

- **Position**: `sticky top-0 z-10` - Stays visible at top while scrolling
- **Background**: `bg-white` - White background
- **Border**: `border-b border-gray-200` - Bottom border for separation
- **Padding**: `py-3 px-6` - Vertical and horizontal padding
- **Margin**: `mb-6` - Space below the bar

### Year Segments (Completed - Green)

- **Background**: `bg-green-500`
- **Text**: `text-white`
- **Padding**: `px-3 py-1.5`
- **Font**: `text-sm font-medium`
- **Shape**: `rounded`
- **Hover**: `hover:opacity-80`
- **Interaction**: `transition-all`

### Year Segments (Future - Grey)

- **Background**: `bg-gray-300`
- **Text**: `text-gray-600`
- Same padding, font, and interaction as green segments

### Connecting Lines

- **Height**: `h-0.5` (2px)
- **Width**: `w-4` (16px)
- **Color**: `bg-green-500` (completed) or `bg-gray-300` (future)
- Match the color of the segments they connect

### Responsive Design

- **Overflow**: `overflow-x-auto` - Horizontal scroll if many years
- **No wrapping**: `whitespace-nowrap` on year buttons
- **Mobile**: Compact layout with all features preserved

## User Interaction

### Click Behavior

1. User clicks any year button in the progress bar
2. `scrollToYear()` function is called with the year number
3. Page smoothly scrolls to that year's section
4. Offset of -100px accounts for the sticky header

### Visual Feedback

- **Hover**: Year buttons become slightly transparent (80% opacity)
- **Transition**: Smooth animation on hover
- **Color Coding**: 
  - Green = Years with completed purchases
  - Grey = Future years without purchases yet

### Scroll Behavior

- Progress bar remains fixed at top of viewport (sticky positioning)
- Always visible while scrolling through timeline
- No wrapping - maintains single horizontal line
- Horizontal scroll available if many years (15+)

## Key Features

### ✅ Completed Implementation

1. **Single Horizontal Line**: All years displayed in one row
2. **Color Coding**: Green for completed, grey for future
3. **Clickable Navigation**: Each year is clickable and scrolls to section
4. **Smooth Scrolling**: Animated scroll with header offset
5. **Sticky Position**: Bar stays at top while scrolling
6. **Connecting Lines**: Visual lines between year segments
7. **Responsive**: Horizontal scroll for many years
8. **No Wrapping**: Maintains single line layout

### Smart Calculations

- **Start Year**: Uses `BASE_YEAR` (2025)
- **End Year**: Calculated from `profile.timelineYears` (default 15 years)
- **Latest Purchase**: Dynamically determined from `timelineProperties`
- **Completion Status**: Compares each year to latest purchase year

## Testing Checklist

After implementation, verify:

- [ ] ✅ Progress bar appears at top of timeline
- [ ] ✅ All years from start to end shown in single line
- [ ] ✅ Years up to latest purchase are green
- [ ] ✅ Future years are grey
- [ ] ✅ Connecting lines match segment colors
- [ ] ✅ Clicking a year scrolls to that section
- [ ] ✅ Smooth scroll animation works
- [ ] ✅ Progress bar is sticky (stays at top when scrolling)
- [ ] ✅ Horizontal scroll works if many years
- [ ] ✅ No wrapping to second line

## Usage Example

### Scenario: 6-Property Portfolio

**Timeline**: 2025-2039 (15 years)
**Purchases**: 
- 2025: Property 1
- 2027: Property 2
- 2029: Property 3
- 2031: Property 4
- 2033: Property 5
- 2035: Property 6

**Progress Bar Display**:
```
[2025] ━ [2026] ━ [2027] ━ [2028] ━ [2029] ━ [2030] ━ [2031] ━ [2032] ━ [2033] ━ [2034] ━ [2035] ━ [2036] ━ [2037] ━ [2038] ━ [2039]
[Green]   [Green]  [Green]  [Green]  [Green]  [Green]  [Green]  [Green]  [Green]  [Green]  [Green]  [Grey]   [Grey]   [Grey]   [Grey]
```

User can click any year (2025-2039) to jump to that section instantly.

## Future Enhancements (Optional)

### Smart Year Filtering

For very long timelines (20+ years), consider showing only key years:

```typescript
const displayYears = years.length > 15
  ? years.filter(year => 
      year === startYear || 
      year === endYear || 
      purchaseYears.includes(year) ||
      year === new Date().getFullYear()
    )
  : years;
```

### Active Year Highlighting

Add visual feedback when a year is clicked:

```typescript
const [activeYear, setActiveYear] = useState<number | null>(null);

const handleYearClick = (year: number) => {
  setActiveYear(year);
  scrollToYear(year);
  
  // Remove highlight after 2 seconds
  setTimeout(() => setActiveYear(null), 2000);
};

// In button className:
${activeYear === year ? 'ring-2 ring-blue-500' : ''}
```

## Technical Notes

### Performance

- Progress bar renders once per timeline update
- Minimal re-renders due to stable year calculations
- Smooth scroll uses native browser API
- No performance impact on long timelines

### Accessibility

- All year buttons are keyboard accessible
- Semantic HTML button elements
- Clear visual states (green/grey)
- Hover states for better UX

### Browser Compatibility

- Sticky positioning: All modern browsers
- Smooth scroll: All modern browsers
- Flexbox layout: Universal support
- No polyfills required

## Success Criteria

✅ **All criteria met:**

1. Progress bar shows all years in single horizontal line
2. Green/grey coloring indicates progress
3. Clicking navigates to year sections
4. Bar stays visible while scrolling (sticky)
5. Works responsively on all screen sizes
6. Smooth animations and transitions
7. No breaking of existing timeline functionality
8. No linting errors

## Files Modified

- `src/components/InvestmentTimeline.tsx` - Added progress bar component and integration

## Related Documentation

- `PIPEDRIVE_TIMELINE_IMPLEMENTATION.md` - Original timeline layout
- `PIPEDRIVE_TIMELINE_VISUAL_GUIDE.md` - Visual structure
- `DECISION_ENGINE_COMPLETE_SUMMARY.md` - Decision engine integration

