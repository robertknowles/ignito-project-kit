# Timeline Progress Bar - Test Guide

## Overview

This guide provides comprehensive testing instructions for the Timeline Progress Bar feature.

## Pre-Test Setup

### Start Development Server
```bash
cd /Users/robknowles/Documents/Cursor-Repos/ignito-project-kit
npm run dev
```

### Access Application
1. Open browser to `http://localhost:5173` (or shown port)
2. Navigate to Investment Timeline view
3. Ensure you have properties selected to generate timeline

## Test Scenarios

### Test 1: Visual Appearance

**Objective**: Verify progress bar displays correctly

**Steps**:
1. Navigate to Investment Timeline
2. Look at the top of the timeline (below the header)
3. Verify progress bar is visible

**Expected Results**:
- ✅ Progress bar appears at top of timeline
- ✅ White background with bottom border
- ✅ All years displayed in single horizontal line
- ✅ Years are in sequence (2025, 2026, 2027, etc.)
- ✅ Connecting lines visible between years
- ✅ No wrapping to second line

**Visual Check**:
```
┌────────────────────────────────────────────────────────────┐
│  2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ 2032   │
└────────────────────────────────────────────────────────────┘
```

---

### Test 2: Color Coding

**Objective**: Verify correct green/grey coloring

**Steps**:
1. View timeline with several properties
2. Identify the year of the latest purchase
3. Check progress bar coloring

**Expected Results**:
- ✅ Years up to latest purchase: Green background, white text
- ✅ Future years: Grey background, dark grey text
- ✅ Connecting lines match segment colors (green or grey)
- ✅ Clear visual distinction between completed and future

**Example**:
```
If latest purchase = 2029:
2025: Green ✅
2026: Green ✅
2027: Green ✅
2028: Green ✅
2029: Green ✅
2030: Grey ✅
2031: Grey ✅
```

---

### Test 3: Click Navigation

**Objective**: Verify clicking years navigates correctly

**Steps**:
1. Start at top of timeline
2. Click a year in progress bar (e.g., 2030)
3. Observe scroll behavior
4. Try clicking different years

**Expected Results**:
- ✅ Click triggers smooth scroll animation
- ✅ Page scrolls to correct year section
- ✅ Year section appears below sticky header (not hidden)
- ✅ Can click any year (green or grey)
- ✅ Multiple clicks work correctly

**Test Multiple Years**:
- Click 2025 → Should scroll to first section
- Click 2030 → Should scroll to middle section
- Click last year → Should scroll to bottom
- Click 2025 again → Should scroll back to top

---

### Test 4: Sticky Behavior

**Objective**: Verify progress bar stays at top while scrolling

**Steps**:
1. Scroll down through timeline
2. Observe progress bar position
3. Scroll back up
4. Scroll quickly

**Expected Results**:
- ✅ Progress bar stays fixed at top of viewport
- ✅ Timeline content scrolls under progress bar
- ✅ Bar remains visible at all times
- ✅ No flickering or jumping
- ✅ Z-index correct (bar above content)

**Visual Check While Scrolling**:
```
[Progress Bar - Fixed at top]
─────────────────────────────
[Timeline content scrolling]
[Property cards moving up]
[Year circles moving up]
```

---

### Test 5: Hover States

**Objective**: Verify hover interactions work

**Steps**:
1. Hover over green year button
2. Hover over grey year button
3. Move mouse off button
4. Hover over multiple buttons quickly

**Expected Results**:
- ✅ Button becomes slightly transparent on hover (80% opacity)
- ✅ Smooth transition animation
- ✅ Cursor changes to pointer
- ✅ Works for both green and grey buttons
- ✅ State resets when mouse leaves

---

### Test 6: Responsive Behavior

**Objective**: Verify works on different screen sizes

**Desktop Test**:
1. Full screen browser
2. Check if all years visible
3. No horizontal scroll needed

**Expected**:
- ✅ All years visible without scrolling
- ✅ Proper spacing between years

**Tablet Test**:
1. Resize browser to ~800px width
2. Check progress bar

**Expected**:
- ✅ Horizontal scroll appears if needed
- ✅ Can scroll to see all years
- ✅ No vertical wrapping

