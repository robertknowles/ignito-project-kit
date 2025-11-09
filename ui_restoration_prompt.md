# Cursor Prompt: Restore Original Clean UI Styling

## Context

The UI has lost its clean, professional look. We need to restore the original styling, typography, and spacing. This prompt provides a detailed style guide to follow.

## Reference Image

[User will attach screenshot of the clean, original UI]

## Task 1: Restore Property Card Styling

**File:** `src/components/PropertyCard.tsx` (or similar)

**Current Problem:** Cards are too tall, have too much padding, and poor text hierarchy.

**Required Fix:** Restore the compact, horizontal layout from the original design.

### Implementation

```tsx
<div className="border border-gray-200 rounded-lg p-3 bg-white">
  <div className="flex items-center justify-between">
    {/* Left Side */}
    <div className="flex items-center gap-4">
      <div className="text-center w-12">
        <div className="text-xs text-gray-400">2025</div>
        <div className="text-xs text-gray-400">2025 H1</div>
      </div>
      <div>
        <div className="font-medium text-gray-800">Units / Apartments</div>
        <div className="text-xs text-gray-500">
          <span>Deposit: $53k</span> • 
          <span>Loan: $298k</span> • 
          <span>Purchase Price: $350k</span>
        </div>
        <div className="text-xs text-gray-500">
          <span>Portfolio Value: $350k</span> • 
          <span>Total Equity: $53k</span>
        </div>
      </div>
    </div>
    
    {/* Right Side */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <button className="text-xs text-blue-500">IO</button>
        <button className="text-xs text-gray-400">P&I</button>
      </div>
      <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
        feasible
      </div>
    </div>
  </div>
</div>
```

### Styling Requirements

- **Padding:** `p-3` (12px)
- **Text Sizes:** `text-xs` (12px) for most text, `font-medium` for title
- **Colors:** `text-gray-400/500/800` for text, `bg-green-100` and `text-green-600` for badge
- **Layout:** Flexbox with `justify-between`
- **Separators:** Use `•` character
- **Remove:** Green section headers (PROPERTY DETAILS, etc.)

---

## Task 2: Restore Typography & Colors

**File:** `tailwind.config.js` and all components

**Current Problem:** Inconsistent font sizes, weights, and colors.

**Required Fix:** Apply the original design system consistently.

### Typography

- **Extra Small (10-11px):** `text-[11px]` for tiny labels
- **Small (12-13px):** `text-xs` for values, body
- **Medium (14-15px):** `text-sm` for titles
- **Large (16-18px):** `text-base` or `text-lg` for metrics

### Font Weights

- **Regular (400):** `font-normal` (labels)
- **Medium (500):** `font-medium` (titles)
- **Semibold (600):** `font-semibold` (values)

### Colors

- **Primary Text**: `text-gray-900`
- **Secondary Text**: `text-gray-600`
- **Tertiary Text**: `text-gray-400`
- **Success**: `text-green-600`
- **Borders**: `border-gray-200`
- **Background**: `bg-white`
- **Background Alt**: `bg-gray-50`

---

## Task 3: Fix Spacing

**File:** All components

**Current Problem:** Too much padding and margin, creating a sparse layout.

**Required Fix:** Reduce spacing to match the original compact design.

### Padding

- **Cards:** `p-3` (12px)
- **Sections:** `py-2` (8px)
- **Elements:** `gap-1` or `gap-2` (4-8px)

### Margins

- **Between cards:** `mb-2` or `mb-3` (8-12px)
- **Between sections:** `my-4` or `my-6` (16-24px)

### Line Height

- **Compact lists:** `leading-tight`
- **Body text:** `leading-normal`

---

## Task 4: Shrink Timeline Visuals

**File:** `src/components/InvestmentTimeline.tsx`

**Current Problem:** Timeline circles and lines are too large and take up too much space.

**Required Fix:** Make them smaller and more subtle.

### Implementation

- **Circle size:** `w-6 h-6` (24px)
- **Line thickness:** `border-t` (1px)
- **Line color:** `border-gray-200`
- **Reduce horizontal padding** around the timeline visual

---

## Testing Checklist

1. ✅ Property cards are compact and horizontal
2. ✅ Text hierarchy is clear (3 levels)
3. ✅ Green is used sparingly (badges only)
4. ✅ Spacing is tight and efficient
5. ✅ Timeline visuals are small and subtle
6. ✅ Overall UI matches the clean, original screenshot

---

## Success Criteria

Task is complete when the UI is visually indistinguishable from the original clean design, while retaining all new functionality (expandable sections, etc.).
