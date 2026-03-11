# Feasibility Checker - Visual Guide

## Visual Examples of the Feasibility Checker UI

This document shows what users will see when the Feasibility Checker detects issues.

---

## 🔵 Minor Warning (Blue)

**Scenario**: Timeline slightly too short

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Strategy Optimization                                      ✖ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Your goals are close! Here's a small adjustment to consider:   │
│                                                                 │
│ Current Challenges:                                             │
│ • Timeline too short for 11 properties (max 10 in 5 years)     │
│                                                                 │
│ Suggested Adjustments:                                          │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Extend timeline to 6 years                    MEDIUM  │      │
│ │ Allows for 11 properties at a sustainable pace        │      │
│ │ (2 per year)                                          │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ─────────────────────────────────────────────────────────      │
│ 💡 These are suggestions to help optimize your strategy.       │
│    You can proceed as-is or make adjustments.                  │
└─────────────────────────────────────────────────────────────────┘
```

**Colors**:
- Background: Light blue (`bg-blue-50`)
- Border: Blue (`border-blue-200`)
- Text: Dark blue (`text-blue-900`)
- Icon: Medium blue (`text-blue-600`)

---

## 🟠 Moderate Warning (Amber)

**Scenario**: Significant deposit shortfall

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Strategy Optimization                                      ✖ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Your goals are ambitious! Here are some adjustments that       │
│ would help:                                                     │
│                                                                 │
│ Current Challenges:                                             │
│ • Deposit shortfall: $120k                                      │
│ • Borrowing capacity shortfall: $80k                            │
│                                                                 │
│ Suggested Adjustments:                                          │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Increase deposit pool to $200k                  HIGH  │      │
│ │ This would provide enough capital for your first      │      │
│ │ 2 properties                                          │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Increase borrowing capacity to $600k            HIGH  │      │
│ │ This would allow you to finance all your target       │      │
│ │ properties                                            │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Start with 3 properties instead of 5          MEDIUM  │      │
│ │ Build momentum with achievable targets, then reassess │      │
│ │ after year 5                                          │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ─────────────────────────────────────────────────────────      │
│ 💡 These are suggestions to help optimize your strategy.       │
│    You can proceed as-is or make adjustments.                  │
└─────────────────────────────────────────────────────────────────┘
```

**Colors**:
- Background: Light amber (`bg-amber-50`)
- Border: Amber (`border-amber-200`)
- Text: Dark amber (`text-amber-900`)
- Icon: Medium amber (`text-amber-600`)

---

## 🔴 Major Warning (Red)

**Scenario**: Multiple significant shortfalls

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Strategy Optimization                                      ✖ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Let's optimize your strategy to make these goals more          │
│ achievable:                                                     │
│                                                                 │
│ Current Challenges:                                             │
│ • Deposit shortfall: $300k                                      │
│ • Borrowing capacity shortfall: $500k                           │
│ • 7 properties cannot be afforded with current settings         │
│                                                                 │
│ Suggested Adjustments:                                          │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Increase deposit pool to $350k                  HIGH  │      │
│ │ This would provide enough capital for your first      │      │
│ │ 2 properties                                          │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Increase borrowing capacity to $1.5M            HIGH  │      │
│ │ This would allow you to finance all your target       │      │
│ │ properties                                            │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Start with 3 properties instead of 10           HIGH  │      │
│ │ Build momentum with achievable targets, then reassess │      │
│ │ after year 5                                          │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ┌───────────────────────────────────────────────────────┐      │
│ │ Increase annual savings by $30k/year             LOW  │      │
│ │ Reach your deposit target in 2 years                  │      │
│ └───────────────────────────────────────────────────────┘      │
│                                                                 │
│ ─────────────────────────────────────────────────────────      │
│ 💡 These are suggestions to help optimize your strategy.       │
│    You can proceed as-is or make adjustments.                  │
└─────────────────────────────────────────────────────────────────┘
```

**Colors**:
- Background: Light red (`bg-red-50`)
- Border: Red (`border-red-200`)
- Text: Dark red (`text-red-900`)
- Icon: Medium red (`text-red-600`)

---

## ✅ No Warning (Achievable)

**Scenario**: All goals are feasible

**Display**: Nothing shown - warning component returns `null`

The Investment Timeline displays normally with no feasibility warnings.

---

## UI Element Breakdown

### 1. Header Section
```
┌─────────────────────────────────────────────────────────┐
│ 💡 Strategy Optimization                              ✖ │
└─────────────────────────────────────────────────────────┘
```
- **Lightbulb icon**: Indicates helpful suggestion
- **Title**: "Strategy Optimization"
- **X button**: Dismiss warning (hover opacity: 70%)

### 2. Main Message
```
Your goals are ambitious! Here are some adjustments that would help:
```
- **Font size**: `text-sm`
- **Color**: Severity-based (blue-900, amber-900, red-900)
- **Margin bottom**: `mb-4`

### 3. Challenges Section
```
Current Challenges:
• Deposit shortfall: $120k
• Borrowing capacity shortfall: $80k
```
- **Label**: `text-xs font-medium`
- **List items**: Bulleted with colored bullets
- **Format**: "$XXXk" for thousands

### 4. Suggestion Cards
```
┌───────────────────────────────────────────────────────┐
│ Increase deposit pool to $200k                  HIGH  │
│ This would provide enough capital for your first      │
│ 2 properties                                          │
└───────────────────────────────────────────────────────┘
```
- **Background**: White (`bg-white`)
- **Border**: Light gray (`border-gray-100`)
- **Padding**: `p-3`
- **Border radius**: `rounded-md`
- **Action text**: `text-sm font-medium text-gray-900`
- **Impact text**: `text-xs text-gray-600`

### 5. Priority Badges
```
┌──────┐
│ HIGH │  Red background, red text
└──────┘

