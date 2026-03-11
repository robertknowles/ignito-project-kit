# Specific Affordability Failure Messages - Implementation Summary

## Overview

Updated the "Why can't these properties be afforded?" section to display **specific failure reasons with exact amounts** for each unaffordable property, replacing the generic message.

## Changes Made

### Before ❌
```
Why can't these properties be afforded?

These properties exceed your borrowing capacity, deposit availability, 
or serviceability requirements within the 17-year timeline. Consider:
• Extending your timeline period
• Increasing your deposit pool or annual savings
• Selecting lower-priced properties
• Improving your borrowing capacity
```

**Problem:** Too generic - doesn't tell users what specifically failed or by how much.

### After ✅
```
Why can't these properties be afforded?

These properties cannot be purchased within your 17-year timeline due 
to the following constraints:

┌─ 123 Main Street, Sydney
│  • Deposit shortfall: $45,000
│  • Serviceability shortfall: $12,000

┌─ 456 Queen Street, Melbourne  
│  • Borrowing capacity exceeded (requires $850,000 loan)

Consider these options:
• Extending your timeline period
• Increasing your deposit pool or annual savings
• Selecting lower-priced properties
• Improving your borrowing capacity (higher income or lower expenses)
```

**Improvement:** Shows exactly what failed and by how much for each property.

## Technical Implementation

### File Modified
- `src/components/InvestmentTimeline.tsx`

### Key Changes

#### 1. Added Currency Formatter Helper
```typescript:111:119:src/components/InvestmentTimeline.tsx
// Currency formatter helper
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
```

#### 2. Enhanced Failure Message Section
```typescript:778:827:src/components/InvestmentTimeline.tsx
<div className="mt-4 text-sm text-gray-600 bg-red-50 p-4 rounded-md">
  <p className="font-medium mb-2">Why can't these properties be afforded?</p>
  <p className="mb-3">These properties cannot be purchased within your {profile.timelineYears}-year timeline due to the following constraints:</p>
  
  <div className="space-y-3">
    {timelineProperties
      .filter(p => p.affordableYear === Infinity)
      .map((property, index) => {
        const failures: string[] = [];
        
        // Check deposit test
        if (!property.depositTestPass) {
          const shortfall = Math.abs(property.depositTestSurplus);
          failures.push(`Deposit shortfall: ${formatCurrency(shortfall)}`);
        }
        
        // Check serviceability test
        if (!property.serviceabilityTestPass) {
          const shortfall = Math.abs(property.serviceabilityTestSurplus);
          failures.push(`Serviceability shortfall: ${formatCurrency(shortfall)}`);
        }
        
        // If both pass but still infinity, it's likely a borrowing capacity issue
        if (property.depositTestPass && property.serviceabilityTestPass) {
          failures.push(`Borrowing capacity exceeded (requires ${formatCurrency(property.loanAmount)} loan)`);
        }
        
        return (
          <div key={`failure-${property.id}-${index}`} className="border-l-4 border-red-400 pl-3">
            <p className="font-medium text-gray-800">{property.title}</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-700">
              {failures.map((failure, fIndex) => (
                <li key={fIndex}>{failure}</li>
              ))}
            </ul>
          </div>
        );
      })}
  </div>
  
  <div className="mt-4 pt-3 border-t border-red-200">
    <p className="font-medium mb-2">Consider these options:</p>
    <ul className="list-disc list-inside space-y-1">
      <li>Extending your timeline period</li>
      <li>Increasing your deposit pool or annual savings</li>
      <li>Selecting lower-priced properties</li>
      <li>Improving your borrowing capacity (higher income or lower expenses)</li>
    </ul>
  </div>
</div>
```

## Failure Detection Logic

The system checks three affordability tests for each property:

### 1. Deposit Test
- **Checks:** Whether available funds cover the required deposit + acquisition costs
- **Displayed when:** `property.depositTestPass === false`
- **Shows:** `Deposit shortfall: $XX,XXX`
- **Calculation:** `Math.abs(property.depositTestSurplus)`

### 2. Serviceability Test  
- **Checks:** Whether income can service loan repayments after expenses
- **Displayed when:** `property.serviceabilityTestPass === false`
- **Shows:** `Serviceability shortfall: $XX,XXX`
- **Calculation:** `Math.abs(property.serviceabilityTestSurplus)`

