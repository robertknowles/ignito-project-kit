# Projections Tab - Testing Checklist

## Pre-Testing Setup

### Requirements
- [ ] Application is running (npm run dev / bun dev)
- [ ] At least one property has been added to the strategy
- [ ] Property status is "feasible" (green checkmark in timeline)
- [ ] Navigate to the **Per-Property Tracking** tab

---

## Test 1: Basic Functionality ✅

### Steps
1. [ ] Locate a property card with status = "feasible"
2. [ ] Click the "Edit Details" button on the property card
3. [ ] Verify the PropertyDetailModal opens
4. [ ] Click on the "Projections" tab (4th tab)
5. [ ] Observe the content loading

### Expected Results
- [ ] Modal opens without errors
- [ ] Tab navigation works smoothly
- [ ] Either loading state OR full table appears
- [ ] No console errors in browser DevTools

---

## Test 2: Data Display ✅

### Steps
1. [ ] Once projections load, verify the table displays
2. [ ] Check the header section
3. [ ] Check all 5 metric rows
4. [ ] Check the footer section

### Expected Results

**Header Section:**
- [ ] Blue box with "10-Year Financial Projections" heading
- [ ] Shows property title (e.g., "Melbourne House")
- [ ] Shows purchase period (e.g., "H1 2025")

**Table Metrics:**
- [ ] Row 1: "Property Value" with 3 dollar values
- [ ] Row 2: "Total Equity" with 3 dollar values
- [ ] Row 3: "Net Annual Cashflow" with 3 colored values
- [ ] Row 4: "COC Return %" with Year 1 value only (amber highlight)
- [ ] Row 5: "Annualized ROIC %" with Year 10 value only (blue highlight)

**Footer Section:**
- [ ] Shows "Total Cash Invested" with dollar amount
- [ ] Shows definition for "COC Return"
- [ ] Shows definition for "Annualized ROIC"

---

## Test 3: Number Formatting ✅

### Steps
1. [ ] Inspect the currency values in the table
2. [ ] Inspect the percentage values
3. [ ] Compare Year 1, 5, and 10 columns

### Expected Results

**Currency Formatting:**
- [ ] All dollar amounts include "$" symbol
- [ ] Large numbers have comma separators (e.g., $1,200,000)
- [ ] No decimal places for currency (rounded to whole dollars)

**Percentage Formatting:**
- [ ] Percentages show exactly 2 decimal places (e.g., 10.00%)
- [ ] Include "%" symbol
- [ ] No extra spacing or formatting issues

**N/A Values:**
- [ ] COC Return shows "—" for Years 5 and 10
- [ ] ROIC shows "—" for Years 1 and 5
- [ ] Em dash is centered and gray

---

## Test 4: Color Coding ✅

### Steps
1. [ ] Examine Net Annual Cashflow values
2. [ ] Examine COC Return percentage
3. [ ] Examine ROIC percentage
4. [ ] Hover over table rows

### Expected Results

**Cashflow Colors:**
- [ ] Negative cashflow: Red text with "-" sign
- [ ] Positive cashflow: Green text with "+" sign
- [ ] Zero cashflow: Displays as "$0" (green with +)

**Return Colors:**
- [ ] Negative COC/ROIC: Red text, bold font
- [ ] Positive COC/ROIC: Green text, bold font
- [ ] Values are easily distinguishable

**Row Highlights:**
- [ ] COC Return row has amber/yellow background
- [ ] ROIC row has light blue background
- [ ] Regular rows turn light gray on hover

---

## Test 5: Loading State ✅

### Steps
1. [ ] Close the modal if open
2. [ ] Click "Edit Details" on a different property
3. [ ] Quickly switch to the "Projections" tab
4. [ ] Observe the loading state (may be brief)

### Expected Results
- [ ] Spinning loader icon appears centered
- [ ] Text "Calculating projections..." displays below icon
- [ ] Loading state is clean and centered
- [ ] Transitions smoothly to table when data loads

---

## Test 6: Data Accuracy ✅

### Steps
1. [ ] Note the property shown in the Projections tab
2. [ ] Close the modal
3. [ ] Find the same property in the main Per-Property Tracking view
4. [ ] Compare the "Current Property Value" and "Current Equity"

### Expected Results
- [ ] Values should be consistent between modal and main view
- [ ] Year 10 values in Projections should match "Current" values (since tracking shows 10-year horizon)
- [ ] Total Cash Invested should match the property card

---

## Test 7: Array Index Verification ✅

### Steps
1. [ ] Open browser DevTools console
2. [ ] Add a console.log to inspect `trackingData` (optional, for debugging)
3. [ ] Verify the correct array indices are used

### Expected Results
- [ ] Year 1 = `equityOverTime[0]` and `cashflowOverTime[0]`
- [ ] Year 5 = `equityOverTime[4]` and `cashflowOverTime[4]`
- [ ] Year 10 = `equityOverTime[9]` and `cashflowOverTime[9]`
- [ ] No off-by-one errors