**Mobile Test**:
1. Resize browser to ~375px width (mobile size)
2. Check progress bar

**Expected**:
- ✅ Horizontal scroll active
- ✅ Can swipe/scroll through years
- ✅ Buttons remain readable
- ✅ No layout breaking

---

### Test 7: Different Timeline Lengths

**Objective**: Test with various timeline durations

**Short Timeline (5 years)**:
1. Set timeline to 2025-2029
2. Check progress bar

**Expected**:
- ✅ Only 5 years shown
- ✅ All fit on screen
- ✅ No scroll needed

**Medium Timeline (15 years)**:
1. Default 15-year timeline
2. Check progress bar

**Expected**:
- ✅ 15 years shown
- ✅ May need horizontal scroll on small screens
- ✅ All years accessible

**Long Timeline (25 years)**:
1. Set timeline to 25 years
2. Check progress bar

**Expected**:
- ✅ All 25 years shown
- ✅ Horizontal scroll available
- ✅ Performance remains smooth
- ✅ Click navigation still works

---

### Test 8: Edge Cases

**No Properties Selected**:
1. Clear all property selections
2. Check if progress bar appears

**Expected**:
- ✅ Progress bar still appears (or gracefully hidden)
- ✅ All years grey (no purchases)
- ✅ No errors in console

**Single Property**:
1. Select only 1 property
2. Check progress bar

**Expected**:
- ✅ Only first year(s) green
- ✅ Rest are grey
- ✅ Click navigation works

**Multiple Properties Same Year**:
1. Multiple properties in 2025
2. Check progress bar

**Expected**:
- ✅ 2025 marked as green
- ✅ Single year circle in timeline
- ✅ Click scrolls to all properties in that year

**Gap Years**:
1. Properties in 2025, 2027, 2030 (gaps between)
2. Check progress bar

**Expected**:
- ✅ Purchase years: Green
- ✅ Gap years: Grey
- ✅ Click on gap year scrolls to gap section
- ✅ Visual consistency maintained

---

### Test 9: Scroll Offset

**Objective**: Verify scroll lands correctly (not hidden behind header)

**Steps**:
1. Click a year in middle of timeline
2. Check if year section is fully visible
3. Verify no content hidden behind sticky bar

**Expected Results**:
- ✅ Year section visible below sticky bar
- ✅ ~100px offset applied correctly
- ✅ Year circle and property cards fully visible
- ✅ No need to scroll manually after navigation

---

### Test 10: Performance

**Objective**: Verify no lag or performance issues

**Steps**:
1. Add 10+ properties to timeline
2. Extend timeline to 20+ years
3. Click through multiple years quickly
4. Scroll rapidly
5. Check browser console for errors

**Expected Results**:
- ✅ No lag when clicking years
- ✅ Smooth scroll animations
- ✅ No console errors
- ✅ No memory leaks
- ✅ Responsive at all times

**Performance Metrics**:
- Click response: < 100ms
- Scroll animation: Smooth 60fps
- Render time: < 50ms

---

### Test 11: Interaction with Existing Features

**With Year Circles**:
1. Progress bar at top
2. Year circles on left
3. Check alignment

**Expected**:
- ✅ Years match between bar and circles
- ✅ No conflicts in year display
- ✅ Both navigation methods work

**With Decision Engine**:
1. View properties with decision engine
2. Check if progress bar interferes

**Expected**:
- ✅ Decision engine expands correctly
- ✅ No z-index issues
- ✅ Both components visible

**With Property Cards**:
1. Click year in progress bar
2. Check property cards appear

**Expected**:
- ✅ Property cards visible for that year
- ✅ All cards accessible
- ✅ No layout issues

---

### Test 12: Accessibility

**Keyboard Navigation**:
1. Tab through progress bar
2. Press Enter on a year button
3. Continue tabbing

**Expected**:
- ✅ Can tab to each year button
- ✅ Focus visible indicator shows
- ✅ Enter/Space activates navigation
- ✅ Can tab past progress bar to timeline

**Screen Reader Test** (if available):
1. Enable screen reader
2. Navigate to progress bar

**Expected**:
- ✅ Year labels announced
- ✅ Button role clear
- ✅ Progress state communicated

---

## Bug Reporting Template

