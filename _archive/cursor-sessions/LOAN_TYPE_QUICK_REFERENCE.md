# Loan Type Refactoring - Quick Reference

## What Changed?

**OLD**: Loan type (IO/P&I) was set per property TYPE on the "Property Building Blocks" page
**NEW**: Loan type (IO/P&I) is set per property INSTANCE in the "Investment Timeline"

## Where to Find It Now

### For Users:
1. Go to **Strategy Builder** → Select properties (no loan type toggle here anymore)
2. Go to **Dashboard** → View **Investment Timeline**
3. Each property in the timeline has its own **IO/P&I toggle**
4. Click to switch between Interest Only (IO) and Principal & Interest (P&I)
5. Timeline recalculates automatically

### For Developers:

#### Key Files
```
src/hooks/useAffordabilityCalculator.ts  ← Core logic
src/components/InvestmentTimeline.tsx    ← UI display
src/components/LoanTypeToggle.tsx        ← NEW toggle component
src/types/property.ts                    ← Updated interface
```

#### State Management
```typescript
// In useAffordabilityCalculator
const [timelineLoanTypes, setTimelineLoanTypes] = 
  useState<Record<string, 'IO' | 'PI'>>({});

// Update function (exported)
const updateTimelinePropertyLoanType = 
  (instanceId: string, loanType: 'IO' | 'PI') => { ... }
```

#### Instance ID Format
```typescript
instanceId = `${propertyId}_instance_${index}`

Examples:
- 'property_0_instance_0'  // First Unit/Apartment
- 'property_0_instance_1'  // Second Unit/Apartment
- 'property_1_instance_0'  // First House
```

#### Usage in Components
```typescript
// InvestmentTimeline.tsx
const { timelineProperties, updateTimelinePropertyLoanType } = 
  useAffordabilityCalculator();

// In render
<LoanTypeToggle
  loanType={property.loanType}
  onChange={(newType) => 
    updateTimelinePropertyLoanType(property.instanceId, newType)
  }
/>
```

## API Reference

### Hook: useAffordabilityCalculator

```typescript
const {
  timelineProperties,        // Array of TimelineProperty (with instanceId)
  updateTimelinePropertyLoanType,  // NEW: (instanceId, loanType) => void
  isCalculating,
  calculateAffordabilityForProperty
} = useAffordabilityCalculator();
```

### Type: TimelineProperty

```typescript
interface TimelineProperty {
  id: string;
  instanceId: string;         // NEW: Unique per instance
  title: string;
  cost: number;
  loanType?: 'IO' | 'PI';    // NEW: Per-instance value
  // ... other properties
}
```

### Component: LoanTypeToggle

```typescript
interface LoanTypeToggleProps {
  loanType: 'IO' | 'PI';
  onChange: (loanType: 'IO' | 'PI') => void;
  size?: 'sm' | 'md';
}

// Usage
<LoanTypeToggle
  loanType={property.loanType}
  onChange={(newType) => handleChange(newType)}
  size="sm"
/>
```

## Data Persistence

### Storage Key
```typescript
const storageKey = `timeline_loan_types_${clientId}`;
```

### Storage Format
```typescript
{
  "property_0_instance_0": "IO",
  "property_0_instance_1": "PI",
  "property_1_instance_0": "IO"
}
```

### Load/Save Cycle
```
1. Client loads → Load from localStorage
2. User changes toggle → Update state
3. State change → Save to localStorage
4. State change → Trigger recalculation
5. Recalculation → Update timeline display
```

## Calculation Impact

### Interest Only (IO)
```
Annual Payment = Loan Amount × Interest Rate
Example: $360,000 × 6% = $21,600/year
```

### Principal & Interest (P&I)
```
Annual Payment = Amortized payment (principal + interest)
Example: $360,000 at 6% over 30 years = ~$25,900/year
```

### Difference
```
P&I - IO = ~$4,300/year higher payment
Impact: Reduces serviceability for next property
Result: May delay subsequent purchases
```

