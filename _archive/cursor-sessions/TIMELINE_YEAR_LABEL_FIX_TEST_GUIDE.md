# Timeline Year Label Fix - Testing Guide

## Quick Test Instructions

### Prerequisites
1. Start the development server: `npm run dev`
2. Navigate to the Investment Timeline section
3. Ensure you have properties selected with varying years

---

## Test Cases

### Test Case 1: Single Property Per Year
**Setup**: 
- Select 1 property for 2025
- Select 1 property for 2030

**Expected Result**:
- ✅ Year label "2025" appears vertically centered with the single property card
- ✅ Year label "2030" appears vertically centered with the single property card
- ✅ Horizontal line extends from the year circle (not from the card)
- ✅ Vertical timeline connects both years

**Visual Check**:
```
┌────┐
│2025│───── [Property Card]  ← Label centered with card
└────┘
  │
┌────┐
│2030│───── [Property Card]  ← Label centered with card
└────┘
```

---

### Test Case 2: Two Properties in Same Year
**Setup**:
- Select 2 properties for 2025
- Select 1 property for 2030

**Expected Result**:
- ✅ Year label "2025" is vertically centered between both property cards
- ✅ Both property cards are horizontally aligned (no branch lines from cards)
- ✅ Horizontal line originates from year circle only
- ✅ Year label "2030" centered with its single card

**Visual Check**:
```
        [Property Card 1]
┌────┐                       ← Label centered between cards
│2025│───── [Property Card 2]
└────┘
  │
┌────┐
│2030│───── [Property Card]
└────┘
```

**How to Measure**:
1. Open browser DevTools (F12)
2. Inspect the year circle element
3. Check distance from top of container to center of circle
4. Check distance from bottom of container to center of circle
5. Both distances should be approximately equal

---

### Test Case 3: Three or More Properties in Same Year
**Setup**:
- Select 3 properties for 2025
- Select 2 properties for 2030
- Select 1 property for 2035

**Expected Result**:
- ✅ Year label "2025" centered with all 3 cards (middle of the stack)
- ✅ Year label "2030" centered with both cards
- ✅ Year label "2035" centered with single card
- ✅ All horizontal lines originate from timeline
- ✅ No branch lines coming from property cards

**Visual Check**:
```
        [Property Card 1]
        [Property Card 2]      ← 2025 centered HERE
┌────┐ [Property Card 3]
│2025│─────
└────┘
  │
        [Property Card 4]      ← 2030 centered HERE
┌────┐ [Property Card 5]
│2030│─────
└────┘
  │
┌────┐
│2035│───── [Property Card 6]
└────┘
```

---

### Test Case 4: Vertical Timeline Continuity
**Setup**:
- Any combination of properties across multiple years

**Expected Result**:
- ✅ Vertical line is continuous from first year to last year
- ✅ No breaks or gaps in the vertical timeline
- ✅ 24px spacing visible between year sections
- ✅ Line extends properly through gaps and pause periods

**Visual Check**:
```
┌────┐
│2025│─────
└────┘
  │  ← Continuous vertical line
  │
┌────┐
│2030│─────
└────┘
  │  ← Continuous vertical line
  │
┌────┐
│2035│─────
└────┘
```

---

### Test Case 5: Horizontal Line Origin
**Setup**:
- Select multiple properties in the same year

**Expected Result**:
- ✅ Horizontal line originates from the vertical timeline (left side)
- ✅ Horizontal line does NOT originate from property cards
- ✅ All property cards receive the connection at the same horizontal position

**How to Verify**:
1. Inspect the horizontal line element in DevTools
2. Check its parent element - should be part of `YearCircle` component
3. Verify `left-12` class positions it at the circle's right edge
4. Verify it's NOT a child of any property card component

**Visual Check**:
```
        [Card 1]
        [Card 2]
┌────┐ [Card 3]
│2025│─────────  ← Line comes from HERE (timeline)
└────┘
  NOT ────────   ← NOT from card
```

---

### Test Case 6: Mobile Responsive View
**Setup**:
- Resize browser to mobile width (< 768px)
- Ensure properties are selected

**Expected Result**:
- ✅ Year circles are hidden on mobile
- ✅ Year labels appear as text headers above property cards
- ✅ Property cards display full width
- ✅ No horizontal lines visible
- ✅ Cards stack vertically within each year section

**Visual Check (Mobile)**:
```
┌─────────────────────────────┐
│ 2025                        │
├─────────────────────────────┤
│ [Property Card 1 - Full]    │
│ [Property Card 2 - Full]    │
├─────────────────────────────┤
│ 2030                        │
├─────────────────────────────┤
│ [Property Card 3 - Full]    │
└─────────────────────────────┘
```

