# Fixed Header - Quick Reference Guide

## 🎯 What Was Implemented

A sticky header on the right side that keeps metrics, tabs, and year navigation visible while content scrolls independently.

## 📁 Files Modified

1. **`src/index.css`** - Custom scrollbar styling
2. **`src/components/Dashboard.tsx`** - Layout restructure
3. **`src/components/InvestmentTimeline.tsx`** - Component exports & scroll logic

## 🔑 Key Features

✅ Metrics bar always visible  
✅ Tab navigation always visible  
✅ Year buttons always visible (Timeline tab)  
✅ Timeline content scrolls independently  
✅ Left side scrolls independently  
✅ Minimal transparent scrollbar  
✅ No double scrollbars  
✅ Smooth year navigation

## 🏗️ Structure at a Glance

```
Dashboard (h-screen, flex)
├── Left (w-2/5, overflow-y-auto)
│   └── Strategy Builder
└── Right (w-3/5, flex flex-col)
    ├── Fixed Header (sticky top-0)
    │   ├── Summary Bar
    │   ├── Tabs
    │   └── Year Nav (Timeline only)
    └── Scrollable Content (flex-1, overflow-y-auto)
        └── Current Tab
```

## 💻 Code Snippets

### Custom Scrollbar (CSS)
```css
.scrollable-content::-webkit-scrollbar {
  width: 6px;
}
.scrollable-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
```

### Dashboard Layout (TSX)
```tsx
<div className="flex h-screen bg-white">
  {/* Left Side */}
  <div className="w-2/5 overflow-y-auto p-8 scrollable-content">
    {/* Content */}
  </div>
  
  {/* Right Side */}
  <div className="w-3/5 flex flex-col bg-white">
    {/* Fixed Header */}
    <div className="sticky top-0 z-10 bg-white">
      {/* Header items */}
    </div>
    
    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto p-6 scrollable-content">
      {/* Tab content */}
    </div>
  </div>
</div>
```

### Timeline with Ref (TSX)
```tsx
// In Dashboard
const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null);
const timelineData = useTimelineData();

<InvestmentTimeline ref={timelineRef} />

// Scroll to year
timelineRef.current?.scrollToYear(2027);
```

## 🎨 CSS Classes Used

### Layout
- `flex` - Flexbox container
- `h-screen` - Full viewport height
- `flex-col` - Column direction
- `flex-1` - Flexible sizing

### Scrolling
- `overflow-y-auto` - Vertical scroll
- `scrollable-content` - Custom scrollbar
- `sticky top-0` - Sticky positioning
- `z-10` - Stack order

### Sizing
- `w-2/5` - 40% width
- `w-3/5` - 60% width
- `p-8` - 32px padding
- `p-6` - 24px padding

### Colors
- `bg-white` - White background
- `border-[#f3f4f6]` - Light gray border
- `#87B5FA` - Blue accent (active)

## 🔧 Exported Components/Hooks

### From InvestmentTimeline
```typescript
// Component
export const TimelineProgressBar: React.FC<TimelineProgressBarProps>

// Hook
export const useTimelineData = () => {
  return { startYear, endYear, latestPurchaseYear };
}

// Component with ref
export const InvestmentTimeline = React.forwardRef<{
  scrollToYear: (year: number) => void
}>
```

## 📊 State Management

### Dashboard
```typescript
const [activeTab, setActiveTab] = useState('timeline');
const timelineRef = useRef<{ scrollToYear: (year: number) => void }>(null);
const timelineData = useTimelineData();
```

### Timeline Data
```typescript
{
  startYear: 2025,
  endYear: 2039,
  latestPurchaseYear: 2032
}
```

## 🎯 How It Works

1. **Fixed Header**: Uses `sticky top-0` to stay at top
2. **Independent Scroll**: Each side has `overflow-y-auto`
3. **Year Navigation**: Uses ref to communicate with Timeline
4. **Smooth Scroll**: Native `behavior: 'smooth'` on scroll

## 🐛 Troubleshooting

