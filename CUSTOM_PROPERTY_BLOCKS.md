# Custom Property Blocks Feature

## Overview
Users can now create custom property blocks with specific parameters, which function identically to predefined property types throughout the application.

## Implementation Summary

### Components Created
1. **CustomBlockModal.tsx** - Modal form for creating custom property blocks with:
   - Property Name field
   - Property Price input
   - Rental Yield percentage
   - Growth Rate percentage
   - LVR (Loan-to-Value Ratio) slider
   - Loan Type toggle (IO/P&I)
   - Real-time preview of calculated values

### Context Updates
2. **PropertySelectionContext.tsx** - Extended with custom block management:
   - `customBlocks` state array
   - `addCustomBlock()` - Add new custom block
   - `removeCustomBlock()` - Delete custom block
   - `updateCustomBlock()` - Update existing block
   - Custom blocks automatically merged into `propertyTypes` array
   - LocalStorage persistence per client

### UI Integration
3. **StrategyBuilder.tsx** - Property Building Blocks section:
   - "Add Custom Property Block" button (dashed border, plus icon)
   - Custom blocks render alongside predefined blocks
   - Delete button (X icon) appears on custom blocks only
   - Modal integration for block creation

4. **DataAssumptions.tsx** - Data Assumptions page:
   - Dedicated "Custom Property Blocks" table section
   - Displays all custom block parameters
   - Delete button for each custom block
   - Only shown when custom blocks exist

## Features

### Custom Block Parameters
- **Property Name**: User-defined title
- **Property Price**: Custom cost in dollars
- **Rental Yield**: Percentage return (0-20%)
- **Growth Rate**: Annual appreciation rate
- **LVR**: Loan-to-Value Ratio (0-95%)
- **Loan Type**: Interest Only (IO) or Principal & Interest (P&I)

### Automatic Integration
Custom blocks are automatically integrated into:
- ✅ Property Building Blocks selection
- ✅ Affordability calculations
- ✅ Investment timeline generation
- ✅ Decision engine displays
- ✅ Cash flow analysis
- ✅ Portfolio metrics
- ✅ Data assumptions page
- ✅ Client-specific persistence

### Data Persistence
- Custom blocks saved to `localStorage` per client
- Storage key: `custom_blocks_${clientId}`
- Selections, quantities, and loan types also persisted
- Survives browser refresh and client switching

## Usage

### Creating a Custom Block
1. Navigate to Strategy Builder (Property Building Blocks section)
2. Scroll to bottom and click "Add Custom Property Block"
3. Fill in the modal form:
   - Enter property name
   - Set price, yield, growth rate
   - Adjust LVR slider
   - Select loan type (IO/P&I)
4. Review preview calculations
5. Click "Add Block"

### Using Custom Blocks
- Custom blocks appear with predefined blocks
- Use +/- buttons to add to selection
- Toggle loan type (IO/P&I) like normal blocks
- Appears in timeline when affordable
- Shows in Decision Engine with all details

### Deleting Custom Blocks
**From Strategy Builder:**
- Click X icon in top-right corner of custom block card

**From Data Assumptions:**
- Navigate to Data Assumptions page
- Find block in "Custom Property Blocks" table
- Click "Delete" button

### Editing Custom Blocks
Currently, custom blocks cannot be edited after creation. To modify:
1. Delete the existing block
2. Create a new block with updated parameters

## Technical Details

### Custom Block Data Structure
```typescript
interface CustomPropertyBlock {
  id: string;              // Unique ID: `custom-${timestamp}`
  title: string;           // User-defined name
  cost: number;            // Property price
  yieldPercent: number;    // Rental yield %
  lvr: number;             // Loan-to-Value Ratio %
  loanType: 'IO' | 'PI';  // Loan type
  isCustom: true;          // Flag for identification
  growthPercent: number;   // Annual growth %
}
```

### PropertyType Integration
Custom blocks are converted to PropertyType format:
```typescript
{
  id: block.id,
  title: block.title,
  cost: block.cost,
  depositRequired: cost * (1 - lvr/100),
  yieldPercent: block.yieldPercent,
  growthPercent: block.growthPercent,
  loanType: block.loanType,
  isCustom: true
}
```

### Calculation Integration
- Custom blocks merged into `propertyTypes` array in context
- `useAffordabilityCalculator` automatically includes them
- Timeline generator treats them identically to predefined types
- Decision engine displays custom block details
- No special handling required in downstream components

## Files Modified
- ✅ `src/components/CustomBlockModal.tsx` (new)
- ✅ `src/contexts/PropertySelectionContext.tsx`
- ✅ `src/components/StrategyBuilder.tsx`
- ✅ `src/pages/DataAssumptions.tsx`

## Testing Scenarios

### Scenario 1: Create Custom Block
1. Click "Add Custom Block"
2. Enter "Luxury Apartment", $500k, 6% yield, 5% growth, 75% LVR, IO
3. Preview shows: $375k loan, $125k deposit, $30k annual rent
4. Save → Block appears in Property Building Blocks
5. ✅ Block persists after refresh

### Scenario 2: Use Custom Block
1. Increment custom block to add 2 properties
2. ✅ Timeline shows custom properties when affordable
3. ✅ Decision engine displays custom property details
4. ✅ Calculations include custom block metrics

### Scenario 3: Delete Custom Block
1. Click X on custom block card
2. ✅ Block removed from Property Building Blocks
3. ✅ Block removed from Data Assumptions
4. ✅ Any selected quantities reset

### Scenario 4: Multiple Custom Blocks
1. Create 3 different custom blocks
2. ✅ All appear in Property Building Blocks
3. ✅ All appear in Data Assumptions table
4. ✅ Each can be independently selected/deleted
5. ✅ Mix custom and predefined blocks in timeline

## Future Enhancements
- [ ] Edit custom blocks after creation
- [ ] Duplicate existing blocks
- [ ] Import/export custom blocks
- [ ] Custom block templates
- [ ] State-specific parameters for custom blocks
- [ ] Bulk delete custom blocks
- [ ] Custom block validation (min/max values)

