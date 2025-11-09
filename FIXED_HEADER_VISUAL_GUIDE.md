# Fixed Header - Visual Guide

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Dashboard (h-screen, flex)                                              │
│                                                                          │
│  ┌─────────────────────┬─────────────────────────────────────────────┐  │
│  │ LEFT SIDE (2/5)     │ RIGHT SIDE (3/5)                            │  │
│  │ overflow-y-auto     │ flex flex-col                               │  │
│  │                     │                                             │  │
│  │ ┌─────────────────┐ │ ╔═══════════════════════════════════════╗  │  │
│  │ │ Client Profile  │ │ ║ FIXED HEADER (sticky top-0 z-10)     ║  │  │
│  │ │ [Expandable]    │ │ ║                                       ║  │  │
│  │ │                 │ │ ║ ┌───────────────────────────────────┐ ║  │  │
│  │ │ • Deposit Pool  │ │ ║ │ Summary Bar                       │ ║  │  │
│  │ │ • Borrowing Cap │ │ ║ │ $2.9M | 3 Props | $50k/$50k | ... │ ║  │  │
│  │ │ • Growth Curve  │ │ ║ └───────────────────────────────────┘ ║  │  │
│  │ └─────────────────┘ │ ║                                       ║  │  │
│  │                     │ ║ ┌───────────────────────────────────┐ ║  │  │
│  │ ┌─────────────────┐ │ ║ │ Tab Navigation                    │ ║  │  │
│  │ │ Property Blocks │ │ ║ │ Timeline | Portfolio | Cashflow   │ ║  │  │
│  │ │ [Expandable]    │ │ ║ └───────────────────────────────────┘ ║  │  │
│  │ │                 │ │ ║                                       ║  │  │
│  │ │ ○ House         │ │ ║ ┌───────────────────────────────────┐ ║  │  │
│  │ │ ○ Unit          │ │ ║ │ Year Navigation (Timeline only)   │ ║  │  │
│  │ │ ○ Townhouse     │ │ ║ │ 2025 ─ 2026 ─ 2027 ─ ... ─ 2039  │ ║  │  │
│  │ └─────────────────┘ │ ║ └───────────────────────────────────┘ ║  │  │
│  │                     │ ╚═══════════════════════════════════════╝  │  │
│  │        ↕            │                                             │  │
│  │   SCROLLABLE        │ ┌───────────────────────────────────────┐  │  │
│  │                     │ │ SCROLLABLE CONTENT (flex-1)           │  │  │
│  │                     │ │ overflow-y-auto                       │  │  │
│  │                     │ │                                       │  │  │
│  │                     │ │ Investment Timeline                   │  │  │
│  │                     │ │ ─────────────────────                 │  │  │
│  │                     │ │                                       │  │  │
│  │                     │ │ ○ 2025 Property 1                    │  │  │
│  │                     │ │ ○ 2026 Property 2                    │  │  │
│  │                     │ │ ○ 2027 Property 3                    │  │  │
│  │                     │ │                                       │  │  │
│  │                     │ │        ↕                              │  │  │
│  │                     │ │    SCROLLABLE                         │  │  │
│  │                     │ │        ↕                              │  │  │
│  │                     │ │                                       │  │  │
│  │                     │ │ ○ 2039 Property 15                   │  │  │
│  │                     │ │                                       │  │  │
│  │                     │ └───────────────────────────────────────┘  │  │
│  └─────────────────────┴─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Scroll Behavior

### Left Side Scrolling
```
┌─────────────────┐
│ Client Profile  │ ← Top
│ [Expanded]      │
│                 │
│ • Input 1       │
│ • Input 2       │
│ • Input 3       │   USER SCROLLS ↕
│ ...             │   (Independent)
│                 │
│ Property Blocks │
│ [Expanded]      │
│                 │
│ □ Property 1    │
│ □ Property 2    │
│ □ Property 3    │ ← Bottom
└─────────────────┘
```

### Right Side Scrolling
```
╔═══════════════════╗
║ Summary Bar       ║ ← STAYS FIXED
║ Tabs              ║ ← STAYS FIXED  
║ Year Navigation   ║ ← STAYS FIXED
╚═══════════════════╝
─────────────────────
│ Timeline Item 1   │ ← Top of scroll
│ Timeline Item 2   │
│ Timeline Item 3   │   USER SCROLLS ↕
│ ...               │   (Under header)
│ Timeline Item 10  │
│ Timeline Item 11  │ ← Bottom of scroll
└───────────────────┘
```

## Component Hierarchy

```
Dashboard
│
├─► Left Container
│   ├─► overflow-y-auto (scrollable-content)
│   └─► padding: 32px (p-8)
│
└─► Right Container (flex flex-col)
    │
    ├─► Fixed Header (sticky top-0 z-10)
    │   │
    │   ├─► SummaryBar
    │   │   └─► 6-column grid (metrics)
    │   │
    │   ├─► Tab Navigation
    │   │   └─► 4 buttons (Timeline, Portfolio, Cashflow, Per-Property)
    │   │
    │   └─► TimelineProgressBar (conditional: activeTab === 'timeline')
    │       └─► Year buttons with connecting lines
    │
    └─► Scrollable Content (flex-1, overflow-y-auto)
        └─► Active Tab Component
            ├─► InvestmentTimeline (with ref)
            ├─► PortfolioGrowthChart
            ├─► CashflowChart
            └─► PerPropertyTracking
```

