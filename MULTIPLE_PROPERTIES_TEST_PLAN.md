# Test Plan: Multiple Properties Rendering + Decision Engine

## Overview

This test plan verifies that multiple properties purchased in the same year are all rendered as individual cards, and that the decision engine only appears on the last card of each year.

---

## Pre-Test Setup

### Required Environment
- Application running locally
- Access to property selection interface
- Ability to add multiple properties

### Test Data Requirements
- At least 3 different property types available
- Ability to set affordability year for properties

---

## Test Suite 1: Multiple Properties in Same Year

### Test Case 1.1: Three Properties in 2025

**Objective**: Verify all properties in the same year render as separate cards

**Steps**:
1. Open the application
2. Navigate to property selection
3. Add 3 properties that can all be purchased in 2025:
   - Property 1: House (VIC) - $350k
   - Property 2: Apartment (NSW) - $450k
   - Property 3: House (QLD) - $380k
4. View the Investment Timeline

**Expected Results**:
- ✅ Three separate property cards are displayed
- ✅ Each card shows correct property type and state
- ✅ Each card shows correct purchase price
- ✅ Cards are ordered by property index/order
- ✅ Card 1 does NOT have "Expand Decision Engine" button
- ✅ Card 2 does NOT have "Expand Decision Engine" button
- ✅ Card 3 (last card) HAS "Expand Decision Engine Analysis for 2025" button
- ✅ No gap controls appear between the three cards

**Pass Criteria**: All expected results are met

---

### Test Case 1.2: Two Properties in 2025

**Objective**: Verify logic works with fewer properties

**Steps**:
1. Clear previous selections
2. Add 2 properties for 2025:
   - Property 1: House (VIC) - $350k
   - Property 2: Apartment (NSW) - $450k
3. View the Investment Timeline

**Expected Results**:
- ✅ Two separate property cards are displayed
- ✅ Card 1 does NOT have "Expand Decision Engine" button
- ✅ Card 2 (last card) HAS "Expand Decision Engine Analysis for 2025" button

**Pass Criteria**: All expected results are met

---

### Test Case 1.3: Single Property in 2025

**Objective**: Verify baseline case still works

**Steps**:
1. Clear previous selections
2. Add 1 property for 2025
3. View the Investment Timeline