---

## Test 8: Multiple Properties ✅

### Steps
1. [ ] Test with 2-3 different properties
2. [ ] Open Projections tab for Property A
3. [ ] Close modal, open Projections for Property B
4. [ ] Compare values

### Expected Results
- [ ] Each property shows its own unique projections
- [ ] Property title in header matches the selected property
- [ ] Values update correctly when switching between properties
- [ ] No cached/stale data from previous property

---

## Test 9: Edge Cases ✅

### Test 9a: Property Not Feasible
1. [ ] Find a property with status "Not Feasible" (red X)
2. [ ] Click "Edit Details" if possible
3. [ ] Navigate to Projections tab

**Expected:** Loading state or no data (since hook returns null for non-feasible properties)

### Test 9b: Negative Cashflow Property
1. [ ] Find a property with negative cashflow (if available)
2. [ ] Check Projections tab

**Expected:** Cashflow values display in red with "-" sign

### Test 9c: Interest Only vs P&I Loans
1. [ ] Test with an IO loan property
2. [ ] Test with a P&I loan property

**Expected:** Both should display correctly; P&I may show reducing loan balance over time

---

## Test 10: Responsive Design ✅

### Steps
1. [ ] Open Projections tab on a desktop browser
2. [ ] Resize browser window to tablet width (~768px)
3. [ ] Resize further to mobile width (~375px)
4. [ ] Check table scrolling

### Expected Results
- [ ] Table remains readable at all widths
- [ ] Horizontal scroll appears on smaller screens
- [ ] Text doesn't overflow or get cut off
- [ ] Modal doesn't break layout
- [ ] Touch scrolling works on mobile devices

---

## Test 11: Modal Interactions ✅

### Steps
1. [ ] Open Projections tab
2. [ ] Switch to other tabs (Property & Loan, Purchase Costs, Cashflow)
3. [ ] Switch back to Projections
4. [ ] Click "Cancel" button
5. [ ] Reopen modal and check Projections again
6. [ ] Click "Save Changes" button

### Expected Results
- [ ] Tab switching is smooth and instant
- [ ] Projections data persists when switching tabs
- [ ] Modal closes properly on Cancel
- [ ] Modal closes properly on Save Changes
- [ ] No errors when reopening modal

---

## Test 12: Performance ✅

### Steps
1. [ ] Open Projections tab
2. [ ] Note the load time
3. [ ] Switch between tabs multiple times
4. [ ] Monitor browser DevTools Performance tab

### Expected Results
- [ ] Initial load is fast (<1 second)
- [ ] Tab switching is instantaneous
- [ ] No memory leaks or performance warnings
- [ ] Hook uses memoization (no unnecessary recalculations)

---

## Test 13: Visual Consistency ✅

### Steps
1. [ ] Compare Projections tab styling with other tabs
2. [ ] Check font sizes, colors, spacing
3. [ ] Compare with the rest of the application

### Expected Results
- [ ] Styling matches the application's design system
- [ ] Consistent use of Tailwind CSS classes
- [ ] Typography hierarchy is clear
- [ ] Spacing feels balanced and professional

---

## Regression Tests ✅

### Verify Existing Functionality Still Works
- [ ] Tab 1 (Property & Loan): All inputs work correctly
- [ ] Tab 2 (Purchase Costs): All inputs work correctly
- [ ] Tab 3 (Cashflow): All inputs work correctly
- [ ] Save Changes: Updates are saved to context
- [ ] Cancel: Reverts changes and closes modal
- [ ] Property cards in main view: Display correctly
- [ ] Other tabs in main app: Still function normally

---

## Browser Compatibility ✅

Test the Projections tab in multiple browsers:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Known Limitations

Document any expected limitations:
1. **Loading State Duration**: Very fast on modern computers; loading state may flash briefly
2. **Non-Feasible Properties**: Will show loading state or no data (expected behavior)
3. **New Properties**: Properties just added may not have tracking data immediately

---

## Bug Report Template

If you find any issues, use this template:

**Bug Title:** [Brief description]

**Severity:** Low / Medium / High / Critical

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Screenshots:**
[Attach if applicable]

**Browser/Device:**


**Console Errors:**
[Paste any errors from DevTools]

---

## Success Criteria Summary

The Projections tab implementation is considered successful if:

✅ All 5 metrics display correctly for Years 1, 5, and 10  
✅ Number formatting is accurate (commas, decimals, signs)  
✅ Color coding works (red/green for negative/positive)  
✅ Loading state appears when data is not ready  
✅ No console errors or warnings  
✅ Modal opens and closes without issues  
✅ Data matches the Per-Property Tracking main view  
✅ Responsive design works on all screen sizes  
✅ Explanatory text helps users understand metrics  
✅ No regressions in other tabs or features  

---

**Tested By:** _______________  
**Date:** _______________  
**Test Result:** ⬜ PASS  ⬜ FAIL  ⬜ NEEDS REVIEW  
**Notes:**


