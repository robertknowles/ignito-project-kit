# Pipedrive Timeline Testing Guide

## Quick Test Checklist

### Visual Tests

#### 1. Basic Timeline Display
- [ ] Year circles appear on the left (desktop only)
- [ ] Circles show correct years (2025, 2026, etc.)
- [ ] Circles are grey with white text
- [ ] Horizontal lines extend from circles to property cards
- [ ] Property cards align with horizontal lines

#### 2. Multiple Properties Per Year
- [ ] Vertical line connects properties in same year
- [ ] Branch lines extend from vertical line to 2nd+ properties
- [ ] First property connects directly to year circle
- [ ] All properties in year are visually grouped

#### 3. Gap Periods
- [ ] Gap control button appears between purchase years
- [ ] Vertical line continues through gap (no circle)
- [ ] Gap can be expanded/collapsed
- [ ] Timeline flow is unbroken

#### 4. Line Connections
- [ ] All circles have horizontal lines (32px right)
- [ ] Vertical lines connect to bottom of cards
- [ ] No gaps or overlaps in lines
- [ ] Lines are 2px thick and grey (#D1D5DB)

#### 5. Responsive Design
- [ ] Desktop (≥768px): Circles visible on left
- [ ] Mobile (<768px): Circles hidden
- [ ] Mobile: Year shown as header above cards
- [ ] Layout remains functional on all screen sizes

### Functional Tests

#### 6. Decision Engine Expansion
- [ ] Clicking "Expand Decision Engine" works
- [ ] Vertical line adjusts to new height
- [ ] Alignment maintained after expansion
- [ ] Collapse works correctly

#### 7. Gap Expansion
- [ ] Clicking "Show progression" expands gap
- [ ] Timeline line continues through expanded gap
- [ ] Alignment maintained
- [ ] AI summary displays correctly
- [ ] Year rows display correctly

#### 8. Dynamic Content
- [ ] Adding/removing properties updates timeline
- [ ] Year circles update automatically
- [ ] Lines adjust to new content
- [ ] No visual artifacts

### Edge Cases

#### 9. Single Property
- [ ] Timeline displays correctly with one property
- [ ] No branch lines (only main horizontal)
- [ ] Vertical line extends appropriately

#### 10. Many Properties in One Year
- [ ] 3+ properties in same year handled gracefully
- [ ] Branch lines don't overlap
- [ ] Vertical line extends to cover all
- [ ] Layout remains clean

#### 11. Large Gaps
- [ ] 5+ year gap displays correctly
- [ ] Gap control shows correct year range
- [ ] Timeline line continues through entire gap
- [ ] Expansion works for large gaps

#### 12. Timeline Boundaries
- [ ] First year: No line extending above circle
- [ ] Last year: No line extending below last card
- [ ] Proper visual termination at both ends

## Detailed Test Scenarios

### Scenario 1: Two Properties, Same Year

**Setup:**
1. Select 2 properties
2. Both should be affordable in 2025

**Expected Result:**
```
2025 ●━━━━━━━ Property 1 (2025 H1)
     │
     └━━━━━━━ Property 2 (2025 H2)
              ▶ Expand Decision Engine
```

**Verify:**
- [ ] Single year circle (2025)
- [ ] Vertical line connects both cards
- [ ] First card: main horizontal line from circle
- [ ] Second card: branch line from vertical line
- [ ] Decision Engine only on second card

### Scenario 2: Properties with Gap

**Setup:**
1. Select 3 properties
2. Property 1 in 2025
3. Property 2 in 2025
4. Property 3 in 2029

**Expected Result:**
```
2025 ●━━━━━━━ Property 1
     │
     └━━━━━━━ Property 2
              ▶ Expand Decision Engine
              
              ▶ Show 2026-2028 (3 years)
     │
2029 ●━━━━━━━ Property 3
              ▶ Expand Decision Engine
```

**Verify:**
- [ ] Two year circles (2025, 2029)
- [ ] Gap control between them
- [ ] Vertical line through gap (no circle)
- [ ] Both year sections work independently

### Scenario 3: Mobile View

**Setup:**
1. Resize browser to <768px width
2. View timeline with multiple properties

**Expected Result:**
```
2025
─────────────
Property 1
Property 2
▶ Expand Decision Engine

▶ Show gap...

2029
─────────────
Property 3
▶ Expand Decision Engine
```

**Verify:**
- [ ] No year circles visible
- [ ] Year displayed as header (bold, grey text)
- [ ] Property cards full width
- [ ] All controls still functional
- [ ] No horizontal overflow

### Scenario 4: Decision Engine Expansion

**Setup:**
1. Timeline with at least one property
2. Click "Expand Decision Engine"

**Expected Result:**
- Decision Engine funnels appear below card
- Vertical line extends to cover new height
- No misalignment with other elements

**Verify:**
- [ ] Funnels display correctly
- [ ] Timeline line adjusts height automatically
- [ ] Alignment maintained with next section
- [ ] Collapse returns to original state

### Scenario 5: Gap Expansion

**Setup:**
1. Timeline with gap between years
2. Click "Show progression"

**Expected Result:**
- AI summary appears
- Year-by-year rows display
- Timeline line continues through expanded content

**Verify:**
- [ ] AI summary visible and formatted
- [ ] Year rows display portfolio metrics
- [ ] Timeline line doesn't break
- [ ] Can collapse back to original state

## Browser Testing Matrix

| Browser | Version | Desktop | Mobile | Notes |
|---------|---------|---------|--------|-------|
| Chrome | Latest | ⬜ | ⬜ | Primary target |
| Firefox | Latest | ⬜ | ⬜ | Test flexbox |
| Safari | Latest | ⬜ | ⬜ | Test on macOS/iOS |
| Edge | Latest | ⬜ | ⬜ | Test on Windows |

## Performance Tests

### 6. Load Time
- [ ] Timeline renders in <1 second
- [ ] No lag when scrolling
- [ ] Smooth animations (if any)

### 7. Reflow/Repaint
- [ ] Expanding content doesn't cause full page reflow
- [ ] Height measurements efficient
- [ ] No visible jank

### 8. Large Datasets
- [ ] 10+ properties: Timeline remains performant
- [ ] 20+ years: Scrolling smooth
- [ ] Multiple gaps: No performance degradation

## Accessibility Tests

### 9. Screen Reader
- [ ] Year information announced
- [ ] Property cards navigable
- [ ] Gap controls accessible
- [ ] Decision Engine controls accessible

### 10. Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Focus visible at all times
- [ ] Logical tab order

### 11. Color Contrast
- [ ] Year circles: White text on grey (sufficient contrast)
- [ ] Lines visible against white background
- [ ] Mobile headers readable

## Visual Regression Tests

Take screenshots and compare:

1. **Default State**
   - Desktop: Timeline with 2 properties in different years
   - Mobile: Same timeline

2. **Expanded State**
   - Desktop: With Decision Engine expanded
   - Mobile: Same

3. **Gap Expanded**
   - Desktop: With gap progression visible
   - Mobile: Same

4. **Multiple Properties**
   - Desktop: 3 properties in same year
   - Mobile: Same

## Common Issues & Fixes

### Issue: Lines Don't Connect Properly

**Symptoms:**
- Gap between circle and horizontal line
- Vertical line doesn't reach next element
- Branch lines misaligned

**Fix:**
- Check height measurement logic
- Verify useEffect dependencies
- Ensure refs are set correctly

### Issue: Mobile View Shows Circles

**Symptoms:**
- Year circles visible on mobile
- Layout too narrow

**Fix:**
- Verify `hidden md:flex` classes
- Check Tailwind breakpoint configuration
- Test at exact 768px boundary

### Issue: Height Not Updating

**Symptoms:**
- Lines too short/long after expanding content
- Fixed height instead of dynamic

**Fix:**
- Check useEffect dependencies include expanded states
- Verify refs are updating
- Add key props to force re-render if needed

### Issue: Performance Lag

**Symptoms:**
- Slow rendering with many properties
- Lag when expanding/collapsing

**Fix:**
- Check if measurements happening on every render
- Verify useMemo dependencies are correct
- Consider debouncing height measurements

## Sign-Off Checklist

Before considering implementation complete:

- [ ] All visual tests pass
- [ ] All functional tests pass
- [ ] All edge cases handled
- [ ] Responsive design works on all breakpoints
- [ ] No console errors or warnings
- [ ] Performance acceptable with large datasets
- [ ] Accessibility requirements met
- [ ] Cross-browser compatibility verified
- [ ] Code reviewed and documented
- [ ] User acceptance testing completed

## Quick Visual Inspection

Open the app and immediately check:

1. **Year circles visible?** (desktop)
2. **Lines connecting?** (all connections present)
3. **Alignment correct?** (circles line up with cards)
4. **Colors right?** (grey circles, light grey lines)
5. **Spacing consistent?** (24px gaps between sections)

If all five checks pass, proceed to detailed testing.

## Testing Tools

- **Chrome DevTools**: For responsive testing
- **Lighthouse**: For accessibility audit
- **React DevTools**: For component inspection
- **Ruler Extensions**: For precise measurements
- **Color Picker**: For verifying color codes

## Reporting Issues

When reporting issues, include:

1. **Screenshot**: Visual evidence of issue
2. **Browser/Device**: What you're testing on
3. **Steps to Reproduce**: How to trigger the issue
4. **Expected vs Actual**: What should happen vs what does
5. **Console Errors**: Any JavaScript errors

## Success Criteria

Implementation is successful when:

✅ All checklist items pass
✅ No visual artifacts or misalignments
✅ Responsive design works perfectly
✅ Performance is acceptable
✅ Accessibility standards met
✅ Cross-browser compatibility confirmed
✅ User feedback is positive

---

*Last Updated: 2025-11-08*
*Implementation Version: 1.0*

