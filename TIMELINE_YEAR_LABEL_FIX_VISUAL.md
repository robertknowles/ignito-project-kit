# Timeline Year Label Fix - Visual Comparison

## Before Fix (Problems Identified)

### Single Property Per Year
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ┌────┐                                                      ║
║   │2025│─────┐                                                ║
║   └────┘     │   ┌─────────────────────────────────────┐     ║
║   │          └───│ House (VIC) | Year: 2025            │     ║
║   │              │ Property Details | Purchase | Finance│     ║
║   │              └─────────────────────────────────────┘     ║
║   │                                                           ║
║   ┌────┐                                                      ║
║   │2030│─────┐                                                ║
║   └────┘     │   ┌─────────────────────────────────────┐     ║
║                   │ Unit (NSW) | Year: 2030             │     ║
║                   │ Property Details | Purchase | Finance│     ║
║                   └─────────────────────────────────────┘     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```
✅ **Works fine** - Year label naturally aligns with single card

---

### Multiple Properties Per Year (PROBLEM)
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ┌────┐        ❌ PROBLEM: Year label at top, not centered  ║
║   │2025│─────┐                                                ║
║   └────┘     │   ┌─────────────────────────────────────┐     ║
║   │          └───│ House (VIC) | Year: 2025            │     ║
║   │              └─────────────────────────────────────┘     ║
║   │              ❌ Line coming from card, not timeline      ║
║   │         ┌────┼─────────────────────────────────────┐     ║
║   │         │    │ Unit (NSW) | Year: 2025             │     ║
║   │         │    └─────────────────────────────────────┘     ║
║   │         │    ❌ Line coming from card, not timeline      ║
║   │         ┌────┼─────────────────────────────────────┐     ║
║   │         │    │ Apartment (VIC) | Year: 2025        │     ║
║   │         │    └─────────────────────────────────────┘     ║
║   │              ← Year label should be centered HERE        ║
║   │                                                           ║
║   ┌────┐                                                      ║
║   │2030│─────┐                                                ║
║   └────┘     │   ┌─────────────────────────────────────┐     ║
║                   │ House (QLD) | Year: 2030            │     ║
║                   └─────────────────────────────────────┘     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```
❌ **Problem 1**: Year label "2025" stuck at top instead of centered
❌ **Problem 2**: Horizontal lines coming from property cards

---

## After Fix (Solution Implemented)

### Multiple Properties Per Year (FIXED)
```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                      ┌─────────────────────────────────────┐  ║
║   │                  │ House (VIC) | Year: 2025            │  ║
║   │                  └─────────────────────────────────────┘  ║
║   │                                                            ║
║   ┌────┐             ┌─────────────────────────────────────┐  ║
║   │2025│─────────────│ Unit (NSW) | Year: 2025             │  ║
║   └────┘             └─────────────────────────────────────┘  ║
║   │                  ✅ Centered with all 3 cards            ║
║   │                  ┌─────────────────────────────────────┐  ║
║   │                  │ Apartment (VIC) | Year: 2025        │  ║
║   │                  └─────────────────────────────────────┘  ║
║   │                                                            ║
║   │                                                            ║
║   ┌────┐             ┌─────────────────────────────────────┐  ║
║   │2030│─────────────│ House (QLD) | Year: 2030            │  ║
║   └────┘             └─────────────────────────────────────┘  ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
```
✅ **Fixed 1**: Year label "2025" is perfectly centered with all 3 cards
✅ **Fixed 2**: Horizontal line originates from timeline (year circle), not from cards
✅ **Fixed 3**: Vertical timeline remains continuous

---

## Technical Implementation Details

### YearCircle Component Changes

**Before (items-start)**:
```tsx
<div className="relative flex items-start" style={{ height: `${height}px` }}>
  <div className="...w-12 h-12 rounded-full...">
    {year}
  </div>
  <div className="absolute left-12 top-6 w-8 h-0.5 bg-gray-300" />
  {/* Fixed position from top */}
</div>
```
Result: Year circle always at the top (top-aligned)

