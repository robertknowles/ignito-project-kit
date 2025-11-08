# Decision Engine Test Plan

## 🎯 Testing Objectives

Verify that the Decision Engine narrative flow implementation:
1. Renders correctly on all devices
2. Shows accurate calculations
3. Handles edge cases gracefully
4. Provides clear user experience

---

## 📋 Pre-Test Setup

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Navigate to Application
1. Open browser to `http://localhost:5173` (or specified port)
2. Go to **Decision Engine** tab

### Step 3: Ensure Test Data
- At least 2-3 properties selected in **Building Blocks**
- Investment profile configured with realistic values
- Global assumptions set (interest rate, growth rate)

---

## 🧪 Test Cases

### Test 1: Visual Rendering (Desktop)

**Objective:** Verify layout displays correctly on desktop

**Steps:**
1. Open application on desktop browser (1920x1080)
2. Navigate to Decision Engine tab
3. Observe initial layout

**Expected Results:**
- ✅ Header displays with gradient background
- ✅ Year cards display in vertical list
- ✅ First year is collapsed by default
- ✅ Status badges are visible

**Status:** [ ] PASS / [ ] FAIL

---

### Test 2: Expand/Collapse Functionality

**Objective:** Verify interactive expansion works

**Steps:**
1. Click on a collapsed year card
2. Observe expansion animation
3. Click again to collapse
4. Expand multiple years simultaneously

**Expected Results:**
- ✅ Year expands smoothly when clicked
- ✅ Three funnels appear side-by-side
- ✅ Year collapses when clicked again
- ✅ Multiple years can be open at once
- ✅ Chevron icon changes direction

**Status:** [ ] PASS / [ ] FAIL

---

### Test 3: Three Funnels Layout (Desktop)

**Objective:** Verify funnels display side-by-side

**Steps:**
1. Expand any year
2. Observe funnel layout
3. Verify all three funnels are visible

**Expected Results:**
- ✅ Deposit Test funnel on left
- ✅ Serviceability Test funnel in middle
- ✅ Borrowing Capacity Test funnel on right
- ✅ Equal width columns
- ✅ Consistent spacing (24px gap)

**Status:** [ ] PASS / [ ] FAIL

---

### Test 4: Deposit Test Content

**Objective:** Verify Deposit Test shows correct data

**Steps:**
1. Expand a year with purchase
2. Review Deposit Test funnel
3. Verify all sections present

**Expected Results:**
- ✅ PASS/FAIL badge at top (correct color)
- ✅ "What We Have" section with 4 items
- ✅ "What We Need" section with costs
- ✅ "The Calculation" section with equation
- ✅ "The Result" section with verdict
- ✅ All numbers formatted correctly
- ✅ Inline calculation matches result

**Status:** [ ] PASS / [ ] FAIL

---

### Test 5: Serviceability Test Content

**Objective:** Verify Serviceability Test shows correct data

**Steps:**
1. Expand a year with purchase
2. Review Serviceability Test funnel
3. Verify all sections present

**Expected Results:**
- ✅ PASS/FAIL badge at top (correct color)
- ✅ "Income Sources" section
- ✅ "Loan Payments" section
- ✅ "Serviceability Capacity" section
- ✅ "The Calculation" section with equation
- ✅ "The Result" section with verdict
- ✅ All numbers formatted correctly
- ✅ 10% and 70% calculations correct

**Status:** [ ] PASS / [ ] FAIL

---

### Test 6: Borrowing Capacity Test Content

**Objective:** Verify Borrowing Capacity Test shows correct data

**Steps:**
1. Expand a year with purchase
2. Review Borrowing Capacity Test funnel
3. Verify all sections present

**Expected Results:**
- ✅ PASS/FAIL badge at top (correct color)
- ✅ "Portfolio Overview" section
- ✅ Property breakdown list (if properties exist)
- ✅ "LVR & Debt Position" section
- ✅ "Borrowing Capacity" section
- ✅ "The Calculation" section with equation
- ✅ "The Result" section with verdict
- ✅ All numbers formatted correctly
- ✅ Equity boost calculation (88%) correct

