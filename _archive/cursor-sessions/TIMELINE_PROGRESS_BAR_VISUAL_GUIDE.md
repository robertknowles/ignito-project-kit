# Timeline Progress Bar - Visual Guide

## Overview

This guide shows the visual appearance and behavior of the Timeline Progress Bar feature.

## Layout Structure

### Full Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Investment Timeline Header                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                        PROGRESS BAR (STICKY)                            │
│  2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ 2032 ━ 2033        │
│ [━━━━━━━━━━━━━ Green ━━━━━━━━━━━━━] [━━━ Grey ━━━]                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ●  2025  │  Property 1: Melbourne Studio                              │
│  │        │  [Property Card Details]                                    │
│  │        │  [Decision Engine]                                          │
│  │        │                                                              │
│  │        │  Property 2: Brisbane Unit                                  │
│  │        │  [Property Card Details]                                    │
│  │        │  [Decision Engine]                                          │
│  │        │                                                              │
│  ●  2027  │  Property 3: Sydney Apartment                              │
│  │        │  [Property Card Details]                                    │
│  │        │  [Decision Engine]                                          │
│  │        │                                                              │
│  │        │  [Gap Years: 2028-2029]                                     │
│  │        │  [Portfolio Growth Charts]                                  │
│  │        │                                                              │
│  ●  2030  │  Property 4: Melbourne House                               │
│           │  [Property Card Details]                                    │
│           │  [Decision Engine]                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Progress Bar Details

### Component Anatomy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Sticky Container                                │
│  White Background | Border Bottom | Padding: 12px 24px                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐           │
│   │ 2025 │━━━ │ 2026 │━━━ │ 2027 │━━━ │ 2028 │━━━ │ 2029 │ ...       │
│   └──────┘    └──────┘    └──────┘    └──────┘    └──────┘           │
│   Green       Green       Green       Grey        Grey                │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
     │           │           │           │           │
     └─Completed─┴─Completed─┴─Latest────┴─Future────┴─Future
```

### Year Button States

#### Completed Year (Green)
```
┌──────────────┐
│    2025      │  bg-green-500
│              │  text-white
│  Clickable   │  font-medium
│  Hover: 80%  │  text-sm
└──────────────┘
```

#### Future Year (Grey)
```
┌──────────────┐
│    2032      │  bg-gray-300
│              │  text-gray-600
│  Clickable   │  font-medium
│  Hover: 80%  │  text-sm
└──────────────┘
```

#### Connecting Lines

**Completed Line (Green)**
```
━━━━  (2px height, 16px width, green-500)
```

**Future Line (Grey)**
```
━━━━  (2px height, 16px width, gray-300)
```

## Visual Examples

### Example 1: Early Portfolio (3 Properties)

**Timeline**: 2025-2039 (15 years)
**Latest Purchase**: 2029

```
Progress Bar:
┌────────────────────────────────────────────────────────────────────────┐
│  2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ ... ━ 2039        │
│ [Green] [Green] [Green] [Green] [Green] [Grey] [Grey]     [Grey]     │
│   ●      ●      ●      ●      ●      ○      ○             ○          │
└────────────────────────────────────────────────────────────────────────┘
   P1     P2     P3           (Latest)  (Future years)
```

### Example 2: Mid-Build Portfolio (8 Properties)

**Timeline**: 2025-2040 (16 years)
**Latest Purchase**: 2033

```
Progress Bar:
┌────────────────────────────────────────────────────────────────────────┐
│  2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ 2032 ━ 2033       │
│ [Green] [Green] [Green] [Green] [Green] [Green] [Green] [Green] [Green]│
│                                                                         │
│  2034 ━ 2035 ━ 2036 ━ 2037 ━ 2038 ━ 2039 ━ 2040                      │
│ [Grey]  [Grey]  [Grey]  [Grey]  [Grey]  [Grey]  [Grey]                │
└────────────────────────────────────────────────────────────────────────┘
```

### Example 3: Completed Portfolio (All Green)

**Timeline**: 2025-2035 (11 years)
**Latest Purchase**: 2035 (last year)

```
Progress Bar:
┌────────────────────────────────────────────────────────────────────────┐
│  2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ 2032 ━ 2033       │
│ [Green] [Green] [Green] [Green] [Green] [Green] [Green] [Green] [Green]│
│                                                                         │
│  2034 ━ 2035                                                           │
│ [Green] [Green]                                                        │
└────────────────────────────────────────────────────────────────────────┘
   ✅ Portfolio Complete - All years show purchases
```

## Interaction States

### 1. Default State
```
┌──────┐
│ 2025 │  Green background, white text
└──────┘  Cursor: pointer
```

### 2. Hover State
```
┌──────┐
│ 2025 │  Green background with 80% opacity
└──────┘  Cursor: pointer
          Smooth transition (transition-all)
```

### 3. Click Action
```
┌──────┐
│ 2025 │  ← User clicks
└──────┘
    ↓
[Smooth Scroll Animation]
    ↓
Scroll to Year 2025 Section
(with -100px offset for sticky header)
```

## Responsive Behavior

### Desktop (Wide Screen)
```
All years visible in single line:
┌────────────────────────────────────────────────────────────────────────┐
│ 2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 ━ 2032 ━ 2033 ━ 2034 │
└────────────────────────────────────────────────────────────────────────┘
```

### Tablet (Medium Screen)
```
Horizontal scroll appears if needed:
┌────────────────────────────────────────────────────┐
│ 2025 ━ 2026 ━ 2027 ━ 2028 ━ 2029 ━ 2030 ━ 2031 → │
└────────────────────────────────────────────────────┘
                    Scroll right for more →