If you find issues, report using this format:

```
### Bug: [Brief Description]

**Test**: Test #[number] - [name]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshot**:
[If applicable]

**Browser**:
[Chrome/Firefox/Safari/Edge]

**Screen Size**:
[Desktop/Tablet/Mobile - specific resolution]

**Console Errors**:
[Any errors from browser console]
```

---

## Test Results Checklist

Copy this checklist and mark items as you test:

```
Visual Appearance:
[ ] Progress bar visible
[ ] Single horizontal line
[ ] All years in sequence
[ ] Connecting lines present
[ ] No wrapping

Color Coding:
[ ] Green for completed years
[ ] Grey for future years
[ ] Lines match segment colors
[ ] Clear visual distinction

Click Navigation:
[ ] Smooth scroll animation
[ ] Scrolls to correct year
[ ] Works for all years
[ ] Proper offset (not hidden)

Sticky Behavior:
[ ] Stays at top while scrolling
[ ] Content scrolls under bar
[ ] Always visible
[ ] No flickering

Hover States:
[ ] Opacity change on hover
[ ] Smooth transition
[ ] Cursor changes to pointer
[ ] Works for all buttons

Responsive:
[ ] Desktop: All years visible
[ ] Tablet: Horizontal scroll if needed
[ ] Mobile: Swipe/scroll works
[ ] No layout breaking

Timeline Lengths:
[ ] Short timeline (5 years)
[ ] Medium timeline (15 years)
[ ] Long timeline (25 years)

Edge Cases:
[ ] No properties selected
[ ] Single property
[ ] Multiple properties same year
[ ] Gap years

Performance:
[ ] No lag
[ ] Smooth animations
[ ] No console errors
[ ] Responsive

Integration:
[ ] Works with year circles
[ ] Works with decision engine
[ ] Works with property cards

Accessibility:
[ ] Keyboard navigation
[ ] Tab through buttons
[ ] Enter/Space activates
[ ] Focus visible
```

---

## Automated Test Commands

### Lint Check
```bash
npm run lint
```

### TypeScript Check
```bash
npx tsc --noEmit
```

### Build Check
```bash
npm run build
```

---

## Success Criteria

All tests must pass for feature to be considered complete:

✅ **Visual**: Progress bar displays correctly with proper styling
✅ **Color**: Green/grey coding reflects portfolio progress
✅ **Navigation**: Click scrolls to correct year sections
✅ **Sticky**: Bar remains at top while scrolling
✅ **Responsive**: Works on all screen sizes
✅ **Performance**: No lag or errors
✅ **Integration**: Works with existing features
✅ **Accessibility**: Keyboard and screen reader support

---

## Quick Test Script

For rapid testing, follow this condensed script:

1. ✅ Load timeline with properties
2. ✅ Verify progress bar visible at top
3. ✅ Check green/grey coloring correct
4. ✅ Click middle year → verify scroll
5. ✅ Scroll page → verify bar stays at top
6. ✅ Hover year → verify opacity change
7. ✅ Resize to mobile → verify horizontal scroll
8. ✅ Check console → no errors

**Expected Time**: 5-10 minutes for quick validation

---

## Reporting Test Results

After testing, create a summary:

```markdown
## Test Summary

**Date**: [Date]
**Tester**: [Name]
**Browser**: [Browser + Version]
**Platform**: [OS]

### Test Results
- Visual Appearance: ✅ PASS
- Color Coding: ✅ PASS
- Click Navigation: ✅ PASS
- Sticky Behavior: ✅ PASS
- Hover States: ✅ PASS
- Responsive: ✅ PASS
- Timeline Lengths: ✅ PASS
- Edge Cases: ✅ PASS
- Performance: ✅ PASS
- Integration: ✅ PASS
- Accessibility: ✅ PASS

### Issues Found
[List any issues or note "None"]

### Overall Status
✅ APPROVED for production
```

---

## Additional Resources

- `TIMELINE_PROGRESS_BAR_IMPLEMENTATION.md` - Implementation details
- `TIMELINE_PROGRESS_BAR_VISUAL_GUIDE.md` - Visual examples
- `TIMELINE_PROGRESS_BAR_QUICK_REFERENCE.md` - Quick reference