---

### Test Case 7: Gap View Integration
**Setup**:
- Select properties with years that have gaps (e.g., 2025, 2028)
- This creates a "gap" year section (2026-2027)

**Expected Result**:
- ✅ Vertical timeline continues through gap sections
- ✅ No year circles appear for gap years
- ✅ Gap view component displays properly
- ✅ Timeline resumes normally after gap

**Visual Check**:
```
┌────┐
│2025│───── [Property Card]
└────┘
  │
  │  [GAP: 2026-2027]
  │
  │
┌────┐
│2028│───── [Property Card]
└────┘
```

---

### Test Case 8: Pause Block Integration
**Setup**:
- Add a pause block between properties
- Verify pause appears in timeline

**Expected Result**:
- ✅ Vertical timeline continues through pause blocks
- ✅ Pause block card displays properly
- ✅ Timeline resumes normally after pause
- ✅ No year circles appear for pause blocks

---

## Browser Testing Matrix

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ✅ Test |
| Firefox | Latest | ✅ Test |
| Safari | Latest | ✅ Test |
| Edge | Latest | ✅ Test |

---

## DevTools Inspection Points

### 1. Year Circle Container
```html
<div class="relative flex items-center justify-center" style="height: XXXpx;">
```
**Check**: 
- `items-center` class present (not `items-start`)
- `justify-center` class present
- `height` is dynamic based on cards

### 2. Year Circle Element
```html
<div class="relative z-10 flex items-center justify-center w-12 h-12 rounded-full ...">
```
**Check**:
- Width and height are 48px (12 * 4px)
- `z-10` ensures it's above lines
- Centered within parent container

### 3. Horizontal Line
```html
<div class="absolute left-12 w-8 h-0.5 bg-gray-300" style="top: 50%; transform: translateY(-50%);">
```
**Check**:
- `left-12` = 48px (starts at circle edge)
- `top: 50%` with `translateY(-50%)` centers it vertically
- Parent is YearCircle, NOT property card

### 4. Vertical Lines
```html
<!-- Upward line -->
<div class="absolute left-6 w-0.5 bg-gray-300" style="bottom: 50%; top: -24px;">

<!-- Downward line -->
<div class="absolute left-6 w-0.5 bg-gray-300" style="top: 50%; bottom: -24px;">
```
**Check**:
- `left-6` = 24px (center of 48px circle)
- Lines extend from circle center (`50%`)
- 24px gap between sections

---

## Measurement Tools

### Using Browser DevTools
1. Right-click year circle → "Inspect"
2. In Styles panel, find `height` value
3. Divide by 2 to find center point
4. Measure actual position of circle
5. Should match 50% position

### Using Ruler Extension
1. Install "Page Ruler Redux" or similar
2. Measure from top of section to center of year circle
3. Measure from center of year circle to bottom of section
4. Values should be equal (±2px)

---

## Common Issues to Check

### Issue: Year label still at top
**Cause**: CSS class might be cached
**Fix**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: Horizontal lines from cards
**Cause**: Old code might still be active
**Fix**: Verify InvestmentTimeline.tsx lines 697-708 don't have branch line code

### Issue: Broken vertical timeline
**Cause**: Line positioning might be incorrect
**Fix**: Check YearCircle.tsx vertical line styles match the fix

### Issue: Mobile view broken
**Cause**: Responsive classes might be affected
**Fix**: Verify `md:hidden` and `md:flex` classes still in place

---

## Performance Check

After implementing the fix:
1. Open DevTools Performance tab
2. Record a session while scrolling timeline
3. Check for layout thrashing
4. Ensure no excessive re-renders

**Expected**: Smooth 60fps scrolling with no janky frame drops

---

## Success Criteria Summary

| Criteria | Pass |
|----------|------|
| Year label centered with 1 property | ☐ |
| Year label centered with 2 properties | ☐ |
| Year label centered with 3+ properties | ☐ |
| Horizontal line from timeline only | ☐ |
| Horizontal line centered vertically | ☐ |
| Vertical timeline continuous | ☐ |
| No layout breaks on desktop | ☐ |
| No layout breaks on mobile | ☐ |
| No layout breaks on tablet | ☐ |
| Works with gaps | ☐ |
| Works with pauses | ☐ |
| Cross-browser compatible | ☐ |

**All boxes checked = Fix verified! ✅**