┌────────┐
│ MEDIUM │  Yellow background, yellow text
└────────┘

┌─────┐
│ LOW │  Blue background, blue text
└─────┘
```
- **High**: `bg-red-100 text-red-700`
- **Medium**: `bg-yellow-100 text-yellow-700`
- **Low**: `bg-blue-100 text-blue-700`
- **Size**: `text-xs px-2 py-0.5 rounded`

### 6. Footer Note
```
─────────────────────────────────────────────────────────
💡 These are suggestions to help optimize your strategy.
   You can proceed as-is or make adjustments.
```
- **Border top**: Lighter shade of severity color
- **Text size**: `text-xs`
- **Color**: Lighter shade (e.g., `text-blue-700` for blue severity)

---

## Responsive Behavior

### Desktop (>768px)
- Full width in timeline container
- Suggestions display in grid layout
- Clear spacing between elements

### Mobile (<768px)
- Stacks vertically
- Suggestions stack in single column
- Priority badges remain inline with action text
- Adequate touch targets for X button

---

## Animation & Transitions

### Appear
- Fades in smoothly when warning appears
- No jarring "pop-in" effect

### Dismiss
- Fades out when X button clicked
- Smooth transition out

### Re-appear
- Fades in when inputs change significantly
- Provides clear visual feedback

---

## Accessibility

### Color Contrast
- ✅ WCAG AA compliant text contrast
- ✅ Color not sole indicator (uses icons + text)

### Keyboard Navigation
- ✅ X button is keyboard accessible
- ✅ Tab order is logical
- ✅ Focus states visible

### Screen Readers
- ✅ Semantic HTML structure
- ✅ Clear headings hierarchy
- ✅ Icon has aria-label or is decorative

---

## Position in Layout

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Investment Timeline                            │
│                                                 │
│  ┌──────────┐  Feasible  Delayed  Challenging  │
│  │  2025    │  ○          ○          ○          │
│  │  H1      │                                   │
│  └──────────┘                                   │
│  Metro House • Deposit: $70k • Loan: $280k     │
│  Portfolio: $350k • Equity: $70k               │
│                                                 │
│  ┌──────────┐                                   │
│  │  2025    │                                   │
│  │  H2      │                                   │
│  └──────────┘                                   │
│  Duplex • Deposit: $85k • Loan: $315k          │
│  Portfolio: $750k • Equity: $185k              │
│                                                 │
│  [Timeline note box with explanation]          │
│                                                 │
│  ┌─────────────────────────────────────┐       │  ← Feasibility Warning
│  │ 💡 Strategy Optimization          ✖ │       │     appears here
│  ├─────────────────────────────────────┤       │
│  │ Your goals are ambitious! ...       │       │
│  │                                     │       │
│  │ Current Challenges:                 │       │
│  │ • Deposit shortfall: $120k          │       │
│  │                                     │       │
│  │ Suggested Adjustments:              │       │
│  │ [Suggestion cards...]               │       │
│  └─────────────────────────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Position**: Directly below timeline notes, above footer  
**Spacing**: `mt-6` (24px top margin)  
**Width**: Full width of timeline container

---

## State Management

### States
1. **Hidden**: `isAchievable = true` or `severity = 'none'`
2. **Visible**: Challenges detected
3. **Dismissed**: User clicked X button (`isDismissed = true`)

### Transitions
```
Hidden → Visible: User adds properties that create shortfalls
Visible → Dismissed: User clicks X button
Dismissed → Visible: User changes significant inputs (resets isDismissed)
```

---

## Real-World Examples

### Example 1: New Investor
**Settings**:
- Deposit: $30k
- Borrowing: $300k
- Timeline: 5 years
- Properties: 3 houses ($350k each)

**Result**: 🔴 Major warning
- Deposit shortfall: $180k
- Borrowing shortfall: $750k

**Suggestions**:
1. Increase deposit to $210k (HIGH)
2. Increase borrowing to $1.05M (HIGH)
3. Start with 1 property (MEDIUM)

---

### Example 2: Experienced Investor
**Settings**:
- Deposit: $150k
- Borrowing: $1.5M
- Timeline: 10 years
- Properties: 8 properties (mix)

**Result**: 🟠 Moderate warning
- Timeline too short for 8 properties (max 10 in 5 years... wait, 10 years = 20 max)
- Actually feasible! No warning shown ✅

---

### Example 3: Ambitious Goal
**Settings**:
- Deposit: $80k
- Borrowing: $600k
- Timeline: 3 years
- Properties: 10 apartments

**Result**: 🔴 Major warning
- Timeline too short (max 6 properties in 3 years)
- 8 properties challenging

**Suggestions**:
1. Extend timeline to 5 years (MEDIUM)
2. Start with 4 properties (HIGH)
3. Increase deposit to $200k (HIGH)

---

## Summary

The Feasibility Checker provides:
- ✅ **Clear visual hierarchy** (severity colors)
- ✅ **Specific bottlenecks** (exact shortfall amounts)
- ✅ **Actionable suggestions** (concrete values)
- ✅ **Priority guidance** (high/medium/low badges)
- ✅ **Supportive messaging** (encouraging tone)
- ✅ **User control** (dismissible)
- ✅ **Real-time updates** (instant feedback)

All with **zero API costs** and **instant performance**! 🚀

