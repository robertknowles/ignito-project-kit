# Decision Engine Popup - Visual Guide

## Overview

The "Expand for decision analysis" feature has been converted from an inline dropdown to a popup modal, with improved positioning and styling.

## Layout Changes

### Property Card - Top Right Corner

**BEFORE:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 House (VIC) | Year: 2026 | Growth: High                  │
│                                         [Expand Full Details →] │
│                                                                 │
│ PROPERTY DETAILS          PURCHASE                            │
│ State: VIC | ...          Price: $350k | ...                  │
│─────────────────────────────────────────────────────────────│
│              ▶ Expand Decision Engine Analysis for 2026       │
│                                                                 │
│ [When clicked, showed inline funnels below]                   │
└─────────────────────────────────────────────────────────────┘
```

**AFTER:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 House (VIC) | Year: 2026 | Growth: High                  │
│                                         [Expand Full Details →] │
│                                         Expand for decision analysis │
│                                                                 │
│ PROPERTY DETAILS          PURCHASE                            │
│ State: VIC | ...          Price: $350k | ...                  │
└─────────────────────────────────────────────────────────────┘
```

### Styling Differences

| Element | Before | After |
|---------|--------|-------|
| **Position** | Center bottom of card | Top right, under main button |
| **Text Color** | Gray-400 (lighter) | Gray-500 (medium grey) |
| **Font Size** | text-sm (14px) | text-xs (12px) |
| **Icon** | ▶/▼ arrow | None |
| **Hover Effect** | text-gray-600 | underline |
| **Display** | Inline expansion | Modal popup |

## Modal Popup

When clicking "Expand for decision analysis", a large modal opens:

```
┌──────────────────────────────────────────────────────────────────┐
│ Decision Engine Analysis for Year 2026                       [×] │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│ This analysis shows how the property purchase in 2026 passed     │
│ the three critical affordability tests...                        │
│                                                                    │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│ │   DEPOSIT    │  │ SERVICEABIL- │  │  BORROWING   │           │
│ │     TEST     │  │     ITY      │  │   CAPACITY   │           │
│ │    FUNNEL    │  │     TEST     │  │     TEST     │           │
│ │              │  │    FUNNEL    │  │    FUNNEL    │           │
│ │   [Chart]    │  │   [Chart]    │  │   [Chart]    │           │
│ │              │  │              │  │              │           │
│ └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Modal Features:

1. **Large size**: max-w-6xl (1152px) - plenty of room for charts
2. **Scrollable**: max-h-90vh with overflow-y-auto
3. **Three-column grid**: Displays all funnels side-by-side on large screens
4. **Responsive**: Stacks vertically on smaller screens (lg:grid-cols-3)
5. **Backdrop**: Dark overlay behind modal
6. **Close options**: X button or click outside to close

## Button Hierarchy

The revised layout creates clear visual hierarchy:

```
┌─────────────────────────────────────────┐
│                    [PRIMARY ACTION]     │ ← Blue, larger (text-sm)
│                    secondary action     │ ← Grey, smaller (text-xs)
└─────────────────────────────────────────┘
```

**Primary (Blue, text-sm):**
- `[Expand Full Details →]` - Main action for editing property

**Secondary (Grey, text-xs):**
- `Expand for decision analysis` - Analysis tool

## Code Structure

### Button Group HTML:
```jsx
<div className="flex flex-col items-end gap-1">
  <button
    onClick={() => setIsModalOpen(true)}
    className="text-sm hover:underline"
    style={{ color: '#87B5FA' }}
  >
    [ Expand Full Details → ]
  </button>
  {showDecisionEngine && (
    <button
      onClick={() => setIsDecisionEngineOpen(true)}
      className="text-xs hover:underline text-gray-500"
    >
      Expand for decision analysis
    </button>
  )}
</div>
```

### Conditional Display:
- Only shown when `showDecisionEngine={true}`
- Typically the last property card in each year
- Controlled by `isDecisionEngineOpen` state

## User Flow

1. **User views timeline** → Sees property cards
2. **Identifies last card in year** → Has grey "Expand for decision analysis" text
3. **Clicks grey link** → Modal opens with full-screen analysis
4. **Reviews three funnels** → Deposit, Serviceability, Borrowing Capacity
5. **Closes modal** → Returns to timeline view

## Advantages

✅ **Cleaner cards** - No inline expansion cluttering the timeline
✅ **Better focus** - Modal view dedicates full attention to analysis
✅ **More space** - Funnels can be larger and more readable
✅ **Consistent UX** - Matches other modal patterns in the app
✅ **Visual hierarchy** - Grey text clearly indicates secondary action
✅ **Mobile friendly** - Modal adapts better to small screens than inline content

## Responsive Behavior

### Desktop (1024px+):
- Three funnels side-by-side
- Modal takes 1152px max width
- Comfortable viewing of all data

### Tablet (768px - 1023px):
- Modal adapts to screen width
- Funnels may stack or shrink
- Scrollable if needed

### Mobile (<768px):
- Single column layout (grid-cols-1)
- Funnels stack vertically
- Full vertical scroll
- Modal uses most of screen width

## Accessibility

- ✅ Keyboard accessible (Tab to navigate)
- ✅ Screen reader friendly (proper ARIA labels via Dialog component)
- ✅ Focus trap (modal captures focus)
- ✅ ESC to close
- ✅ Click outside to close
- ✅ Proper heading hierarchy

## Browser Compatibility

Works on all modern browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Performance

- ⚡ Modal only renders when opened (conditional rendering)
- ⚡ Funnel charts remain unchanged (no re-work)
- ⚡ State management lightweight (single boolean)
- ⚡ No impact on timeline scroll performance


