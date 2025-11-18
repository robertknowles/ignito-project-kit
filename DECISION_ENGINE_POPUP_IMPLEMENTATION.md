# Decision Engine Popup Implementation

## Summary

Successfully converted the "Expand for decision analysis" dropdown into a popup modal that appears underneath the "Expand Full Details" button in grey writing.

## Changes Made

### 1. PurchaseEventCard.tsx

**Updated imports:**
- Added `DecisionEngineModal` import

**State changes:**
- Replaced `decisionEngineExpanded` state with `isDecisionEngineOpen` to control the modal

**UI restructure:**
- Moved the decision analysis trigger from below the property details to the top-right corner
- Positioned it directly underneath "Expand Full Details" button
- Styled as grey text (text-gray-500) with smaller font size (text-xs)
- Changed text to "Expand for decision analysis"

**Modal integration:**
- Removed inline dropdown display of decision engine funnels
- Added `DecisionEngineModal` component that opens on click
- Passes `yearData` and `year` props to the modal

### 2. DecisionEngineModal.tsx (New Component)

**Created new modal component with:**
- Uses the existing `Dialog` component for consistency
- Large modal size (max-w-6xl) to accommodate the three funnel charts
- Maximum height with scrolling (max-h-[90vh])
- Clear title: "Decision Engine Analysis for Year {year}"
- Descriptive text explaining the three affordability tests
- Grid layout displaying all three funnels side-by-side:
  - DepositTestFunnel
  - ServiceabilityTestFunnel  
  - BorrowingCapacityTestFunnel

## Visual Changes

### Before:
- Decision analysis trigger was in the center at the bottom of the card
- Used arrow icons (▶/▼) to indicate expand/collapse
- Displayed inline beneath the property details when expanded
- Larger text size and more prominent placement

### After:
- Decision analysis trigger is in the top-right corner
- Positioned directly below "Expand Full Details" in grey text
- Opens as a full modal popup instead of inline expansion
- Smaller, less prominent styling (grey, smaller font)
- Better separation between property details and analysis tools

## Benefits

1. **Cleaner UI**: Removes clutter from the property card by moving analysis to a modal
2. **Better space utilization**: Modal can display the three funnels with more room
3. **Visual hierarchy**: Grey text indicates secondary action, blue text for primary action
4. **Consistent UX**: Uses same modal pattern as other detail views
5. **Improved readability**: Large modal view makes the funnel charts easier to read
6. **Responsive**: Modal adapts to different screen sizes with scrolling

## Testing Recommendations

1. Navigate to the Investment Timeline
2. Find a property card with "showDecisionEngine" enabled (last property in each year)
3. Verify the grey "Expand for decision analysis" link appears below "Expand Full Details"
4. Click the link to open the modal
5. Verify all three funnel charts display correctly
6. Test modal scrolling if content overflows
7. Test closing the modal (X button or clicking outside)
8. Verify styling matches the rest of the application

## Files Modified

- `/src/components/PurchaseEventCard.tsx` - Updated UI structure and modal integration
- `/src/components/DecisionEngineModal.tsx` - New modal component (created)

## Notes

- The modal only appears on property cards where `showDecisionEngine={true}`
- This is typically the last property in each year on the timeline
- All existing funnel components remain unchanged
- Modal follows the same design pattern as `PropertyDetailModal`