### Header Not Sticking
- Check parent has `flex flex-col`
- Ensure `sticky top-0 z-10 bg-white`
- Verify no ancestor has `overflow: hidden`

### Scrollbar Not Showing
- Add `overflow-y-auto` to container
- Apply `scrollable-content` class
- Check content exceeds container height

### Year Navigation Not Working
- Verify Timeline has ref prop
- Check element IDs exist (`year-${year}`)
- Ensure `.scrollable-content` parent exists

### Double Scrollbars
- Only one `overflow-y-auto` per hierarchy
- Remove old scroll containers
- Check nested overflow contexts

## 📱 Responsive Notes

Current implementation:
- Desktop-optimized (2-column layout)
- Left: 40%, Right: 60%
- Both sides scroll independently

Future mobile considerations:
- Stack vertically
- Full-width fixed header
- Tabs/accordion for sections

## ⚡ Performance Tips

- Uses hardware-accelerated `sticky`
- Native browser scrolling
- No scroll event listeners
- Efficient ref communication
- Solid backgrounds prevent repaints

## 🎨 Design Tokens

```
Colors:
- Blue Active: #87B5FA
- Gray Text: #6b7280
- Dark Text: #111827
- Border: #f3f4f6
- Background: #f9fafb

Spacing:
- Gap between columns: 32px (gap-8)
- Left padding: 32px (p-8)
- Right padding: 24px (p-6)
- Year button gap: 4px (gap-1)

Scrollbar:
- Width: 6px
- Thumb: rgba(0, 0, 0, 0.2)
- Radius: 3px
```

## 🧪 Testing Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## ✅ Verification Checklist

After implementation:

- [ ] Metrics bar stays visible when scrolling
- [ ] Tabs stay visible when scrolling
- [ ] Year buttons stay visible (Timeline tab)
- [ ] Timeline content scrolls under header
- [ ] Left side scrolls independently
- [ ] Clicking years scrolls smoothly
- [ ] Scrollbar is minimal (6px, transparent)
- [ ] No double scrollbars
- [ ] Switching tabs works correctly
- [ ] Year nav only shows on Timeline tab

## 📚 Related Documentation

- `FIXED_HEADER_IMPLEMENTATION.md` - Full implementation details
- `FIXED_HEADER_VISUAL_GUIDE.md` - Visual diagrams and flows
- `VISUAL_HIERARCHY_GUIDE.md` - Overall design system

## 🔗 Key Relationships

```
Dashboard
  ├─► uses useTimelineData()
  ├─► renders TimelineProgressBar
  └─► passes ref to InvestmentTimeline

InvestmentTimeline
  ├─► exposes scrollToYear()
  ├─► exports useTimelineData()
  └─► exports TimelineProgressBar

TimelineProgressBar
  ├─► receives year range
  └─► calls onYearClick(year)
```

## 💡 Quick Tips

1. **Adding to Header**: Add to sticky div in Dashboard
2. **Changing Tab Content**: Update content div in Dashboard
3. **Styling Scrollbar**: Modify `.scrollable-content` in index.css
4. **Adjusting Heights**: Change `h-screen` or flex values
5. **Modifying Years**: Update in useTimelineData hook

## 🚀 Quick Start

To use this implementation:

```tsx
// 1. Import components
import { InvestmentTimeline, TimelineProgressBar, useTimelineData } from './InvestmentTimeline';

// 2. Setup ref and data
const timelineRef = useRef(null);
const timelineData = useTimelineData();

// 3. Render with fixed header
<div className="flex flex-col">
  <div className="sticky top-0 z-10 bg-white">
    <TimelineProgressBar {...timelineData} onYearClick={handleYearClick} />
  </div>
  <div className="flex-1 overflow-y-auto scrollable-content">
    <InvestmentTimeline ref={timelineRef} />
  </div>
</div>
```

## 📞 Support

For questions or issues:
1. Check the implementation guide
2. Review visual guide for structure
3. Verify all CSS classes are applied
4. Check browser console for errors
5. Test in different browsers

---

**Last Updated**: Implementation Complete  
**Status**: ✅ Production Ready  
**Version**: 1.0