**After (items-center justify-center)**:
```tsx
<div className="relative flex items-center justify-center" style={{ height: `${height}px` }}>
  <div className="...w-12 h-12 rounded-full...">
    {year}
  </div>
  <div className="absolute left-12 w-8 h-0.5..." style={{ top: '50%', transform: 'translateY(-50%)' }} />
  {/* Dynamically centered */}
</div>
```
Result: Year circle always centered vertically within its container

### Height Calculation

The `height` prop is dynamically calculated based on the actual rendered height of all property cards:

```tsx
// InvestmentTimeline.tsx - Line 598-610
useEffect(() => {
  const heights: Record<number, number> = {};
  Object.entries(sectionRefs.current).forEach(([year, ref]) => {
    if (ref) {
      heights[parseInt(year)] = ref.offsetHeight; // Actual DOM height
    }
  });
  setSectionHeights(heights);
}, [timelineByYear, unifiedTimeline]);
```

So if 3 property cards = 400px total height:
- Year circle container = 400px
- Year circle (48px) centered at 200px from top
- Perfectly aligned with the visual center of all cards

---

## Alignment Examples

### Example 1: Two Properties in 2025
```
      ┌─────────────────────┐
      │ Property 1          │ ← 120px height
      └─────────────────────┘
┌────┐
│2025│────────────────────────  ← Centered at 120px
└────┘
      ┌─────────────────────┐
      │ Property 2          │ ← 120px height
      └─────────────────────┘

Total height: 240px + spacing
Year circle centered at: 120px (50% of 240px)
```

### Example 2: Three Properties in 2025
```
      ┌─────────────────────┐
      │ Property 1          │ ← 120px
      └─────────────────────┘
      ┌─────────────────────┐
┌────┐│ Property 2          │ ← 120px
│2025├┤                     │  ← Centered at 180px
└────┘└─────────────────────┘
      ┌─────────────────────┐
      │ Property 3          │ ← 120px
      └─────────────────────┘

Total height: 360px + spacing
Year circle centered at: 180px (50% of 360px)
```

### Example 3: One Property Per Year
```
┌────┐┌─────────────────────┐
│2025├┤ Property 1          │ ← 120px
└────┘└─────────────────────┘
  │
  │    (gap)
  │
┌────┐┌─────────────────────┐
│2030├┤ Property 2          │ ← 120px
└────┘└─────────────────────┘

Each year: 120px height
Year circle: Centered at 60px
```

---

## Responsive Behavior

### Desktop View (md and up)
- Year circles visible on the left
- Property cards on the right
- Horizontal lines connect from timeline to cards
- Year labels centered vertically

### Mobile View (< md breakpoint)
```
┌─────────────────────────────────┐
│ 2025                            │ ← Year header
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ House (VIC) | Year: 2025    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Unit (NSW) | Year: 2025     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 2030                            │ ← Year header
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ House (QLD) | Year: 2030    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
- Year circles hidden
- Year displayed as text header above cards
- Full-width property cards

---

## CSS Classes Used

| Class | Purpose |
|-------|---------|
| `flex items-center justify-center` | Centers year circle vertically and horizontally |
| `relative` | Enables absolute positioning of lines |
| `absolute left-6` | Positions vertical line at circle center (6 * 4px = 24px = half of 48px circle) |
| `absolute left-12` | Positions horizontal line at circle edge (12 * 4px = 48px = full circle width) |
| `top: '50%'` | Start vertical/horizontal lines at container center |
| `transform: 'translateY(-50%)'` | Offset horizontal line by half its height for perfect centering |

---

## Success Validation

To validate the fix is working:

1. **Inspect Year 2025** with 3 properties
   - Measure top of year circle to top of container
   - Measure bottom of year circle to bottom of container
   - Should be equal (±2px for rendering)

2. **Check horizontal line**
   - Should originate from vertical timeline (left side)
   - Should not originate from property cards (right side)
   - Should align with horizontal center of year circle

3. **Verify continuity**
   - Vertical line should be continuous from top to bottom
   - No breaks or gaps between years
   - 24px spacing visible between year sections

4. **Test various counts**
   - 1 property per year: centered
   - 2 properties per year: centered
   - 3+ properties per year: centered
   - Mixed counts: each centered independently