### 3. Borrowing Capacity Test
- **Checks:** Whether the required loan exceeds maximum borrowing capacity
- **Displayed when:** Both deposit and serviceability pass, but still unaffordable
- **Shows:** `Borrowing capacity exceeded (requires $XXX,XXX loan)`
- **Value:** `property.loanAmount`

## Visual Design

### Property Failure Cards
- **Border:** 4px red left border (`border-l-4 border-red-400`)
- **Spacing:** 3-unit left padding (`pl-3`)
- **Typography:** 
  - Property name: `font-medium text-gray-800`
  - Failure reasons: `text-gray-700` in bulleted list

### Section Layout
- **Background:** Red-tinted (`bg-red-50`)
- **Padding:** 4-unit padding (`p-4`)
- **Rounded corners:** Medium radius (`rounded-md`)
- **Property spacing:** 3-unit gap between properties (`space-y-3`)

### Suggestions Section
- **Border top:** Red separator (`border-t border-red-200`)
- **Margin:** 4-unit top margin with 3-unit padding (`mt-4 pt-3`)
- **List style:** Disc bullets with inside positioning

## Data Flow

```
useAffordabilityCalculator
  ↓
TimelineProperty objects created
  ↓
Tests run: deposit, serviceability, borrowing capacity
  ↓
Results stored in property:
  - depositTestPass: boolean
  - depositTestSurplus: number (negative = shortfall)
  - serviceabilityTestPass: boolean
  - serviceabilityTestSurplus: number (negative = shortfall)
  - loanAmount: number
  - affordableYear: Infinity (if can't afford)
  ↓
InvestmentTimeline component
  ↓
Filter properties where affordableYear === Infinity
  ↓
Check each test and build failure list
  ↓
Display specific failures with amounts
```

## Benefits

### For Users
1. **Transparency:** Know exactly why each property can't be afforded
2. **Actionable:** See specific amounts to target for improvements
3. **Prioritization:** Understand which properties are closest to affordable
4. **Decision-making:** Make informed choices about property selection and financial improvements

### For Financial Advisors
1. **Client Education:** Explain affordability constraints clearly
2. **Goal Setting:** Set specific savings or income targets
3. **Strategy Development:** Prioritize which constraints to address first
4. **Professional Communication:** Demonstrate thorough analysis

## Example Scenarios

### Scenario 1: Deposit Shortfall Only
```
Property: $600,000 house
Required deposit: $120,000 (20%)
Available funds: $95,000
Result: "Deposit shortfall: $25,000"
```

### Scenario 2: Multiple Failures
```
Property: $800,000 house  
Deposit shortfall: $30,000
Serviceability shortfall: $15,000
Result: Both failures listed
```

### Scenario 3: Borrowing Capacity
```
Property: $1,000,000 house
Deposit: ✅ Sufficient
Serviceability: ✅ Pass
Loan required: $800,000
Borrowing capacity: $650,000
Result: "Borrowing capacity exceeded (requires $800,000 loan)"
```

## Testing Checklist

- [ ] Properties with deposit shortfall show correct amount
- [ ] Properties with serviceability shortfall show correct amount  
- [ ] Properties exceeding borrowing capacity show required loan amount
- [ ] Multiple failures per property all display correctly
- [ ] Currency formatting shows Australian dollars ($XX,XXX)
- [ ] No decimal places shown (whole dollar amounts)
- [ ] Each property's failures appear in separate card with red border
- [ ] Suggestions section appears below all property failures
- [ ] Section only appears when there are unaffordable properties
- [ ] Timeline period (17 years) displays correctly in text

## Future Enhancements

### Potential Additions
1. **Graphical indicators:** Progress bars showing how close to affordable
2. **Timeline projection:** "Could afford in Year 20" messages
3. **Solution calculator:** "Need to save $X more per year" suggestions
4. **Scenario comparison:** Show impact of different changes
5. **Detailed breakdown:** Link to full affordability calculation modal

### Related Features
- Decision Engine Modal (already shows detailed test results)
- Affordability Calculator (source of all test data)
- Property Selection (could highlight unaffordable properties earlier)

## Notes

- Uses existing `TimelineProperty` data structure (no schema changes needed)
- Leverages test data already calculated by `useAffordabilityCalculator`
- Maintains consistency with other affordability displays in the app
- Follows existing design patterns (red for failures, currency formatting)
- No performance impact (data already loaded)