**Status:** [ ] PASS / [ ] FAIL

---

### Test 7: Overall Summary

**Objective:** Verify summary box displays correctly

**Steps:**
1. Expand a year
2. Scroll to bottom of expanded content
3. Review overall summary box

**Expected Results:**
- ✅ Summary box appears below funnels
- ✅ Green background if all tests pass
- ✅ Red background if any test fails
- ✅ Correct message displayed
- ✅ Centered text layout

**Status:** [ ] PASS / [ ] FAIL

---

### Test 8: PASS State Styling

**Objective:** Verify PASS state uses correct colors

**Steps:**
1. Find a year where all tests pass
2. Expand the year
3. Review color scheme

**Expected Results:**
- ✅ Top badge: Green background, white text
- ✅ Calculation section: Blue background
- ✅ Result section: Green background
- ✅ Green checkmark icons
- ✅ Positive numbers in green

**Status:** [ ] PASS / [ ] FAIL

---

### Test 9: FAIL State Styling

**Objective:** Verify FAIL state uses correct colors

**Steps:**
1. Find a year where a test fails (or create one)
2. Expand the year
3. Review color scheme

**Expected Results:**
- ✅ Top badge: Red background, white text
- ✅ Calculation section: Blue background
- ✅ Result section: Red background
- ✅ Red X icons
- ✅ Negative numbers in red

**Status:** [ ] PASS / [ ] FAIL

---

### Test 10: Mobile Responsive (Portrait)

**Objective:** Verify layout adapts to mobile portrait

**Steps:**
1. Resize browser to 375x667 (iPhone SE)
2. OR use browser dev tools device emulation
3. Navigate to Decision Engine tab
4. Expand a year

**Expected Results:**
- ✅ Year header remains functional
- ✅ Funnels stack vertically (single column)
- ✅ Each funnel takes full width
- ✅ No horizontal scrolling
- ✅ Text remains readable
- ✅ Touch targets are adequate size

**Status:** [ ] PASS / [ ] FAIL

---

### Test 11: Mobile Responsive (Landscape)

**Objective:** Verify layout adapts to mobile landscape

**Steps:**
1. Resize browser to 667x375 (iPhone SE landscape)
2. Navigate to Decision Engine tab
3. Expand a year

**Expected Results:**
- ✅ Layout adjusts appropriately
- ✅ Funnels may show 2 columns or stack
- ✅ No content cutoff
- ✅ Readable text

**Status:** [ ] PASS / [ ] FAIL

---

### Test 12: Tablet Responsive

**Objective:** Verify layout adapts to tablet

**Steps:**
1. Resize browser to 768x1024 (iPad)
2. Navigate to Decision Engine tab
3. Expand a year

**Expected Results:**
- ✅ Funnels display side-by-side or 2+1 layout
- ✅ Proper spacing maintained
- ✅ No overflow
- ✅ Touch targets adequate

**Status:** [ ] PASS / [ ] FAIL

---

### Test 13: Empty State

**Objective:** Verify empty state displays correctly

**Steps:**
1. Deselect all properties in Building Blocks
2. Navigate to Decision Engine tab
3. Observe display

**Expected Results:**
- ✅ Empty state message appears
- ✅ Alert icon displayed
- ✅ Helpful message explaining what to do
- ✅ No error in console

**Status:** [ ] PASS / [ ] FAIL

---

### Test 14: Data Accuracy - Deposit Test

**Objective:** Verify deposit calculations are correct

**Steps:**
1. Expand a year
2. Note values from Deposit Test
3. Manually calculate:
   - Total Available = base + savings + cashflow + equity
   - Total Required = deposit + stamp duty + LMI + fees
   - Surplus = Available - Required

