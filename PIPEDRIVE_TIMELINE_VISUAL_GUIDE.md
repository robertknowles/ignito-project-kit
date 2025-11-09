# Pipedrive Timeline Visual Guide

## Component Anatomy

### Year Circle Structure

```
┌─────────────────────────────────────────┐
│                                         │
│  ┌────────┐                            │
│  │        │                            │
│  │  2025  │━━━━━━━━━━━━━━━━━━━━━━━━━│ ← Horizontal line (32px)
│  │        │                            │
│  └────┬───┘                            │
│       │                                 │
│       │ ← Vertical line                │
│       │   (connects to content below)  │
│       │                                 │
│       ├─ Branch line (10px)            │
│       │                                 │
└───────┴─────────────────────────────────┘

Circle: 48px × 48px
Lines: 2px thick
Gap between circle and content: 24px
```

## Detailed Specifications

### 1. Year Circle

**Dimensions:**
- Width: `48px` (w-12)
- Height: `48px` (h-12)
- Border Radius: `50%` (rounded-full)

**Colors:**
- Background: `#4B5563` (bg-gray-600)
- Text: `#FFFFFF` (text-white)

**Typography:**
- Font Weight: `700` (font-bold)
- Font Size: `0.875rem` (text-sm / 14px)

**Shadow:**
- `shadow-sm` - Subtle elevation

**Positioning:**
- Centered vertically with first property card
- Fixed at 80px from left edge (w-20 container)

### 2. Horizontal Line (Main Connection)

**Dimensions:**
- Width: `32px` (w-8)
- Height: `2px` (h-0.5)

**Color:**
- Background: `#D1D5DB` (bg-gray-300)

**Position:**
- Left: `48px` (circle width)
- Top: `24px` (center of circle)

### 3. Vertical Line (Between Items)

**Dimensions:**
- Width: `2px` (w-0.5)
- Height: `Dynamic` (based on content)

**Color:**
- Background: `#D1D5DB` (bg-gray-300)

**Position:**
- Left: `24px` (center of circle)
- Top: `48px` (bottom of circle)
- Bottom: Extends to last property in year

**Behavior:**
- Only shown when:
  - Multiple properties in same year, OR
  - Not the last year (continues to next section)

### 4. Branch Lines (Multiple Properties)

**Dimensions:**
- Width: `40px` (w-10)
- Height: `2px` (h-0.5)

**Color:**
- Background: `#D1D5DB` (bg-gray-300)

**Position:**
- Connects from vertical line to property card
- Positioned at card's vertical center (top-6 / 24px)

**Behavior:**
- Only shown for 2nd, 3rd, etc. properties in a year
- First property uses main horizontal line from circle

### 5. Gap Spacer (Between Years)

**Dimensions:**
- Height: `24px` gap between year sections

**Vertical Line in Gap:**
- Continues through gap period
- No circle shown
- Maintains visual connection

## Layout Structure

### Desktop Layout (≥768px)

```
┌──────────────────────────────────────────────────────────┐
│  [80px]  [24px]  [Flexible Width]                       │
│                                                           │
│  Year     Gap     Property Cards                         │
│  Circle                                                   │
│  Column                                                   │
│                                                           │
│   ●━━━━━━━━━━━━━━ Card 1                                │
│   │                                                       │
│   ├━━━━━━━━━━━━━━ Card 2                                │
│   │                                                       │
│   │                                                       │
│   ●━━━━━━━━━━━━━━ Card 3                                │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌──────────────────────────────────────┐
│                                      │
│  2025                                │
│  ────────────────────────            │
│                                      │
│  Card 1                              │
│                                      │
│  Card 2                              │
│                                      │
│  ▶ Show gap...                      │
│                                      │
│  2029                                │
│  ────────────────────────            │
│                                      │
│  Card 3                              │
│                                      │
└──────────────────────────────────────┘
```

## Color Palette

| Element | Color Code | Tailwind Class | Description |
|---------|-----------|----------------|-------------|
| Circle BG | `#4B5563` | `bg-gray-600` | Medium grey |
| Circle Text | `#FFFFFF` | `text-white` | White |
| Lines | `#D1D5DB` | `bg-gray-300` | Light grey |
| Year Header (mobile) | `#374151` | `text-gray-700` | Dark grey |

## Spacing System

