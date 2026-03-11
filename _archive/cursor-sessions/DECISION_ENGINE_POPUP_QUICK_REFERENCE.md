# Decision Engine Popup - Quick Reference

## What Changed?

The "Expand for decision analysis" feature is now a **popup modal** instead of an inline dropdown.

## Location

Look for the grey text link positioned **directly underneath** the blue "Expand Full Details" button in the top-right corner of property cards.

```
┌─────────────────────────────────────┐
│                [Expand Full Details →] ← Blue, primary
│                Expand for decision analysis ← Grey, secondary
└─────────────────────────────────────┘
```

## When Does It Appear?

- Only on the **last property card** in each year on the timeline
- Controlled by the `showDecisionEngine` prop

## What Does It Do?

Opens a full-screen modal showing three affordability test funnels:
1. **Deposit Test** - Shows deposit availability vs requirements
2. **Serviceability Test** - Shows income serviceability capacity
3. **Borrowing Capacity Test** - Shows borrowing limits

## Quick Access

1. Scroll to any year on the Investment Timeline
2. Find the last property card for that year
3. Look for grey text: "Expand for decision analysis"
4. Click to open the analysis modal

## Key Features

✅ **Large modal view** - Better visibility of charts
✅ **Three funnels side-by-side** - Compare all tests at once  
✅ **Scrollable** - Handles overflow gracefully
✅ **Responsive** - Adapts to screen size
✅ **Easy to close** - Click X or outside modal

## Styling

| Element | Style |
|---------|-------|
| Text color | Grey (#6b7280 / text-gray-500) |
| Font size | 12px (text-xs) |
| Position | Top-right, below main button |
| Hover | Underline |
| Display | Modal popup |

## Component Files

- **PurchaseEventCard.tsx** - Card with trigger button
- **DecisionEngineModal.tsx** - Modal component (new)
- **DepositTestFunnel.tsx** - Unchanged
- **ServiceabilityTestFunnel.tsx** - Unchanged
- **BorrowingCapacityTestFunnel.tsx** - Unchanged

## For Developers

### Import the modal:
```typescript
import { DecisionEngineModal } from './DecisionEngineModal';
```

### Add state:
```typescript
const [isDecisionEngineOpen, setIsDecisionEngineOpen] = useState(false);
```

### Trigger button:
```tsx
<button
  onClick={() => setIsDecisionEngineOpen(true)}
  className="text-xs hover:underline text-gray-500"
>
  Expand for decision analysis
</button>
```

### Modal component:
```tsx
<DecisionEngineModal
  isOpen={isDecisionEngineOpen}
  onClose={() => setIsDecisionEngineOpen(false)}
  yearData={yearData}
  year={year}
/>
```

## Modal Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | boolean | Controls modal visibility |
| `onClose` | function | Handler to close modal |
| `yearData` | YearBreakdownData | Property/year data for funnels |
| `year` | number | Year number for title |

## Testing Checklist

- [ ] Link appears below "Expand Full Details"
- [ ] Text is grey and smaller than main button
- [ ] Link only shows on last card per year
- [ ] Clicking opens modal
- [ ] Modal shows three funnels
- [ ] Modal title shows correct year
- [ ] Modal can be closed with X button
- [ ] Modal can be closed by clicking outside
- [ ] Modal scrolls if content too tall
- [ ] Funnels display correctly on desktop
- [ ] Funnels stack on mobile
- [ ] No console errors

## Browser Support

✅ Chrome/Edge
✅ Firefox  
✅ Safari
✅ Mobile browsers

## Accessibility

✅ Keyboard navigation (Tab)
✅ ESC to close
✅ Screen reader compatible
✅ Focus management
✅ Proper ARIA labels

## Notes

- Modal uses max-w-6xl (1152px) for comfortable chart viewing
- On mobile, funnels stack vertically (grid-cols-1)
- On desktop (1024px+), funnels display side-by-side (grid-cols-3)
- Modal content scrolls if it exceeds 90vh
- Dark backdrop provides clear visual separation