```

### Mobile (Small Screen)
```
Compact with horizontal scroll:
┌──────────────────────────────────┐
│ 2025 ━ 2026 ━ 2027 ━ 2028 ━ → │
└──────────────────────────────────┘
      Swipe right for more →
```

## Color Palette

### Completed Segments
- **Button**: `#10b981` (green-500)
- **Text**: `#ffffff` (white)
- **Line**: `#10b981` (green-500)

### Future Segments
- **Button**: `#d1d5db` (gray-300)
- **Text**: `#4b5563` (gray-600)
- **Line**: `#d1d5db` (gray-300)

### Container
- **Background**: `#ffffff` (white)
- **Border**: `#e5e7eb` (gray-200)

## Sticky Behavior

### Scrolling Up
```
┌─────────────────────────────────────────┐
│  PROGRESS BAR (Fixed at top)           │ ← Stays visible
├─────────────────────────────────────────┤
│                                         │
│  Timeline Content                       │
│  (Scrolls under progress bar)          │
│                                         │
└─────────────────────────────────────────┘
```

### Scrolling Down
```
┌─────────────────────────────────────────┐
│  PROGRESS BAR (Fixed at top)           │ ← Stays visible
├─────────────────────────────────────────┤
│                                         │
│  Timeline Content                       │
│  (Scrolls under progress bar)          │
│                                         │
└─────────────────────────────────────────┘
```

## Scroll Navigation Example

### Step-by-Step Flow

1. **User sees timeline with progress bar**
```
Progress Bar:  [2025] [2026] [2027] [2028] [2029] [2030]
Currently viewing: 2025 section
```

2. **User clicks 2030**
```
Progress Bar:  [2025] [2026] [2027] [2028] [2029] [2030]
                                                     ↑
                                                  Clicked
```

3. **Smooth scroll animation begins**
```
[Animated scroll - smooth, not instant]
Timeline content scrolls up
Progress bar stays fixed
```

4. **Lands on 2030 section**
```
Progress Bar:  [2025] [2026] [2027] [2028] [2029] [2030]
Currently viewing: 2030 section
(Offset -100px for header clearance)
```

## Comparison to Pipedrive Style

### Pipedrive Deal Pipeline
```
┌────────────────────────────────────────────────────────────┐
│  Lead ━━ Qualified ━━ Meeting ━━ Proposal ━━ Won          │
│ [━━━]    [━━━━━]      [━━━━]     [Grey]      [Grey]       │
└────────────────────────────────────────────────────────────┘
```

### Our Timeline Progress
```
┌────────────────────────────────────────────────────────────┐
│  2025 ━━ 2026 ━━ 2027 ━━ 2028 ━━ 2029 ━━ 2030 ━━ 2031    │
│ [Green]  [Green] [Green] [Green] [Grey]  [Grey]  [Grey]   │
└────────────────────────────────────────────────────────────┘
```

**Key Similarities:**
- ✅ Horizontal layout
- ✅ Connected segments
- ✅ Color coding (completed vs future)
- ✅ Clickable navigation
- ✅ Clean, minimal design
- ✅ Sticky positioning

## Visual Hierarchy

### Z-Index Layers
```
Layer 5: Progress Bar (sticky, z-10)
Layer 4: Recalculating Overlay (z-10)
Layer 3: Year Circles (z-1)
Layer 2: Property Cards (z-0)
Layer 1: Background (z-0)
```

### Spacing
```
Progress Bar:
  - Padding Y: 12px (py-3)
  - Padding X: 24px (px-6)
  - Margin Bottom: 24px (mb-6)
  - Gap between elements: 4px (gap-1)

Year Buttons:
  - Padding: 12px 8px (px-3 py-1.5)
  - Border radius: 4px (rounded)
  - Font size: 14px (text-sm)

Connecting Lines:
  - Height: 2px (h-0.5)
  - Width: 16px (w-4)
```

## Edge Cases

### Single Year Timeline
```
┌──────────────┐
│    2025      │  Only one year, no lines
└──────────────┘
```

### Two Year Timeline
```
┌──────────────┬────┬──────────────┐
│    2025      │ ━━ │    2026      │
└──────────────┴────┴──────────────┘
```

### Very Long Timeline (20+ years)
```
┌────────────────────────────────────────────────────────→
│ 2025 ━ 2026 ━ 2027 ━ ... (scroll right for more)
└────────────────────────────────────────────────────────→
                Horizontal scrollbar appears
```

## Accessibility Features

### Keyboard Navigation
- Tab through year buttons
- Enter/Space to activate (scroll)
- Focus visible state

### Screen Readers
- Semantic button elements
- Year labels clearly announced
- Progress state communicated

### Visual Indicators
- Clear color contrast
- Hover states
- Active states
- Focus indicators

## Performance Notes

- **Render**: Single render per timeline update
- **Scroll**: Native browser smooth scroll API
- **No lag**: Even with 50+ years
- **Efficient**: Minimal DOM elements

## Success Metrics

✅ **Visual Quality**
- Clean, professional appearance
- Matches Pipedrive aesthetic
- Consistent with app design

✅ **Usability**
- Intuitive navigation
- Clear progress indication
- Responsive interactions

✅ **Technical**
- No layout shifts
- Smooth animations
- Cross-browser compatible