```
Container:
├─ gap-6 (24px) between left column and content
│
Left Column:
├─ w-20 (80px) fixed width
├─ pt-2 (8px) top padding
│
Right Column:
├─ flex-1 (flexible)
├─ space-y-6 (24px between sections)
│
Property Cards:
├─ space-y-4 (16px between cards)
├─ mb-4 (16px bottom margin per card)
```

## Visual States

### 1. Single Property Year

```
2025 ●━━━━━━━━━━━━ Property Card
     │
     │ (continues to next year)
     │
```

### 2. Multiple Properties Year

```
2025 ●━━━━━━━━━━━━ Property Card 1
     │
     ├━━━━━━━━━━━━ Property Card 2
     │
     ├━━━━━━━━━━━━ Property Card 3
     │
     │ (continues to next year)
     │
```

### 3. Gap Period

```
2025 ●━━━━━━━━━━━━ Property Card
     │
     │ (no circle, just line)
     │ ▶ Show 2026-2028...
     │
     │
2029 ●━━━━━━━━━━━━ Property Card
```

### 4. Last Year (End of Timeline)

```
2035 ●━━━━━━━━━━━━ Property Card
     │
     └━━━━━━━━━━━━ Property Card 2
                    (no line extends below)
```

## Interaction States

### Hover (Year Circle)
- No special hover state currently
- Could add: `hover:bg-gray-700` for subtle feedback

### Expanded Decision Engine
- Height measurement adjusts automatically
- Vertical line extends to cover expanded content
- Maintains alignment with new content height

### Expanded Gap
- Gap section expands vertically
- Timeline line continues through expanded content
- No visual break in timeline flow

## Alignment Guide

### Vertical Alignment
```
Circle Center (24px from top)
     ↓
     ●━━━━━━━━━━━ [Card top edge + 24px]
                    ↑
                    Card vertical center aligns with line
```

### Horizontal Alignment
```
←─ 80px ─→←─ 32px ─→
[  Circle  ][ H-Line ][ Card starts here ]
     ↑           ↑
  Fixed      Extends
  Position   Right
```

## Responsive Breakpoints

| Breakpoint | Timeline Circles | Year Display | Layout |
|------------|------------------|--------------|--------|
| < 768px (mobile) | Hidden | Header above cards | Stacked |
| ≥ 768px (tablet) | Visible | In circles | Side-by-side |
| ≥ 1024px (desktop) | Visible | In circles | Side-by-side |

## CSS Classes Reference

### YearCircle Component
```css
Circle:
- flex items-center justify-center
- w-12 h-12
- rounded-full
- bg-gray-600 text-white
- font-bold text-sm
- shadow-sm
- flex-shrink-0

Horizontal Line:
- absolute left-12 top-6
- w-8 h-0.5
- bg-gray-300

Vertical Line (from above):
- absolute left-6 bottom-full
- w-0.5 h-[24px]
- bg-gray-300

Vertical Line (to below):
- absolute left-6 top-12
- w-0.5
- bg-gray-300
- height: dynamic (height - 48px)
```

### Timeline Container
```css
Main Container:
- flex gap-6

Left Column:
- hidden md:flex
- flex-col
- flex-shrink-0 w-20
- pt-2

Right Column:
- flex-1
- space-y-6

Section Container:
- (no special classes, used for ref measurement)

Property Card Wrapper:
- relative
- (branch line positioned absolutely within)

Branch Line:
- hidden md:block
- absolute -left-10 top-6
- w-10 h-0.5
- bg-gray-300
```

## Implementation Tips

1. **Height Calculation**: Always measure actual rendered heights to ensure lines connect perfectly
2. **Z-Index**: Circle should have `relative z-10` to appear above vertical lines
3. **Mobile First**: Use `hidden md:flex` to show on desktop only
4. **Flexibility**: Use `flex-1` on content area to fill available space
5. **Consistency**: All lines use same color (`bg-gray-300`) for visual harmony

## Accessibility Notes

- **Mobile**: Year information preserved via headers
- **Screen Readers**: Semantic HTML structure maintained
- **Keyboard Navigation**: All interactive elements remain accessible
- **Color Contrast**: Grey circles have sufficient contrast with white text

## Browser Compatibility

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Flexbox**: Required for layout
- **CSS Grid**: Not used (for wider compatibility)
- **Responsive**: Uses standard Tailwind breakpoints

