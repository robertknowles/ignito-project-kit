# Timeline Progress Bar - Quick Reference

## What It Does

A sticky progress bar at the top of the Investment Timeline showing all years in a single horizontal line. Click any year to jump to that section.

## Visual Summary

```
┌────────────────────────────────────────────────────────────┐
│  2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ 2032   │
│ [Green] [Green] [Green] [Green] [Grey] [Grey] [Grey]      │
└────────────────────────────────────────────────────────────┘
   ↑                            ↑
   Completed Purchases          Future Years
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Sticky Position** | Stays at top while scrolling |
| **Click Navigation** | Click year → scroll to section |
| **Green Years** | Years with purchases completed |
| **Grey Years** | Future years without purchases |
| **Connecting Lines** | Visual connections between years |
| **Smooth Scroll** | Animated navigation with offset |
| **Responsive** | Horizontal scroll on small screens |

## User Actions

### Navigate to Year
1. Click any year button in progress bar
2. Page smoothly scrolls to that year's section
3. Content appears below sticky header

### Visual Feedback
- **Hover**: Button becomes slightly transparent
- **Click**: Smooth scroll animation
- **Color**: Green (done) or Grey (future)

## Code Structure

### Component Location
```
src/components/InvestmentTimeline.tsx
├── TimelineProgressBar (new component)
└── InvestmentTimeline (modified)
```

### Key Functions

```typescript
// Calculate year range
startYear = 2025 (BASE_YEAR)
endYear = startYear + timelineYears - 1

// Find latest purchase
latestPurchaseYear = max(property.affordableYear)

// Scroll to year
scrollToYear(year) → smooth scroll with offset
```

### Year Section IDs
```tsx
<div id={`year-${group.year}`}>
  {/* Year content */}
</div>
```

## Styling Cheat Sheet

### Progress Bar Container
```css
sticky top-0 z-10
bg-white border-b border-gray-200
py-3 px-6 mb-6
overflow-x-auto
```

### Completed Year (Green)
```css
bg-green-500 text-white
px-3 py-1.5 rounded
text-sm font-medium
hover:opacity-80
```

### Future Year (Grey)
```css
bg-gray-300 text-gray-600
px-3 py-1.5 rounded
text-sm font-medium
hover:opacity-80
```

### Connecting Lines
```css
h-0.5 w-4
bg-green-500 (completed)
bg-gray-300 (future)
```

## Common Scenarios

### Scenario 1: Early Portfolio
```
Timeline: 2025-2039 (15 years)
Purchases: 2025, 2027, 2029
Latest: 2029

Progress Bar:
2025-2029: Green
2030-2039: Grey
```

### Scenario 2: Mid-Build
```
Timeline: 2025-2040 (16 years)
Purchases: Every 2 years through 2035
Latest: 2035

Progress Bar:
2025-2035: Green
2036-2040: Grey
```

### Scenario 3: Complete
```
Timeline: 2025-2030 (6 years)
Purchases: All 6 years filled
Latest: 2030

Progress Bar:
2025-2030: All Green
```

## Integration Points

### With Timeline
- Appears above year circles and property cards
- Uses same year calculations
- Syncs with timeline properties

### With Decision Engine
- Progress reflects decision engine results
- Green = purchases approved and feasible
- Grey = not yet reached or blocked

### With Property Cards
- Click year → scroll to property cards
- Visual connection through year circles
- Maintains timeline hierarchy

## Technical Details

### Performance
- ✅ Single render per timeline update
- ✅ Efficient scroll calculation
- ✅ No lag with 20+ years

### Browser Support
- ✅ All modern browsers
- ✅ Smooth scroll API
- ✅ Sticky positioning
- ✅ Flexbox layout

### Accessibility
- ✅ Keyboard navigation (Tab)
- ✅ Semantic buttons
- ✅ Clear focus states
- ✅ Screen reader friendly

## Troubleshooting

### Issue: Progress bar not sticky
**Solution**: Check z-index (should be z-10) and position (sticky top-0)

### Issue: Scroll not working
**Solution**: Verify year section IDs match format `year-${year}`

### Issue: Wrong years highlighted
**Solution**: Check `latestPurchaseYear` calculation from `timelineProperties`

### Issue: Wrapping to multiple lines
**Solution**: Ensure `whitespace-nowrap` on buttons and `overflow-x-auto` on container

## Testing Checklist

```
✅ Progress bar visible at top
✅ All years in single line
✅ Correct green/grey coloring
✅ Click navigation works
✅ Smooth scroll animation
✅ Sticky position maintained
✅ Horizontal scroll (if needed)
✅ No layout breaking
✅ Responsive on mobile
✅ No linting errors
```

## File Modified

**Single file changed:**
- `src/components/InvestmentTimeline.tsx`
  - Added `TimelineProgressBar` component
  - Added year range calculations
  - Added `scrollToYear()` function
  - Added year section IDs
  - Integrated progress bar into render

## Related Documentation

- `TIMELINE_PROGRESS_BAR_IMPLEMENTATION.md` - Full implementation details
- `TIMELINE_PROGRESS_BAR_VISUAL_GUIDE.md` - Visual examples and design
- `PIPEDRIVE_TIMELINE_IMPLEMENTATION.md` - Original timeline structure

## Quick Commands

### View Component
```bash
# Open the modified file
code src/components/InvestmentTimeline.tsx
```

### Test Feature
```bash
# Start dev server
npm run dev

# Navigate to timeline view
# Select properties to see progress bar
# Click years to test navigation
```

### Check Linting
```bash
# Lint the file
npm run lint src/components/InvestmentTimeline.tsx
```

## Success Criteria

✅ **All met:**
1. Progress bar appears and is sticky
2. Years display in single horizontal line
3. Green for completed, grey for future
4. Click navigation scrolls smoothly
5. Works on all screen sizes
6. No breaking changes
7. No linting errors
8. Matches Pipedrive aesthetic

## Summary

The Timeline Progress Bar provides intuitive navigation through the investment timeline with a clean, Pipedrive-inspired design. Users can quickly jump to any year while maintaining visual context of their portfolio progress through color-coded segments.


