# Visual Hierarchy Guide - Investment Timeline

## Design Philosophy

The investment timeline follows a clear visual hierarchy where property details are **primary**, decision engine features are **secondary**, and gap analysis is **tertiary**.

## Component Hierarchy

### 1. PRIMARY: Property Cards (High Visual Weight)

**PurchaseEventCard Component**

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Units/Apartments (VIC) | Year: 2025 | Growth: High      │
│                                                               │
│ PROPERTY DETAILS                                              │
│ State: VIC | Yield: 7.0% | Rent: $471/wk                    │
│                                                               │
│ PURCHASE                                                      │
│ Price: $350k | Valuation: $378k | %MV: -7.4%                │
│                                                               │
│ FINANCE                                                       │
│ LVR: 85% | IO @ 6.5% 30 yrs | Loan: $302k | LMI: $4,462.5   │
│                                                               │
│ [ Save Changes ]  [ Expand Full Details → ]                  │
│                                                               │
│              ▶ Expand Decision Engine Analysis                │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics**:
- ✅ White background with shadow
- ✅ Strong border
- ✅ Bold green section headers
- ✅ Clear readable text
- ✅ Editable fields with hover states
- ✅ Prominent action buttons

### 2. SECONDARY: Decision Engine (Medium Visual Weight)

**Expanded Decision Engine (when opened)**

```
┌─────────────────────────────────────────────────────────────┐
│              ▼ Expand Decision Engine Analysis                │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
│                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │  Deposit    │ │ Serviceabi- │ │  Borrowing  │            │
│ │  Test       │ │ lity Test   │ │  Capacity   │            │
│ │  Funnel     │ │  Funnel     │ │  Test       │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**Visual Characteristics**:
- ⚪ Appears below property card when expanded
- ⚪ Border separator
- ⚪ Three-column layout
- ⚪ Clear but not dominant

### 3. TERTIARY: Gap Periods (Low Visual Weight)

**GapView Component (Collapsed)**

```
                ▶ Show 2026–2028 progression (3 years)
```

**GapView Component (Expanded)**

```
                ▼ Show 2026–2028 progression (3 years)

    The 3-year wait from 2026 to 2028 was primarily due to
    the Deposit Test. This constraint was resolved in 2028.

    ▶ Year 2026 | Portfolio: $378k | Equity: $53k | LVR: 85.0% | ...
    ▶ Year 2027 | Portfolio: $411k | Equity: $86k | LVR: 78.2% | ...
    ▶ Year 2028 | Portfolio: $438k | Equity: $113k | LVR: 73.4% | ...
```

**Visual Characteristics**:
- 🔘 Light grey text (text-gray-400)
- 🔘 Small font (text-sm)
- 🔘 No background
- 🔘 No border
- 🔘 Centered alignment
- 🔘 Minimal visual presence

## Color Coding

### Property Cards
- **Headers**: Green (#16a34a) - Bright and clear
- **Text**: Dark grey (#111827) - High contrast
- **Background**: White (#ffffff) - Clean
- **Border**: Grey (#e5e7eb) - Defined
- **Editable Fields**: Blue hover (#3b82f6) - Interactive

### Decision Engine Expander
- **Text**: Medium grey (#9ca3af) - Subtle
- **Hover**: Darker grey (#4b5563) - Gentle feedback
- **Background**: None - Minimal
- **Border**: Light grey separator - Gentle division

### Gap Controls
- **Text**: Light grey (#d1d5db) - Very subtle
- **Hover**: Medium grey (#6b7280) - Gentle feedback
- **Background**: None - Invisible
- **Border**: None - Seamless

## Interaction Patterns

### Property Cards
1. **Always Visible**: All details shown by default
2. **Click to Edit**: Individual fields editable inline
3. **Modal Access**: "Expand Full Details" for deep dive
4. **Optional Analysis**: Decision engine hidden until requested

### Gap Periods
1. **Hidden by Default**: Just a small button
2. **Click to Reveal**: Shows AI summary + year list
3. **Drill Down**: Each year can expand to show funnels
4. **Non-Intrusive**: Easy to collapse and ignore

## Spacing & Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPERTY CARD #1                          │
│                    (Full Details)                            │
│                    ▶ Optional Decision Engine                │
└─────────────────────────────────────────────────────────────┘

                ▶ Show 2026-2028 progression (3 years)

┌─────────────────────────────────────────────────────────────┐
│                    PROPERTY CARD #2                          │
│                    (Full Details)                            │
│                    ▶ Optional Decision Engine                │
└─────────────────────────────────────────────────────────────┘

                ▶ Show 2029-2031 progression (3 years)

┌─────────────────────────────────────────────────────────────┐
│                    PROPERTY CARD #3                          │
│                    (Full Details)                            │
│                    ▶ Optional Decision Engine                │
└─────────────────────────────────────────────────────────────┘
```

**Spacing Rules**:
- Property cards: 1.5rem (24px) gap
- Gap controls: 1rem (16px) margin top/bottom
- Decision engine expander: 0.75rem (12px) margin top
- Section headers: 0.75rem (12px) margin bottom

## Typography Scale

```
Property Type Header:     14px, medium weight, grey
Section Headers:          12px, semibold, green
Property Values:          14px, normal weight, grey
Editable Fields:          14px, medium weight on hover
Action Buttons:           14px, medium weight, green
Decision Engine Button:   14px, normal weight, light grey
Gap Period Button:        14px, normal weight, light grey
AI Summary:               14px, italic, medium grey
Year Rows:                14px, normal weight, grey
```

## Responsive Behavior

### Desktop (>1024px)
- Property cards: Full width
- Decision engine funnels: 3 columns
- Gap year rows: Full width with all metrics visible

### Tablet (768px - 1024px)
- Property cards: Full width
- Decision engine funnels: 1 column stacked
- Gap year rows: Scrollable horizontally

### Mobile (<768px)
- Property cards: Full width, sections stack
- Decision engine funnels: 1 column stacked
- Gap year rows: Condensed format

## Accessibility

### Focus States
- ✅ All buttons have focus rings
- ✅ Editable fields show clear focus
- ✅ Keyboard navigation supported

### Screen Readers
- ✅ Proper ARIA labels on expanders
- ✅ Clear button text
- ✅ Semantic HTML structure

### Color Contrast
- ✅ Property cards: High contrast (AAA)
- ✅ Decision engine: Medium contrast (AA)
- ✅ Gap controls: Medium contrast (AA)

## Summary

The visual hierarchy ensures that:
1. **Users see property details first** - The most important information
2. **Decision engine is available but not intrusive** - Optional deep dive
3. **Gap periods don't clutter the view** - Minimal, dismissible

This creates a clean, focused experience where users get what they need immediately, with powerful analysis tools available when they want them.



