# UI Style Analysis: Old vs New

## What Made the Old UI Clean

### 1. Property Cards - OLD (Clean)

**Visual Characteristics:**
- **White background** with subtle border
- **Compact, horizontal layout** - all info in one clean row
- **Clear visual grouping** with subtle separators
- **Minimal padding** - information dense but not cramped
- **Small, grey secondary text** for labels
- **Bold, dark primary text** for values
- **Green badges** for status (feasible, IO/P&I)
- **No excessive whitespace**

**Typography:**
- Property title: Medium weight, dark grey
- Year/Location: Small, light grey (2025, 2025 H1)
- Labels: Very small, light grey, uppercase or regular
- Values: Medium size, dark, bold
- Status badges: Small, green background, white text

**Layout:**
```
[Icon] Units / Apartments
2025          Deposit: $53k • Loan: $298k • Purchase Price: $350k
2025 H1       Portfolio Value: $350k • Total Equity: $53k
              Loan: [IO] [P&I]                                    [feasible]
```

**Spacing:**
- Tight line height (1.2-1.4)
- Minimal padding inside card (12-16px)
- Small gap between properties (8-12px)

---

### 2. Property Cards - NEW (Messy)

**Problems:**
- **Too much vertical space** - cards are unnecessarily tall
- **Inconsistent text hierarchy** - everything looks the same weight
- **Poor grouping** - PROPERTY DETAILS, PURCHASE, FINANCE sections are too separated
- **Excessive padding** - wasted whitespace
- **Inconsistent colors** - green headers are too bright/prominent
- **Timeline circle takes up too much space**
- **Font sizes are inconsistent**

**What's Wrong:**
```
[Big Circle: 2025]  ─────  [Icon] Units / Apartments (VIC) | Year: 2025 | Growth: High

                           PROPERTY DETAILS
                           State: VIC | Yield: 7.0% | Rent: $471/wk
                           
                           PURCHASE
                           Price: $350k | Valuation: $378k | %MV: -7.4%
                           
                           FINANCE
                           LVR: 85% | IO @ 6.5% 30 yrs | Loan: $302k | LMI: $4,462.5 | Offset: $0
```

---

## Key Differences

| Element | OLD (Clean) | NEW (Messy) |
|---------|-------------|-------------|
| **Card Height** | Compact (~80-100px) | Tall (~200px+) |
| **Text Hierarchy** | Clear (3 levels) | Unclear (all similar) |
| **Section Headers** | None (implied by layout) | Green, uppercase, too prominent |
| **Spacing** | Tight, efficient | Loose, wasteful |
| **Timeline Visual** | None (just list) | Big circle + line (too much space) |
| **Background** | Clean white cards | White cards + grey circle |
| **Font Weight** | Mix of regular/bold | Mostly regular |
| **Color Usage** | Minimal (green badges only) | Too much green |

---

## Typography System - OLD

### Font Sizes
- **Extra Small**: 10-11px (labels, secondary info)
- **Small**: 12-13px (values, body text)
- **Medium**: 14-15px (property title)
- **Large**: 16-18px (section headers, metrics)

### Font Weights
- **Regular (400)**: Labels, secondary text
- **Medium (500)**: Property titles, some values
- **Semibold (600)**: Important values, metrics
- **Bold (700)**: Rarely used

### Colors
- **Primary Text**: #1F2937 (grey-900)
- **Secondary Text**: #6B7280 (grey-500)
- **Tertiary Text**: #9CA3AF (grey-400)
- **Success**: #10B981 (green-500)
- **Borders**: #E5E7EB (grey-200)
- **Background**: #FFFFFF (white)
- **Background Alt**: #F9FAFB (grey-50)

---

## Spacing System - OLD

### Padding
- **Card**: 12-16px
- **Sections**: 8px between sections
- **Elements**: 4px between related items

### Margins
- **Between cards**: 8-12px
- **Between sections**: 16-24px

### Line Height
- **Tight**: 1.2 (compact lists)
- **Normal**: 1.4 (body text)
- **Relaxed**: 1.6 (headings)

---

## What to Restore

### 1. Property Cards
- Remove section headers (PROPERTY DETAILS, PURCHASE, FINANCE)
- Use inline layout with bullet separators (•)
- Reduce padding to 12-16px
- Use smaller font sizes (12-13px for values)
- Make labels light grey and tiny (10-11px)
- Reduce card height significantly

### 2. Timeline Visual
- Remove or significantly shrink the year circle
- Make timeline line thinner and lighter
- Reduce horizontal space taken by timeline visual

### 3. Typography
- Restore 3-level hierarchy (labels, values, titles)
- Use proper font weights (regular for labels, semibold for values)
- Reduce overall font sizes by 10-20%

### 4. Spacing
- Reduce padding everywhere
- Tighten line heights
- Reduce gaps between cards

### 5. Colors
- Use green sparingly (only for status badges)
- Remove green section headers
- Use grey for all labels and secondary text