**Expected Results:**
- ✅ Total Available matches sum of components
- ✅ Total Required matches sum of costs
- ✅ Surplus calculation is accurate
- ✅ PASS/FAIL status matches calculation

**Status:** [ ] PASS / [ ] FAIL

**Manual Calculation:**
```
Available: ______ + ______ + ______ + ______ = ______
Required:  ______ + ______ + ______ + ______ = ______
Surplus:   ______ - ______ = ______
PASS/FAIL: ______
```

---

### Test 15: Data Accuracy - Serviceability Test

**Objective:** Verify serviceability calculations are correct

**Steps:**
1. Expand a year
2. Note values from Serviceability Test
3. Manually calculate:
   - Total Capacity = (borrowingCapacity × 10%) + (grossRental × 70%)
   - Total Payments = existingInterest + newInterest
   - Surplus = Capacity - Payments

**Expected Results:**
- ✅ Total Capacity matches calculation
- ✅ Total Payments matches sum
- ✅ Surplus calculation is accurate
- ✅ PASS/FAIL status matches calculation

**Status:** [ ] PASS / [ ] FAIL

**Manual Calculation:**
```
Capacity: (______ × 10%) + (______ × 70%) = ______
Payments: ______ + ______ = ______
Surplus:  ______ - ______ = ______
PASS/FAIL: ______
```

---

### Test 16: Data Accuracy - Borrowing Capacity Test

**Objective:** Verify borrowing capacity calculations are correct

**Steps:**
1. Expand a year
2. Note values from Borrowing Capacity Test
3. Manually calculate:
   - Equity Boost = extractableEquity × 88%
   - Total Capacity = borrowingCapacity + equityBoost
   - Total Debt After = existingDebt + newDebt
   - Surplus = Capacity - TotalDebt

**Expected Results:**
- ✅ Equity boost matches 88% calculation
- ✅ Total Capacity matches sum
- ✅ Total Debt matches sum
- ✅ Surplus calculation is accurate
- ✅ PASS/FAIL status matches calculation

**Status:** [ ] PASS / [ ] FAIL

**Manual Calculation:**
```
Equity Boost: ______ × 88% = ______
Capacity:     ______ + ______ = ______
Total Debt:   ______ + ______ = ______
Surplus:      ______ - ______ = ______
PASS/FAIL: ______
```

---

### Test 17: Portfolio Property Breakdown

**Objective:** Verify portfolio properties list correctly

**Steps:**
1. Expand a year after multiple purchases
2. Scroll to Borrowing Capacity Test
3. Review "Portfolio Overview" section

