# Cursor Prompt: Remove Old Assumptions System & Redesign

## Goal

Completely remove the old global assumptions system (growth rate, LVR, interest rate, cascading growth table) and replace it with a clean property type template system where each property type has its own 39-input defaults.

---

## Background

**Old System (Being Removed):**
- Global Economic Factors (growth rate, LVR, interest rate)
- Property-specific cascading growth table (Y1, Y2-3, Y4, Y5+)
- These were used as fallbacks when property instances didn't exist

**New System (What We're Building):**
- Each property type has a template with all 39 inputs
- Each property instance inherits from its type template
- No global settings, no fallbacks to old values
- Growth is High/Medium/Low per property, not cascading percentages

---

## Part 1: Remove Global Economic Factors

### File: `src/contexts/DataAssumptionsContext.tsx` (or wherever global factors are defined)

**Action:** Remove or deprecate these fields:
- `globalFactors.growthRate`
- `globalFactors.loanToValueRatio` (or `lvr`)
- `globalFactors.interestRate`

**If these are still needed elsewhere**, keep them but **do not use them in affordability calculations**.

---

## Part 2: Remove Cascading Growth Table

### File: Property assumptions data structure

**Current Structure (Remove):**
```typescript
{
  propertyType: "Units / Apartments",
  averageCost: 350000,
  yield: 7,
  growthY1: 12.5,
  growthY2_3: 12,
  growthY4: 7.5,
  growthY5Plus: 6,
  deposit: 15
}
```

**New Structure (Replace With):**
```typescript
{
  propertyType: "Units / Apartments",
  // All 39 property instance fields as defaults
  state: "VIC",
  purchasePrice: 350000,
  valuationAtPurchase: 378000,
  rentPerWeek: 471,
  growthAssumption: "High", // NOT cascading percentages
  minimumYield: 6.5,
  daysToUnconditional: 21,
  daysForSettlement: 42,
  lvr: 85,
  lmiWaiver: false,
  loanProduct: "IO",
  interestRate: 6.5,
  loanTerm: 30,
  loanOffsetAccount: 0,
  // ... all 39 fields
}
```

---

## Part 3: Update Property Instance Creation

### File: `src/contexts/PropertyInstanceContext.tsx`

**Current Behavior:**
When creating a new instance, it might use global factors or property type defaults.

**New Behavior:**
When creating a new instance, **always** use the property type template (all 39 fields).

**Implementation:**

```typescript
const createInstance = (instanceId: string, propertyType: string, period: number) => {
  // Get the property type template
  const template = getPropertyTypeTemplate(propertyType);
  
  if (!template) {
    console.error(`No template found for property type: ${propertyType}`);
    return;
  }
  
  // Create instance with ALL fields from template
  const newInstance: PropertyInstanceDetails = {
    ...template, // Spread all 39 fields from template
  };
  
  // Save to context
  setInstances(prev => ({
    ...prev,
    [instanceId]: newInstance,
  }));
};
```

---

## Part 4: Remove Fallbacks in Affordability Calculator

### File: `src/hooks/useAffordabilityCalculator.ts`

**Search for and remove any code that falls back to:**
- `globalFactors.interestRate`
- `globalFactors.lvr`
- `globalFactors.growthRate`
- `propertyData.growthY1`, `growthY2_3`, etc.

**Example of code to REMOVE:**

```typescript
// OLD - Remove this
const interestRate = propertyInstance?.interestRate || parseFloat(globalFactors.interestRate) / 100;

// NEW - No fallback, instance MUST exist
const interestRate = propertyInstance.interestRate / 100;
```

**If property instance doesn't exist, throw an error or auto-create it** - don't fall back to global factors.

---

## Part 5: Redesign Assumptions Page UI

### File: `src/components/DataAssumptions.tsx` (or wherever the assumptions page is)

**Remove Entirely:**
- Global Economic Factors section
- Cascading growth table (Y1, Y2-3, Y4, Y5+)

**Replace With:**

```tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { PropertyDetailModal } from './PropertyDetailModal';

export const DataAssumptions = () => {
  const { propertyTypeTemplates } = useDataAssumptions();
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Type Templates</h1>
        <p className="text-sm text-gray-600 mt-1">
          Set default values for each property type. When you add a property to the timeline, 
          it will inherit these defaults. You can still customize individual properties.
        </p>
      </div>
      
      <div className="space-y-3">
        {propertyTypeTemplates.map((template) => (
          <div 
            key={template.propertyType}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  {template.propertyType}
                </h3>
                <div className="text-sm text-gray-600 mt-1 space-x-4">
                  <span>${(template.purchasePrice / 1000).toFixed(0)}k</span>
                  <span>|</span>
                  <span>{template.state}</span>
                  <span>|</span>
                  <span>{((template.rentPerWeek * 52 / template.purchasePrice) * 100).toFixed(1)}% yield</span>
                  <span>|</span>
                  <span>${template.rentPerWeek}/wk</span>
                </div>
                <div className="text-sm text-gray-600 mt-1 space-x-4">
                  <span>LVR: {template.lvr}%</span>
                  <span>|</span>
                  <span>{template.loanProduct} @ {template.interestRate}%</span>
                  <span>|</span>
                  <span>Loan: ${((template.purchasePrice * template.lvr / 100) / 1000).toFixed(0)}k</span>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingTemplate(template.propertyType)}
              >
                Edit Template
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Reuse PropertyDetailModal for editing templates */}
      {editingTemplate && (
        <PropertyDetailModal
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          instanceId={`template_${editingTemplate}`}
          propertyType={editingTemplate}
          isTemplate={true} // New prop to indicate this is a template, not an instance
        />
      )}
    </div>
  );
};
```

---

## Part 6: Add Edit Button to Property Blocks (Left Sidebar)

### File: `src/components/PropertySelectionPanel.tsx` (or wherever property blocks are rendered)

**Current:**
```tsx
<div className="property-block">
  <h3>Units / Apartments</h3>
  <p>Medium</p>
  <button>+</button>
  <button>-</button>
</div>
```

**New:**
```tsx
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';

<div className="property-block border border-gray-200 rounded-lg p-3 relative">
  {/* Edit button in top right */}
  <button
    onClick={() => navigate('/assumptions', { state: { scrollTo: propertyType } })}
    className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded"
    title="Edit template"
  >
    <Pencil className="w-4 h-4 text-gray-500" />
  </button>
  
  <h3 className="text-sm font-semibold text-gray-900 pr-8">
    Units / Apartments
  </h3>
  
  {/* Quick summary */}
  <p className="text-xs text-gray-600 mt-1">
    ${(template.purchasePrice / 1000).toFixed(0)}k | {template.state} | 
    {((template.rentPerWeek * 52 / template.purchasePrice) * 100).toFixed(1)}% yield
  </p>
  
  {/* Plus/minus buttons */}
  <div className="flex items-center gap-2 mt-2">
    <button onClick={() => addProperty(propertyType)}>+</button>
    <span>{count}</span>
    <button onClick={() => removeProperty(propertyType)}>-</button>
  </div>
</div>
```

---

## Part 7: Update PropertyDetailModal to Support Templates

### File: `src/components/PropertyDetailModal.tsx`

**Add new prop:**
```typescript
interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  propertyType: string;
  isTemplate?: boolean; // NEW: Indicates this is editing a template, not an instance
}
```

**Update modal title and save behavior:**
```typescript
<DialogTitle>
  {isTemplate 
    ? `Edit Template: ${propertyType}` 
    : `Property Details - ${propertyType}`
  }
</DialogTitle>

{isTemplate && (
  <p className="text-sm text-gray-600 mt-1">
    These defaults will apply to all new properties of this type.
    Existing properties in the timeline will not be affected.
  </p>
)}

// In handleSave():
const handleSave = async () => {
  setIsSaving(true);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (isTemplate) {
    // Save to property type templates
    updatePropertyTypeTemplate(propertyType, formData);
  } else {
    // Save to property instance
    updateInstance(instanceId, formData);
  }
  
  setIsSaving(false);
  onClose();
};
```

---

## Part 8: Data Migration (If Needed)

**If you have existing scenarios/clients with old data:**

Create a migration function that converts old property assumptions to new template format:

```typescript
const migrateOldAssumptions = (oldAssumptions: OldPropertyAssumption[]): PropertyTypeTemplate[] => {
  return oldAssumptions.map(old => ({
    propertyType: old.propertyType,
    state: "VIC", // Default
    purchasePrice: old.averageCost,
    valuationAtPurchase: old.averageCost * 1.08, // Assume 8% buffer
    rentPerWeek: (old.averageCost * (old.yield / 100)) / 52,
    growthAssumption: "Medium", // Default to Medium
    minimumYield: old.yield - 0.5,
    daysToUnconditional: 21,
    daysForSettlement: 42,
    lvr: 100 - old.deposit, // Convert deposit % to LVR
    lmiWaiver: false,
    loanProduct: "IO",
    interestRate: 6.5, // Default
    loanTerm: 30,
    loanOffsetAccount: 0,
    // ... set sensible defaults for all other fields
  }));
};
```

Run this migration once on app load if old data is detected.

---

## Part 9: Remove Old Code References

**Search the entire codebase for:**
- `growthY1`, `growthY2_3`, `growthY4`, `growthY5Plus`
- `globalFactors.growthRate`
- `globalFactors.lvr`
- `globalFactors.interestRate` (when used in affordability calculations)

**Remove or replace all references.**

---

## Part 10: Update Growth Calculation

### File: `src/utils/propertyGrowthCalculator.ts` (or wherever growth is calculated)

**Ensure it ONLY uses the High/Medium/Low system:**

```typescript
export const calculatePropertyGrowth = (
  purchasePrice: number,
  periodsOwned: number,
  growthAssumption: 'High' | 'Medium' | 'Low'
): number => {
  const PERIODS_PER_YEAR = 2;
  const years = periodsOwned / PERIODS_PER_YEAR;
  
  // Tiered growth rates
  const rates = {
    High: { y1: 0.08, y2_3: 0.06, y4: 0.05, y5plus: 0.04 },
    Medium: { y1: 0.06, y2_3: 0.04, y4: 0.03, y5plus: 0.02 },
    Low: { y1: 0.04, y2_3: 0.02, y4: 0.01, y5plus: 0.00 },
  };
  
  const rateSet = rates[growthAssumption];
  
  let value = purchasePrice;
  
  for (let period = 1; period <= periodsOwned; period++) {
    const year = Math.floor((period - 1) / PERIODS_PER_YEAR) + 1;
    let rate;
    
    if (year === 1) rate = rateSet.y1;
    else if (year <= 3) rate = rateSet.y2_3;
    else if (year === 4) rate = rateSet.y4;
    else rate = rateSet.y5plus;
    
    // Apply half-yearly growth
    value *= (1 + Math.pow(1 + rate, 1 / PERIODS_PER_YEAR) - 1);
  }
  
  return value;
};
```

**Remove any code that uses old cascading growth percentages from property data.**

---

## Testing Checklist

After implementation:

1. ✅ Global Economic Factors section is removed from UI
2. ✅ Cascading growth table is removed from UI
3. ✅ Property type templates show all 39 fields
4. ✅ Edit button appears on property blocks in sidebar
5. ✅ Clicking edit button navigates to assumptions page
6. ✅ Clicking "Edit Template" opens 39-input modal
7. ✅ Saving template updates all NEW properties of that type
8. ✅ Existing timeline properties are NOT affected by template changes
9. ✅ No code falls back to global factors
10. ✅ Growth calculation uses High/Medium/Low only
11. ✅ All affordability calculations use property instance data
12. ✅ No console errors when creating new properties

---

## Summary of Changes

**Removed:**
- ❌ Global Economic Factors (growth rate, LVR, interest rate)
- ❌ Cascading growth table (Y1, Y2-3, Y4, Y5+)
- ❌ Fallbacks to global values in affordability calculator
- ❌ Old property assumptions data structure

**Added:**
- ✅ Property type templates with all 39 fields
- ✅ Edit button on property blocks
- ✅ Redesigned assumptions page (list of templates with [Edit] buttons)
- ✅ PropertyDetailModal works for both templates and instances
- ✅ Auto-create instances from templates (no fallbacks)

**Result:**
- Clean, consistent system where every property has detailed inputs
- No global settings, no fallbacks, no confusion
- Easy to set defaults, easy to customize individual properties
- Single source of truth: property instance with 39 fields

---

**End of Prompt**
