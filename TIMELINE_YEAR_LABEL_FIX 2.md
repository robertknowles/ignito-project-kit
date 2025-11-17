# Timeline Year Label Alignment Fix

## Summary
Fixed two issues with the Investment Timeline's year label positioning and connecting lines.

## Problems Fixed

### Problem 1: Year Label Vertical Alignment ✅
**Issue**: Year labels (2025, 2030, 2043) on the left side of the Investment Timeline were incorrectly centered with their property cards. The year label should ALWAYS align with the TOP of the first property card, not be centered among multiple cards.

**Solution**: Ensured the YearCircle component uses flexbox with `items-start` (NOT `items-center`). This aligns the year label circle with the top of the first property card, regardless of how many property cards are in that year.

### Problem 2: Horizontal Line Position ✅
**Issue**: Horizontal connecting lines were coming from the property cards instead of from the vertical timeline line. This created visual confusion about the source of the connection.

**Solution**: 
1. Removed the branch line code from `InvestmentTimeline.tsx` that was rendering from each property card
2. The horizontal line now originates solely from the `YearCircle` component at line 37, positioned at 50% height with proper transform

## Files Modified

### 1. `src/components/YearCircle.tsx`
**Changes**:
- Line 19: Uses `flex items-start` to align the year circle with the TOP of the first property card
- Line 34: Horizontal line positioned at `top-6` (24px) to align with the vertical center of the circle
- Lines 20-26: Vertical line from above (connects to previous year with 24px gap)
- Lines 36-42: Vertical line extending downward (connects to properties below and next year)

**Key improvements**:
- Year circle is now aligned with the TOP of the first property card
- Horizontal branch line is at the circle's vertical center (24px from top)
- Vertical timeline remains continuous regardless of section height

### 2. `src/components/InvestmentTimeline.tsx`
**Changes**:
- Lines 697-708: Removed the branch line rendering logic that was drawing horizontal lines from property cards
- Simplified the property card rendering - removed the conditional branch line that appeared for index > 0

## Visual Result

### Before:
```
      [Property Card 1]
      
2025 ━━━━ [Property Card 2]  ❌ Centered (wrong)
     
     ━━━━ [Property Card 3]  ❌ Line from card
```

### After:
```
2025 ━━━━ [Property Card 1]  ✅ Aligned with TOP
      
      [Property Card 2]
      
      [Property Card 3]
```

## Testing Checklist

Test with these scenarios to verify the fix:

- [x] ✅ Year label is aligned with TOP of first property (1 property)
- [x] ✅ Year label is aligned with TOP of first property (2 properties)  
- [x] ✅ Year label is aligned with TOP of first property (3+ properties)
- [x] ✅ Horizontal connecting line originates from vertical timeline (not cards)
- [x] ✅ Horizontal line is at the vertical center of the year circle
- [x] ✅ Vertical timeline line connects properly between years
- [x] ✅ No layout breaks on desktop view
- [x] ✅ Mobile view still displays properly (year headers shown above cards)

## Technical Details

### CSS Strategy Used
**Option: Flexbox with `items-start`**

This approach ensures the year circle is always aligned with the TOP of the first property card:

```tsx
<div className="relative flex items-start" style={{ height: `${height}px` }}>
  {/* Year circle and lines */}
</div>
```

The height is dynamically calculated based on the combined height of all property cards for that year, and flexbox with `items-start` aligns the year circle to the top of the container.

### Line Positioning
- **Horizontal line**: Uses `top-6` (24px) to align with the vertical center of the 48px circle
- **Vertical lines**: Extend from the bottom of the circle (`top-12` = 48px) downward
- **Gap between years**: 24px spacing maintained between year sections

## Success Metrics

✅ Year labels now align with the TOP of the first property card
✅ Horizontal lines originate from the vertical timeline only
✅ Visual hierarchy is clear and professional
✅ Timeline remains responsive across different property counts
✅ No visual glitches or misalignments

## Related Files
- `src/components/InvestmentTimeline.tsx` - Main timeline component
- `src/components/YearCircle.tsx` - Year label and timeline visualization
- `src/components/PurchaseEventCard.tsx` - Individual property cards (unchanged)

## Notes
- The fix maintains backward compatibility with existing timeline functionality
- Mobile view (< md breakpoint) continues to show year headers above cards as before
- Gap and pause blocks continue to render correctly with the vertical timeline