**Expected Results:**
- ✅ All owned properties listed
- ✅ Property numbers sequential (#1, #2, #3...)
- ✅ Property types correct
- ✅ Display periods correct (e.g., "2025 H1")
- ✅ Current values shown
- ✅ List is scrollable if many properties

**Status:** [ ] PASS / [ ] FAIL

---

### Test 18: Acquisition Costs Detail

**Objective:** Verify all acquisition costs are itemized

**Steps:**
1. Expand a year with purchase
2. Review Deposit Test "What We Need" section
3. Check all cost items

**Expected Results:**
- ✅ Stamp duty amount shown
- ✅ LMI shown (or hidden if $0)
- ✅ Legal & fees combined and shown
- ✅ Total acquisition costs calculated correctly
- ✅ Total required = deposit + acquisition costs

**Status:** [ ] PASS / [ ] FAIL

---

### Test 19: Year Status Badges

**Objective:** Verify status badges show correct state

**Steps:**
1. Review multiple years
2. Check badge for each year

**Expected Results:**
- ✅ "PURCHASED" badge for completed purchases (green)
- ✅ "Blocked" badge when tests fail (red)
- ✅ "-" badge for non-purchase years
- ✅ "Waiting..." badge if gap rule applies (yellow)

**Status:** [ ] PASS / [ ] FAIL

---

### Test 20: Multiple Properties in Same Year

**Objective:** Verify handling of multiple purchases

**Steps:**
1. Configure scenario with 2+ properties in same year
2. Expand that year
3. Review funnels

**Expected Results:**
- ✅ All purchases listed in purchases array
- ✅ Total costs reflect all properties
- ✅ Tests consider cumulative impact
- ✅ No duplicate data

**Status:** [ ] PASS / [ ] FAIL

---

### Test 21: Performance - Many Years

**Objective:** Verify performance with large dataset

**Steps:**
1. Configure timeline for 25-50 years
2. Add 10+ properties
3. Navigate to Decision Engine
4. Expand/collapse multiple years

**Expected Results:**
- ✅ Initial load < 2 seconds
- ✅ Expand/collapse is smooth (< 300ms)
- ✅ No lag when scrolling
- ✅ Memory usage reasonable
- ✅ No console warnings

**Status:** [ ] PASS / [ ] FAIL

---

### Test 22: Browser Compatibility

**Objective:** Verify works across browsers

**Test Matrix:**

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | [ ] PASS / [ ] FAIL |
| Firefox | Latest | [ ] PASS / [ ] FAIL |
| Safari | Latest | [ ] PASS / [ ] FAIL |
| Edge | Latest | [ ] PASS / [ ] FAIL |

**Expected Results:**
- ✅ Layout consistent across browsers
- ✅ Colors render correctly
- ✅ Interactions work
- ✅ No browser-specific bugs

---

### Test 23: Console Errors

**Objective:** Verify no errors in console

**Steps:**
1. Open browser console (F12)
2. Navigate to Decision Engine
3. Interact with all features
4. Monitor console output

**Expected Results:**
- ✅ No JavaScript errors
- ✅ No React warnings
- ✅ No TypeScript errors
- ✅ No missing key warnings
- ✅ No prop type warnings

**Status:** [ ] PASS / [ ] FAIL

---

### Test 24: Accessibility

**Objective:** Verify basic accessibility standards

**Steps:**
1. Use keyboard navigation only (Tab, Enter, Space)
2. Test with screen reader (if available)
3. Check color contrast ratios

**Expected Results:**
- ✅ Can navigate with keyboard
- ✅ Year cards can be opened with Enter/Space
- ✅ Focus indicators visible
- ✅ Text has sufficient contrast (4.5:1)
- ✅ Icons have aria labels (if interactive)

**Status:** [ ] PASS / [ ] FAIL

---

### Test 25: Print Functionality

**Objective:** Verify page prints reasonably

**Steps:**
1. Expand a few years
2. Use Print Preview (Ctrl+P / Cmd+P)
3. Review layout

**Expected Results:**
- ✅ Content is visible in print preview
- ✅ Colors translate to print
- ✅ No content cutoff
- ✅ Reasonable page breaks

**Status:** [ ] PASS / [ ] FAIL

---

## 📊 Test Results Summary

### Overall Results
- **Total Tests:** 25
- **Passed:** ___
- **Failed:** ___
- **Pass Rate:** ___%

### Critical Issues Found
1. 
2. 
3. 

### Minor Issues Found
1. 
2. 
3. 

### Recommendations
1. 
2. 
3. 

---

## ✅ Sign-Off

**Tester Name:** _______________________
**Date:** _______________________
**Environment:** _______________________
**Build Version:** _______________________

**Overall Assessment:** [ ] APPROVED / [ ] NEEDS WORK

**Comments:**
________________________________________
________________________________________
________________________________________

---

## 🔄 Regression Testing

If changes are made, re-run these priority tests:

1. Test 3: Three Funnels Layout
2. Test 4-6: Funnel Content Tests
3. Test 10: Mobile Responsive
4. Test 14-16: Data Accuracy Tests
5. Test 23: Console Errors

---

## 📝 Notes

Use this section for any additional observations:

________________________________________
________________________________________
________________________________________
________________________________________