## Common Tasks

### Add New Property with Custom Loan Type
```typescript
1. User adds property in Strategy Builder
2. Property appears in timeline (defaults to IO)
3. User clicks P&I toggle if desired
4. Timeline recalculates with new loan type
```

### Change Existing Property's Loan Type
```typescript
1. User finds property in timeline
2. Clicks IO/P&I toggle
3. onChange called with (instanceId, newLoanType)
4. State updated
5. Full recalculation triggered
6. Timeline re-renders with updated affordability
```

### Bulk Change (Future Enhancement)
```typescript
// Not implemented yet, but could be:
const setAllToIO = () => {
  const updates = {};
  timelineProperties.forEach(p => {
    updates[p.instanceId] = 'IO';
  });
  setTimelineLoanTypes(updates);
};
```

## Debugging

### Check Loan Type State
```typescript
// In useAffordabilityCalculator
console.log('Timeline Loan Types:', timelineLoanTypes);
```

### Verify Instance IDs
```typescript
// In timeline calculation
allPropertiesToPurchase.forEach(({ instanceId, property }) => {
  console.log(`Instance: ${instanceId}, Type: ${property.title}`);
});
```

### Trace Calculation
```typescript
// Enable debug mode in useAffordabilityCalculator
const DEBUG_MODE = true;  // Line 57
// Console will show detailed trace of each property evaluation
```

### Check localStorage
```javascript
// Browser console
const clientId = 123; // Your client ID
const key = `timeline_loan_types_${clientId}`;
console.log(JSON.parse(localStorage.getItem(key)));
```

## Migration Notes

### Breaking Changes
- ❌ `propertyLoanTypes` removed from PropertySelectionContext
- ❌ `updateLoanType()` removed from PropertySelectionContext
- ❌ Loan type toggle removed from PropertyCard
- ❌ Old localStorage key `property_loan_types_${clientId}` no longer used

### New Additions
- ✅ `timelineLoanTypes` in useAffordabilityCalculator
- ✅ `updateTimelinePropertyLoanType()` exported from useAffordabilityCalculator
- ✅ `instanceId` field in TimelineProperty interface
- ✅ LoanTypeToggle component in InvestmentTimeline
- ✅ New localStorage key `timeline_loan_types_${clientId}`

### Backward Compatibility
- Old settings are lost (will default to IO)
- No automatic migration (intentional - fresh start)
- Users need to reconfigure in new timeline interface

## Best Practices

### When to Use IO
- Early-stage portfolio building
- Maximizing cashflow
- Properties held for capital growth
- Short to medium-term investment strategy

### When to Use P&I
- Long-term hold properties
- Building equity for retirement
- Properties you intend to own outright
- When approaching borrowing capacity limits

### Mixed Strategy (Recommended)
```
Property 1: IO  ← New acquisition, maximize cashflow
Property 2: IO  ← Still building portfolio
Property 3: P&I ← Starting to reduce debt
Property 4: IO  ← Last acquisition
Property 5: P&I ← Long-term hold
```

## Testing Checklist

- [ ] Add property, verify defaults to IO
- [ ] Toggle to P&I, verify timeline recalculates
- [ ] Refresh page, verify setting persists
- [ ] Switch clients, verify settings are per-client
- [ ] Change middle property, verify affects later properties
- [ ] Remove property, verify other properties unaffected
- [ ] Add multiple same type, verify independent controls
- [ ] Check console for errors
- [ ] Verify affordability calculations correct
- [ ] Test with extreme values (all IO vs all P&I)

## Support

For issues or questions:
1. Check LOAN_TYPE_REFACTOR_SUMMARY.md for detailed architecture
2. Check LOAN_TYPE_REFACTOR_VISUAL_GUIDE.md for visual explanations
3. Enable DEBUG_MODE in useAffordabilityCalculator for detailed logs
4. Check browser console for React/calculation errors
5. Verify localStorage state for persistence issues

