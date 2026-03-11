# Pipedrive Timeline - Quick Reference Card

## 🎯 What Was Built

A Pipedrive-inspired timeline with year circles on the left connected to property cards on the right via horizontal and vertical lines.

## 📁 Files Modified

```
NEW: src/components/YearCircle.tsx          (Year circle component)
MOD: src/components/InvestmentTimeline.tsx  (Timeline layout)
```

## 🎨 Visual Structure

```
Desktop:                     Mobile:
┌─────────────────────┐     ┌─────────────────┐
│ ●──── Card          │     │ 2025            │
│ │                   │     │ ──────────────  │
│ └──── Card          │     │ Card            │
│       ▶ Engine      │     │ Card            │
│                     │     │ ▶ Engine        │
│       ▶ Gap (3y)    │     │                 │
│ │                   │     │ ▶ Gap (3y)      │
│ ●──── Card          │     │                 │
│       ▶ Engine      │     │ 2029            │
└─────────────────────┘     │ ──────────────  │
                            │ Card            │
                            │ ▶ Engine        │
                            └─────────────────┘
```

## 📏 Key Dimensions

| Element | Size | Class |
|---------|------|-------|
| Circle | 48×48px | `w-12 h-12` |
| Left Column | 80px | `w-20` |
| H-Line | 32×2px | `w-8 h-0.5` |
| V-Line | 2px wide | `w-0.5` |
| Branch | 40×2px | `w-10 h-0.5` |

## 🎨 Colors

| Element | Color | Class |
|---------|-------|-------|
| Circle BG | Grey | `bg-gray-600` |
| Text | White | `text-white` |
| Lines | Lt Grey | `bg-gray-300` |

## 💻 Code Snippet

### YearCircle Usage
```tsx
<YearCircle
  year={2025}
  isFirst={false}
  isLast={false}
  hasMultipleProperties={true}
  height={350}
/>
```

### Timeline Layout
```tsx
<div className="flex gap-6">
  {/* Left: Circles (desktop only) */}
  <div className="hidden md:flex flex-col w-20">
    {yearGroups.map(group => (
      <YearCircle {...props} />
    ))}
  </div>
  
  {/* Right: Cards */}
  <div className="flex-1 space-y-6">
    {content}
  </div>
</div>
```

## 🔍 Key Features

### Desktop (≥768px)
- ✅ Year circles on left
- ✅ Horizontal lines to cards
- ✅ Vertical lines connect years
- ✅ Branch lines for multiples

### Mobile (<768px)
- ✅ Circles hidden
- ✅ Year as header
- ✅ Full-width cards
- ✅ All functions work

## 🎯 Testing Checklist

Quick visual inspection:
1. [ ] Year circles visible (desktop)
2. [ ] Lines connect properly
3. [ ] Alignment perfect
4. [ ] Colors grey (circles/lines)
5. [ ] Mobile shows year headers

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| Lines don't connect | Check height measurement |
| Circles on mobile | Verify `hidden md:flex` |
| Wrong alignment | Check refs and useEffect |
| Performance lag | Check useMemo dependencies |

## 📚 Documentation

- **Full Docs**: `PIPEDRIVE_TIMELINE_IMPLEMENTATION.md`
- **Visual Guide**: `PIPEDRIVE_TIMELINE_VISUAL_GUIDE.md`
- **Testing**: `PIPEDRIVE_TIMELINE_TEST_GUIDE.md`
- **Summary**: `PIPEDRIVE_TIMELINE_COMPLETE.md`

## 🚀 Quick Commands

```bash
# Start dev server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

## 🔄 Common Customizations

### Change Circle Color
```tsx
// YearCircle.tsx line 16
className="... bg-blue-600 ..."  // Change from gray-600
```

### Change Line Color
```tsx
// Any line element
className="... bg-blue-300 ..."  // Change from gray-300
```

### Adjust Breakpoint
```tsx
// InvestmentTimeline.tsx
className="hidden lg:flex ..."  // Change from md: to lg:
```

### Change Circle Size
```tsx
// YearCircle.tsx
className="... w-16 h-16 ..."  // Change from w-12 h-12
```

## ✅ Status

- **Implementation**: ✅ Complete
- **Testing**: ✅ Passed
- **Documentation**: ✅ Complete
- **Linting**: ✅ No errors
- **Production Ready**: ✅ Yes

## 📞 Quick Help

### Lines Not Connecting?
Check height measurement logic in `InvestmentTimeline.tsx` around line 412.

### Mobile Issues?
Check responsive classes: `hidden md:flex` for desktop, `md:hidden` for mobile.

### Alignment Off?
Ensure refs are properly set and useEffect dependencies are correct.

### Performance?
Check useMemo dependencies in timeline grouping logic.

## 🎓 Learning Path

1. **Quick Start**: Read this file (5 min)
2. **Visual Guide**: Understand styling (10 min)
3. **Implementation**: Deep dive code (20 min)
4. **Testing**: Run test scenarios (15 min)

---

**Version**: 1.0.0  
**Last Updated**: November 8, 2025  
**Status**: Production Ready ✅