**Expected Results**:
- ✅ One property card is displayed
- ✅ Card HAS "Expand Decision Engine Analysis for 2025" button (it's the last/only one)

**Pass Criteria**: All expected results are met

---

## Test Suite 2: Decision Engine Functionality

### Test Case 2.1: Decision Engine Expansion

**Objective**: Verify decision engine expands and shows correct data

**Setup**: 3 properties in 2025 (from Test Case 1.1)

**Steps**:
1. Locate the 3rd (last) property card for 2025
2. Click "▶ Expand Decision Engine Analysis for 2025"
3. Observe the expanded section

**Expected Results**:
- ✅ Button icon changes from ▶ to ▼
- ✅ Button text remains "Expand Decision Engine Analysis for 2025"
- ✅ Three funnel components appear:
  - Deposit Test Funnel
  - Serviceability Test Funnel
  - Borrowing Capacity Test Funnel
- ✅ Funnels are displayed in a grid (1 column on mobile, 3 on desktop)
- ✅ Each funnel shows year-end data (after ALL 3 properties purchased)
- ✅ Portfolio value reflects all 3 properties
- ✅ Total debt reflects all 3 properties
- ✅ Available funds reflect remaining capacity after 3 purchases

**Pass Criteria**: All expected results are met

---

### Test Case 2.2: Decision Engine Collapse

**Objective**: Verify decision engine can be collapsed

**Setup**: Decision engine expanded (from Test Case 2.1)

**Steps**:
1. Click "▼ Expand Decision Engine Analysis for 2025"
2. Observe the section

**Expected Results**:
- ✅ Button icon changes from ▼ to ▶
- ✅ Funnel components are hidden
- ✅ Card maintains normal appearance

**Pass Criteria**: All expected results are met

---

### Test Case 2.3: Year-End State Verification

**Objective**: Verify decision engine shows cumulative year-end state

**Setup**: 3 properties in 2025

**Steps**:
1. Note individual property costs:
   - Property 1: $350k
   - Property 2: $450k
   - Property 3: $380k
   - **Total**: $1,180k
2. Expand decision engine on Card 3
3. Check portfolio value in any funnel

**Expected Results**:
- ✅ Portfolio value ≈ $1,180k (or sum of all 3 properties)
- ✅ Total debt reflects all 3 loans combined
- ✅ Deposit test shows remaining funds after 3 purchases
- ✅ Borrowing capacity shows remaining capacity after 3 purchases
- ✅ Serviceability shows combined rental income and expenses

**Pass Criteria**: All expected results are met

---

## Test Suite 3: Gap Period Handling

### Test Case 3.1: Gap After Same-Year Properties

**Objective**: Verify gap appears after last property of a year

**Steps**:
1. Add 3 properties in 2025
2. Add 1 property in 2029
3. View the Investment Timeline

**Expected Results**:
- ✅ Three property cards for 2025 are displayed
- ✅ Decision engine on Card 3 (last 2025 card)
- ✅ Gap control appears AFTER Card 3
- ✅ Gap control shows "Gap Period: 2026 - 2028"
- ✅ Property card for 2029 appears after gap
- ✅ Decision engine on 2029 card (last card of 2029)
- ✅ NO gap controls between Cards 1-2 or 2-3 (same year)

**Pass Criteria**: All expected results are met

---

### Test Case 3.2: No Gap Between Same-Year Properties

**Objective**: Verify gap does NOT appear between properties in same year

**Steps**:
1. Add 3 properties in 2025
2. View the Investment Timeline

**Expected Results**:
- ✅ Three property cards for 2025 are displayed
- ✅ NO gap controls between any cards
- ✅ Cards flow directly from one to the next
- ✅ Only decision engine on last card

**Pass Criteria**: All expected results are met

---

### Test Case 3.3: Gap Between Different Years

**Objective**: Verify gap appears when years are not consecutive

**Steps**:
1. Add 1 property in 2025
2. Add 1 property in 2029
3. View the Investment Timeline

**Expected Results**:
- ✅ Property card for 2025 with decision engine
- ✅ Gap control appears after 2025 card
- ✅ Gap shows "2026 - 2028"
- ✅ Property card for 2029 with decision engine

**Pass Criteria**: All expected results are met

---

### Test Case 3.4: No Gap for Consecutive Years

**Objective**: Verify no gap when years are consecutive

**Steps**:
1. Add 1 property in 2025
2. Add 1 property in 2026
3. Add 1 property in 2027
4. View the Investment Timeline

**Expected Results**:
- ✅ Three property cards (one for each year)
- ✅ Each card has decision engine (last of each year)
- ✅ NO gap controls (years are consecutive)

**Pass Criteria**: All expected results are met

---

## Test Suite 4: Complex Scenarios

### Test Case 4.1: Mixed Year Distribution

**Objective**: Verify complex distribution of properties across years

**Steps**:
1. Add 3 properties in 2025
2. Add 2 properties in 2027
3. Add 1 property in 2030
4. View the Investment Timeline

**Expected Results**:
```
Card 1 - 2025 Property 1 - No decision engine
Card 2 - 2025 Property 2 - No decision engine
Card 3 - 2025 Property 3 - Decision engine ✅
[GAP: 2026]
Card 4 - 2027 Property 1 - No decision engine
Card 5 - 2027 Property 2 - Decision engine ✅
[GAP: 2028-2029]
Card 6 - 2030 Property 1 - Decision engine ✅
```

**Pass Criteria**: Timeline matches expected structure

---

### Test Case 4.2: All Properties Same Year

**Objective**: Verify extreme case of all properties in one year

**Steps**:
1. Add 5 properties all in 2025
2. View the Investment Timeline

**Expected Results**:
- ✅ Five property cards displayed
- ✅ Cards 1-4 have NO decision engine
- ✅ Card 5 (last) has decision engine for 2025
- ✅ Decision engine shows cumulative state of all 5 properties
- ✅ No gap controls

**Pass Criteria**: All expected results are met

---

### Test Case 4.3: Properties Every Year

**Objective**: Verify no gaps when properties purchased annually

**Steps**:
1. Add 1 property per year for 2025-2030
2. View the Investment Timeline

**Expected Results**:
- ✅ Six property cards (one per year)
- ✅ Each card has decision engine (last of each year)
- ✅ No gap controls (consecutive years)
- ✅ Each decision engine shows correct year in button text

**Pass Criteria**: All expected results are met

---

## Test Suite 5: Property Card Functionality

### Test Case 5.1: Individual Property Editing

**Objective**: Verify each card can be edited independently

**Steps**:
1. Add 3 properties in 2025
2. Click on Card 1 and edit a field (e.g., LVR)
3. Click on Card 2 and edit a different field
4. Click on Card 3 and edit another field
5. View all cards

**Expected Results**:
- ✅ Card 1 shows updated LVR
- ✅ Card 2 shows its updated field
- ✅ Card 3 shows its updated field
- ✅ Changes are independent
- ✅ Each card maintains its own state

**Pass Criteria**: All expected results are met

---

### Test Case 5.2: Property Detail Modal

**Objective**: Verify "Expand Full Details" works for each card

**Steps**:
1. Add 3 properties in 2025
2. Click "Expand Full Details" on Card 1
3. Close modal
4. Click "Expand Full Details" on Card 2
5. Close modal
6. Click "Expand Full Details" on Card 3

**Expected Results**:
- ✅ Each card opens its own detail modal
- ✅ Modal shows correct property instance data
- ✅ Modal can be opened for any card independently

**Pass Criteria**: All expected results are met

---

## Test Suite 6: Visual & Styling

### Test Case 6.1: Decision Engine Styling

**Objective**: Verify decision engine styling is correct

**Steps**:
1. Add 3 properties in 2025
2. Locate decision engine button on Card 3
3. Inspect styling

**Expected Results**:
- ✅ Subtle border-top separator (gray-100)
- ✅ Button text is light grey (gray-400)
- ✅ Button text is small (text-sm)
- ✅ Hover changes color to darker grey (gray-600)
- ✅ Smooth color transition on hover
- ✅ Button is centered

**Pass Criteria**: All expected results are met

---

### Test Case 6.2: Expanded Section Styling

**Objective**: Verify expanded decision engine styling

**Steps**:
1. Expand decision engine on last card
2. Inspect expanded section

**Expected Results**:
- ✅ Border-top separator (gray-200)
- ✅ Margin and padding applied (mt-4 pt-4)
- ✅ Grid layout: 1 column on mobile
- ✅ Grid layout: 3 columns on desktop (lg breakpoint)
- ✅ Gap between funnels (gap-6)

**Pass Criteria**: All expected results are met

---

### Test Case 6.3: Responsive Design

**Objective**: Verify layout works on different screen sizes

**Steps**:
1. Add 3 properties in 2025
2. Expand decision engine
3. Test on different screen sizes:
   - Mobile (< 768px)
   - Tablet (768px - 1024px)
   - Desktop (> 1024px)

**Expected Results**:
- ✅ Mobile: Funnels stack vertically (1 column)
- ✅ Tablet: May show 2-3 columns depending on viewport
- ✅ Desktop: Shows 3 columns side-by-side
- ✅ All elements remain readable at all sizes
- ✅ No horizontal scrolling

**Pass Criteria**: All expected results are met

---

## Test Suite 7: Edge Cases

### Test Case 7.1: No Properties Selected

**Objective**: Verify empty state

**Steps**:
1. Clear all property selections
2. View Investment Timeline

**Expected Results**:
- ✅ Shows empty state message
- ✅ No cards displayed
- ✅ No errors in console

**Pass Criteria**: All expected results are met

---

### Test Case 7.2: Properties with Decimal Years

**Objective**: Verify rounding handles decimal years correctly

**Steps**:
1. Add properties with decimal affordable years:
   - Property 1: 2025.3
   - Property 2: 2025.7
   - Property 3: 2026.2
2. View Investment Timeline

**Expected Results**:
- ✅ Property 1 and 2 both round to 2025
- ✅ Both treated as same year (no gap between)
- ✅ Decision engine on Property 2 (last of 2025)
- ✅ Property 3 rounds to 2026
- ✅ No gap (2025 to 2026 is consecutive)

**Pass Criteria**: All expected results are met

---

### Test Case 7.3: Very Large Number of Properties

**Objective**: Verify performance with many properties

**Steps**:
1. Add 10 properties all in 2025
2. View Investment Timeline
3. Expand decision engine

**Expected Results**:
- ✅ All 10 cards render correctly
- ✅ Page remains responsive
- ✅ Decision engine only on Card 10
- ✅ Decision engine shows cumulative state of all 10
- ✅ No performance issues

**Pass Criteria**: All expected results are met

---

## Regression Testing

### Test Case R.1: Existing Timeline Features

**Objective**: Verify existing features still work

**Steps**:
1. Test AI Strategy Summary at bottom
2. Test pause period functionality
3. Test property type changes
4. Test recalculation on profile changes

**Expected Results**:
- ✅ All existing features work as before
- ✅ No breaking changes introduced
- ✅ Timeline recalculates correctly

**Pass Criteria**: All expected results are met

---

### Test Case R.2: Gap View Features

**Objective**: Verify gap view functionality unchanged

**Steps**:
1. Create scenario with gaps
2. Expand gap view
3. Test gap year expansion/collapse

**Expected Results**:
- ✅ Gap view works as before
- ✅ Gap year data displays correctly
- ✅ All gap view interactions work

**Pass Criteria**: All expected results are met

---

## Bug Reporting Template

If any test fails, report using this template:

```markdown
## Bug Report

**Test Case**: [Test Case Number and Name]
**Severity**: [Critical/High/Medium/Low]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]

**Screenshots**: [If applicable]

**Browser/Device**: [Browser version and device type]

**Additional Notes**: [Any other relevant information]
```

---

## Test Execution Log

| Test Case | Pass/Fail | Tester | Date | Notes |
|-----------|-----------|--------|------|-------|
| 1.1       |           |        |      |       |
| 1.2       |           |        |      |       |
| 1.3       |           |        |      |       |
| 2.1       |           |        |      |       |
| 2.2       |           |        |      |       |
| 2.3       |           |        |      |       |
| 3.1       |           |        |      |       |
| 3.2       |           |        |      |       |
| 3.3       |           |        |      |       |
| 3.4       |           |        |      |       |
| 4.1       |           |        |      |       |
| 4.2       |           |        |      |       |
| 4.3       |           |        |      |       |
| 5.1       |           |        |      |       |
| 5.2       |           |        |      |       |
| 6.1       |           |        |      |       |
| 6.2       |           |        |      |       |
| 6.3       |           |        |      |       |
| 7.1       |           |        |      |       |
| 7.2       |           |        |      |       |
| 7.3       |           |        |      |       |
| R.1       |           |        |      |       |
| R.2       |           |        |      |       |

---

## Success Criteria

All test cases must pass for the implementation to be considered complete.

**Definition of Done**:
- ✅ All test cases pass
- ✅ No critical or high severity bugs
- ✅ Performance is acceptable
- ✅ No regression issues
- ✅ Documentation is complete


