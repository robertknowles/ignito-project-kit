# Color Palette & Styling Quick Reference

## Chart Colors (All Charts)

Use these exact colors for **all** charts in the application:

```javascript
const CHART_COLORS = {
  primary: '#3B82F6',    // Blue (Portfolio Value, primary lines)
  success: '#10B981',    // Green (Equity, positive values, income)
  danger: '#EF4444',     // Red (Debt, negative values, expenses)
  secondary: '#6B7280',  // Grey (axes, secondary lines)
  goal: '#F59E0B',       // Amber (goal lines)
};
```

### Usage Examples

**Line Charts**:
```tsx
<Line stroke="#3B82F6" strokeWidth={2} />  // Primary data
<Line stroke="#10B981" strokeWidth={2} />  // Secondary data (equity)
<Line stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" />  // Tertiary (debt/goals)
```

**Bar Charts**:
```tsx
<Bar fill="#10B981" />  // Positive/Income
<Bar fill="#EF4444" />  // Negative/Expenses
<Bar fill="#3B82F6" />  // Net/Primary
```

**Reference Lines**:
```tsx
<ReferenceLine stroke="#6B7280" strokeDasharray="5 5" />  // Break-even, etc.
<ReferenceLine stroke="#F59E0B" strokeDasharray="5 5" />  // Goals
```

---

## Typography Hierarchy

### Headers & Labels

```css
/* Section Headers (PROPERTY DETAILS, PURCHASE, etc.) */
className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1"

/* Property/Item Title */
className="text-gray-900 text-sm font-medium"

/* Field Labels (State:, Price:, LVR:, etc.) */
className="text-gray-600 text-sm"

/* Values ($350k, 85%, etc.) */
className="text-gray-900 text-sm font-normal"

/* Separators (|) */
className="text-gray-400"
```

---

## Interactive Elements

### Buttons

```css
/* Primary Action Button */
className="text-blue-600 text-sm font-medium hover:text-blue-700"

/* Active State (Progress Bar, Toggles) */
className="bg-blue-600 text-white"

/* Inactive State */
className="bg-gray-300 text-gray-600"
```

### Links

```css
/* Standard Link */
className="text-blue-600 hover:text-blue-700"
```

---

## Semantic Colors

**These should remain unchanged** - they communicate meaning:

### Success/Pass States
```css
className="text-green-600"  /* Text */
className="bg-green-50"     /* Background */
className="border-green-200" /* Border */
```

### Error/Fail States
```css
className="text-red-600"    /* Text */
className="bg-red-50"       /* Background */
className="border-red-200"  /* Border */
```

### Info/Neutral
```css
className="text-blue-600"   /* Text */
className="bg-blue-50"      /* Background */
className="border-blue-200" /* Border */
```

---

## Component-Specific Guidelines

### PurchaseEventCard
- Section headers: `text-gray-500 text-xs font-medium uppercase tracking-wide`
- Buttons: `text-blue-600 text-sm`
- Property title: `text-gray-900 text-sm font-medium`

### InvestmentTimeline
- Active year: `bg-blue-600 text-white`
- Future year: `bg-gray-300 text-gray-600`
- Connecting lines: `bg-blue-600` (active) / `bg-gray-300` (future)

### CashflowChart
- Positive bars: `#10B981`
- Negative bars: `#EF4444`
- Break-even line: `#6B7280` dashed

### PortfolioGrowthChart
- Portfolio Value: `#3B82F6`
- Equity: `#10B981`
- Goal line: `#F59E0B` dashed

### PerPropertyTracking
- Use same colors as main charts
- Property Value: `#3B82F6`
- Equity: `#10B981`
- Loan Balance: `#EF4444` dashed
- Rental Income: `#10B981`
- Expenses: `#EF4444`
- Net Cashflow: `#3B82F6`

---

## Do's and Don'ts

### ✅ DO:
- Use `#3B82F6` for primary chart data
- Use `#10B981` for positive/equity/income
- Use `#EF4444` for negative/debt/expenses
- Use grey headers for sections
- Use blue for action buttons
- Preserve semantic green/red for PASS/FAIL

### ❌ DON'T:
- Use bright green (`text-green-700`) for UI elements
- Mix different shades of blue/green/red in charts
- Use vibrant colors for headers
- Change semantic success/error colors
- Use green for primary action buttons

---

## Migration Checklist

When adding new components:

1. **Charts**: Use standard color palette
   - [ ] Blue for primary data
   - [ ] Green for success/positive
   - [ ] Red for danger/negative
   - [ ] Grey for secondary

2. **Typography**: Follow hierarchy
   - [ ] Grey for section headers
   - [ ] Black for values
   - [ ] Medium grey for labels

3. **Buttons**: Use blue
   - [ ] `text-blue-600` for text buttons
   - [ ] `bg-blue-600` for filled buttons

4. **Semantic Colors**: Keep meaningful
   - [ ] Green for PASS/success
   - [ ] Red for FAIL/error
   - [ ] Amber for goals/highlights

---

## Quick Copy-Paste

### Section Header
```tsx
<div className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
  SECTION NAME
</div>
```

### Action Button
```tsx
<button className="text-blue-600 text-sm font-medium hover:text-blue-700">
  Button Text
</button>
```

### Chart Line
```tsx
<Line 
  type="monotone" 
  dataKey="value" 
  stroke="#3B82F6" 
  strokeWidth={2}
  name="Display Name"
/>
```

### Chart Bar
```tsx
<Bar dataKey="value" fill="#10B981" name="Display Name" />
```

---

## Color Values for Reference

```
Blue:   #3B82F6  rgb(59, 130, 246)   text-blue-600   bg-blue-600
Green:  #10B981  rgb(16, 185, 129)   text-green-500  bg-green-500
Red:    #EF4444  rgb(239, 68, 68)    text-red-500    bg-red-500
Grey:   #6B7280  rgb(107, 114, 128)  text-gray-500   bg-gray-500
Amber:  #F59E0B  rgb(245, 158, 11)   text-amber-500  bg-amber-500
```

---

## Support

For questions or clarifications about the color system:
- Reference: `COLOR_HIERARCHY_UPDATE_SUMMARY.md`
- Visual Guide: `COLOR_UPDATE_VISUAL_GUIDE.md`
- This Quick Reference: `COLOR_PALETTE_QUICK_REFERENCE.md`



