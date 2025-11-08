# Projections Tab - Visual Guide

## UI Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Property Details - [Property Type]                        [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Property & Loan] [Purchase Costs] [Cashflow] [Projections]   │
│  ─────────────────────────────────────────────  ══════════════  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📊 10-Year Financial Projections                         │ │
│  │ Based on [Property Title] purchased in [H1 2025]         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Metric               │  Year 1  │  Year 5  │  Year 10    │ │
│  ├─────────────────────┼──────────┼──────────┼─────────────┤ │
│  │ Property Value       │ $750,000 │ $950,000 │ $1,200,000  │ │
│  │ Total Equity         │ $150,000 │ $350,000 │   $600,000  │ │
│  │ Net Annual Cashflow  │  -$5,000 │  +$2,000 │    +$8,000  │ │
│  │ 🟨 COC Return %      │   -2.5%  │    —     │      —      │ │
│  │ 🟦 Annualized ROIC % │    —     │    —     │    10.0%    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Total Cash Invested:                          $200,000    │ │
│  │ ─────────────────────────────────────────────────────────│ │
│  │ COC Return: Year 1 net cashflow divided by total cash    │ │
│  │ invested (deposit + acquisition costs)                    │ │
│  │                                                            │ │
│  │ Annualized ROIC: Total return (equity gain + cumulative  │ │
│  │ cashflow) divided by cash invested over 10 years         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                    [Cancel]  [Save Changes]    │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Header Section
- **Blue background** (`bg-blue-50`) with blue border (`border-blue-200`)
- Dark blue text for heading (`text-blue-900`)
- Medium blue text for subtitle (`text-blue-700`)

### Table Styling
- **Header row**: Light gray background (`bg-gray-50`) with darker gray border
- **Regular rows**: White background with hover effect (`hover:bg-gray-50`)
- **COC Return row**: Amber background highlight (`bg-amber-50`)
- **ROIC row**: Blue background highlight (`bg-blue-50`)

### Value Colors
- **Property Value & Equity**: Standard gray text (`text-gray-900`)
- **Positive Cashflow**: Green text (`text-green-600`) with `+` prefix
- **Negative Cashflow**: Red text (`text-red-600`) with `-` sign
- **Positive Returns (COC/ROIC)**: Green bold text (`text-green-600 font-medium`)
- **Negative Returns (COC/ROIC)**: Red bold text (`text-red-600 font-medium`)
- **N/A values**: Light gray (`text-gray-400`) with em dash `—`

### Footer Section
- Light gray background (`bg-gray-50`) with border
- Bold labels for metric definitions
- Subtle text color for explanatory notes

## Loading State

```
┌─────────────────────────────────────────────────────────────────┐
│ Property Details - [Property Type]                        [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Property & Loan] [Purchase Costs] [Cashflow] [Projections]   │
│  ─────────────────────────────────────────────  ══════════════  │
│                                                                 │
│                          ⟳                                      │
│                                                                 │
│                  Calculating projections...                     │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Interactive Elements

### Hover Effects
1. **Table Rows**: Slight gray background on hover for better readability
2. **Cancel Button**: Border highlight on hover
3. **Save Changes Button**: Darker background on hover

### Responsive Behavior
- Table wrapped in `overflow-x-auto` container
- Scrollable horizontally on smaller screens
- Maintains readability at all viewport sizes

## Typography Hierarchy

```
┌─ Dialog Title ─────────────────────────────────────┐
│  text-lg, font-semibold                            │
├─ Tab Labels ───────────────────────────────────────┤
│  text-sm, medium weight                            │
├─ Section Heading ──────────────────────────────────┤
│  text-sm, font-semibold                            │
├─ Section Subtitle ─────────────────────────────────┤
│  text-xs                                           │
├─ Table Headers ────────────────────────────────────┤
│  text-sm, font-semibold                            │
├─ Table Row Labels ─────────────────────────────────┤
│  text-sm, font-medium                              │
├─ Table Values ─────────────────────────────────────┤
│  text-sm, regular weight                           │
└─ Explanatory Text ─────────────────────────────────┘
   text-xs, lighter color
```

## Spacing & Layout

### Vertical Spacing
- Tab content wrapper: `space-y-4` (1rem gap)
- Projections content: `space-y-6` (1.5rem gap)
- Footer content: `space-y-2` (0.5rem gap)

### Padding
- Header box: `p-4` (1rem all sides)
- Table cells: `py-3 px-4` (0.75rem vertical, 1rem horizontal)
- Footer box: `p-4` (1rem all sides)
- Loading state: `py-12` (3rem vertical)

### Borders
- Header: 1px solid border with rounded corners (`rounded-lg`)
- Table header: 2px bottom border
- Table rows: 1px bottom border
- Footer: 1px border with rounded corners

## Data Format Examples

### Currency Formatting
```javascript
$750,000   // toLocaleString() adds comma separators
$1,200,000 // Large numbers remain readable
-$5,000    // Negative values include minus sign
+$8,000    // Positive cashflow includes plus sign
```

### Percentage Formatting
```javascript
-2.50%  // toFixed(2) ensures 2 decimal places
10.00%  // Consistent decimal precision
4.56%   // Handles various precision levels
```

### Text Formatting
```javascript
"H1 2025"          // Purchase period
"Melbourne House"  // Property title
"—"                // Em dash for N/A values
```

## Accessibility Considerations

1. **Semantic HTML**: Proper `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` structure
2. **Color + Text**: Not relying on color alone (includes +/- symbols, text labels)
3. **Loading State**: Clear text message alongside spinner
4. **Contrast**: Sufficient contrast ratios for all text colors
5. **Explanatory Text**: Definitions provided for complex metrics

## Edge Cases Handled

1. **No tracking data**: Loading spinner displays
2. **Missing array elements**: Optional chaining (`?.`) prevents errors
3. **Zero/negative values**: Proper color coding and formatting
4. **Long property names**: Text wraps appropriately
5. **Narrow screens**: Horizontal scroll for table

## Implementation Details

### Key Data Points Displayed
- **equityOverTime[0, 4, 9]**: Years 1, 5, 10 data points
- **cashflowOverTime[0, 4, 9]**: Corresponding cashflow data
- **cashOnCashReturn**: Single value for Year 1
- **roic**: Single value for Year 10 annualized return
- **totalCashInvested**: Context footer

### Conditional Rendering
```javascript
{!trackingData ? (
  // Loading state
) : (
  // Full projections table
)}
```

### Color Logic
```javascript
className={value >= 0 ? 'text-green-600' : 'text-red-600'}
{value >= 0 ? '+' : ''}
```

## User Workflow

1. **Navigate to Per-Property Tracking** tab in main app
2. **Click "Edit Details"** button on any property card
3. **Modal opens** with PropertyDetailModal
4. **Click "Projections" tab** (4th tab)
5. **View projections** for years 1, 5, and 10
6. **Read explanations** in footer for metric definitions
7. **Close modal** via Cancel or Save Changes

---

This visual guide provides a comprehensive overview of the Projections tab UI, including layout, styling, interactions, and user experience considerations.