## Interaction Flow

### Year Navigation Click
```
User Clicks Year Button (e.g., "2027")
    ↓
Dashboard.handleYearClick(2027)
    ↓
timelineRef.current.scrollToYear(2027)
    ↓
InvestmentTimeline finds element #year-2027
    ↓
Calculates scroll offset within .scrollable-content
    ↓
Smooth scrolls to position with 20px padding
```

### Tab Switching
```
User Clicks "Portfolio Growth" Tab
    ↓
Dashboard.handleTabChange('portfolio')
    ↓
activeTab state updates to 'portfolio'
    ↓
┌─────────────────────────────┐
│ Header remains visible:     │
│ • Summary Bar (stays)       │
│ • Tabs (Portfolio active)   │
│ • Year Nav (hidden)         │  ← Only shows for Timeline
└─────────────────────────────┘
    ↓
Content area renders PortfolioGrowthChart
```

## Styling Details

### Fixed Header Layers
```
z-index: 10  ← Fixed header
   │
   ├─► bg-white (solid background)
   ├─► border-b border-[#f3f4f6]
   │
   └─► Children:
       ├─► SummaryBar (border-b)
       ├─► Tabs (border-b)
       └─► TimelineProgressBar (border-b)
```

### Scrollbar Styling
```
Width: 6px
Track: transparent
Thumb: rgba(0, 0, 0, 0.2)
Thumb (hover): rgba(0, 0, 0, 0.3)
Border radius: 3px
```

### Color Palette
```
Active Tab: #87B5FA (blue)
Text Gray: #6b7280
Text Dark: #111827
Border: #f3f4f6
Background: #f9fafb
```

## Responsive Breakpoints

### Desktop (Default)
- Left: 40% width (2/5)
- Right: 60% width (3/5)
- Both sides visible

### Mobile Considerations
```
Future enhancement:
- Stack vertically on small screens
- Fixed header becomes full-width
- Left/right become tabs or accordion
```

## State Management

### Dashboard State
```typescript
const [accordian, setAccordian] = useState(profile)
const [activeTab, setActiveTab] = useState('timeline')
const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null)
const timelineData = useTimelineData() // { startYear, endYear, latestPurchaseYear }
```

### Timeline State (via useTimelineData)
```typescript
{
  startYear: 2025,
  endYear: 2039,  // 2025 + 15 - 1
  latestPurchaseYear: 2032  // Max purchase year from timeline
}
```

## CSS Classes Reference

### Container Classes
- `flex` - Flexbox layout
- `h-screen` - Full viewport height
- `flex-col` - Vertical flex direction
- `flex-1` - Flexible sizing

### Scroll Classes
- `overflow-y-auto` - Enable vertical scrolling
- `scrollable-content` - Custom scrollbar styling
- `sticky top-0` - Stick to top when scrolling
- `z-10` - Layer above content

### Spacing Classes
- `p-8` - Padding 32px (left side)
- `p-6` - Padding 24px (right content)
- `px-6 py-3` - Horizontal 24px, vertical 12px (progress bar)
- `gap-8` - Gap 32px between columns
- `gap-1` - Gap 4px between year buttons

### Border Classes
- `border-[#f3f4f6]` - Light gray border
- `border-b` - Bottom border only
- `border-l` - Left border only

## Performance Notes

### Hardware Acceleration
```css
position: sticky;  /* Hardware accelerated */
z-index: 10;       /* Separate layer */
background: white; /* Solid background for repaint */
```

### Scroll Performance
- Uses native browser scrolling
- No JavaScript scroll listeners
- Smooth scroll behavior (CSS)
- Efficient DOM queries

### Render Optimization
- React refs prevent re-renders
- Conditional rendering for year navigation
- Separate scroll contexts (no overflow conflicts)

## Common Patterns

### Sticky Header Pattern
```tsx
<div className="flex flex-col">
  <div className="sticky top-0 z-10 bg-white">
    {/* Header content */}
  </div>
  <div className="flex-1 overflow-y-auto">
    {/* Scrollable content */}
  </div>
</div>
```

### Independent Scroll Areas
```tsx
<div className="flex h-screen">
  <div className="w-2/5 overflow-y-auto scrollable-content">
    {/* Left scrolls independently */}
  </div>
  <div className="w-3/5 overflow-y-auto scrollable-content">
    {/* Right scrolls independently */}
  </div>
</div>
```

### Smooth Scroll to Element
```typescript
element.scrollBy({
  top: offset,
  behavior: 'smooth'
});
```

## Accessibility Considerations

### Keyboard Navigation
- Tab key navigates through buttons
- Year buttons are focusable
- Scroll areas support keyboard scrolling

### Screen Readers
- Semantic HTML structure
- Proper button labels
- ARIA attributes where needed

### Focus Management
```
Tab Order:
1. Left side inputs
2. Tab navigation
3. Year buttons (if visible)
4. Timeline content
```

## Browser DevTools Tips

### Inspect Sticky Elements
1. Open DevTools
2. Select sticky header
3. Watch `position: sticky` in Styles panel
4. Scroll to see element stick

### Debug Scroll Container
1. Add temporary background: `bg-red-100`
2. Check overflow settings
3. Verify height calculations
4. Test in different viewports

### Performance Profiling
1. Open Performance tab
2. Record while scrolling
3. Look for layout thrashing
4. Check paint operations

