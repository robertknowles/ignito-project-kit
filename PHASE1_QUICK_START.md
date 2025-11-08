# Phase 1 Quick Start Guide

## For Developers Using Phase 1 Features

This guide shows you how to use the Phase 1 property instance system in your components.

---

## 1. Using the PropertyInstance Context

### Import the Hook

```typescript
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
```

### Access Context Methods

```typescript
function MyComponent() {
  const {
    instances,       // All property instances
    createInstance,  // Create new instance
    updateInstance,  // Update existing instance
    deleteInstance,  // Delete instance
    getInstance,     // Get single instance
  } = usePropertyInstance();

  // ... your code
}
```

---

## 2. Creating a Property Instance

### Basic Creation

```typescript
const handleCreateProperty = () => {
  const instanceId = 'prop-1-period-1';  // Unique ID
  const propertyType = 'Units / Apartments';
  const period = 1;  // Timeline period
  
  createInstance(instanceId, propertyType, period);
};
```

### What Happens:
1. ✅ Loads defaults from `property-defaults.json`
2. ✅ Populates all 34 fields
3. ✅ Adds to context state
4. ✅ Triggers unsaved changes detection

---

## 3. Updating Property Fields

### Partial Update (Recommended)

```typescript
const handleUpdatePrice = (instanceId: string, newPrice: number) => {
  updateInstance(instanceId, {
    purchasePrice: newPrice,
  });
};
```

### Multiple Field Update

```typescript
const handleUpdateProperty = (instanceId: string) => {
  updateInstance(instanceId, {
    purchasePrice: 400000,
    valuationAtPurchase: 432000,
    rentPerWeek: 520,
  });
};
```

### What Happens:
1. ✅ Only updates specified fields
2. ✅ Other fields remain unchanged
3. ✅ Triggers unsaved changes detection

---

## 4. Retrieving Property Data

### Get Single Instance

```typescript
const handleShowDetails = (instanceId: string) => {
  const instance = getInstance(instanceId);
  
  if (instance) {
    console.log('State:', instance.state);
    console.log('Purchase Price:', instance.purchasePrice);
    console.log('LVR:', instance.lvr);
    // ... access any of the 34 fields
  }
};
```

### Get All Instances

```typescript
const handleShowAllProperties = () => {
  Object.entries(instances).forEach(([id, instance]) => {
    console.log(`Property ${id}:`, instance);
  });
};
```

---

## 5. Deleting a Property Instance

```typescript
const handleDeleteProperty = (instanceId: string) => {
  deleteInstance(instanceId);
};
```

### What Happens:
1. ✅ Removes from context state
2. ✅ Triggers unsaved changes detection
3. ✅ Will be removed from Supabase on next save

---

## 6. Using Property Defaults

### Import the Utility

```typescript
import { getPropertyInstanceDefaults } from '@/utils/propertyInstanceDefaults';
```

### Get Defaults for Property Type

```typescript
// Basic usage
const defaults = getPropertyInstanceDefaults('Units / Apartments');
console.log(defaults); // Complete 34-field object

// With global overrides
const defaultsWithOverrides = getPropertyInstanceDefaults(
  'Metro Houses',
  85,   // Global LVR override
  7.0   // Global interest rate override
);
```

### Property Type Names (Case-Insensitive)

```typescript
// All of these work:
getPropertyInstanceDefaults('Units / Apartments');
getPropertyInstanceDefaults('Villas / Townhouses');
getPropertyInstanceDefaults('Houses (Regional focus)');
getPropertyInstanceDefaults('Duplexes');
getPropertyInstanceDefaults('Small Blocks (3-4 units)');
getPropertyInstanceDefaults('Metro Houses');
getPropertyInstanceDefaults('Larger Blocks (10-20 units)');
getPropertyInstanceDefaults('Commercial Property');
```

---

## 7. Accessing All 34 Fields

### Field Reference

```typescript
const instance = getInstance('prop-1-period-1');

if (instance) {
  // Section A: Property Overview
  console.log(instance.state);                    // "VIC"
  console.log(instance.purchasePrice);            // 350000
  console.log(instance.valuationAtPurchase);      // 378000
  console.log(instance.rentPerWeek);              // 471
  console.log(instance.growthAssumption);         // "High"
  console.log(instance.minimumYield);             // 6.5
  
  // Section B: Contract & Loan Details
  console.log(instance.daysToUnconditional);      // 21
  console.log(instance.daysForSettlement);        // 42
  console.log(instance.lvr);                      // 85
  console.log(instance.lmiWaiver);                // false
  console.log(instance.loanProduct);              // "IO"
  console.log(instance.interestRate);             // 6.5
  console.log(instance.loanTerm);                 // 30
  console.log(instance.loanOffsetAccount);        // 0
  
  // Section D: One-Off Purchase Costs
  console.log(instance.engagementFee);            // 8000
  console.log(instance.conditionalHoldingDeposit); // 7000
  console.log(instance.buildingInsuranceUpfront); // 1400
  console.log(instance.buildingPestInspection);   // 600
  console.log(instance.plumbingElectricalInspections); // 250
  console.log(instance.independentValuation);     // 0
  console.log(instance.unconditionalHoldingDeposit); // 0
  console.log(instance.mortgageFees);             // 1000
  console.log(instance.conveyancing);             // 2200
  console.log(instance.ratesAdjustment);          // 0
  console.log(instance.maintenanceAllowancePostSettlement); // 1000
  console.log(instance.stampDutyOverride);        // null
  
  // Section E: Cashflow
  console.log(instance.vacancyRate);              // 0
  console.log(instance.propertyManagementPercent); // 6.6
  console.log(instance.buildingInsuranceAnnual);  // 350
  console.log(instance.councilRatesWater);        // 2000
  console.log(instance.strata);                   // 3200
  console.log(instance.maintenanceAllowanceAnnual); // 1750
  console.log(instance.landTaxOverride);          // null
  console.log(instance.potentialDeductionsRebates); // 0
}
```

---

## 8. TypeScript Types

### Import Types

```typescript
import type { PropertyInstanceDetails } from '@/types/propertyInstance';
```

### Using Types in Your Components

```typescript
interface MyComponentProps {
  propertyInstance: PropertyInstanceDetails;
}

function PropertyCard({ propertyInstance }: MyComponentProps) {
  return (
    <div>
      <h3>{propertyInstance.state} Property</h3>
      <p>Price: ${propertyInstance.purchasePrice.toLocaleString()}</p>
      <p>Rent: ${propertyInstance.rentPerWeek}/week</p>
    </div>
  );
}
```

---

## 9. Persistence (Automatic)

### Saving

Property instances are **automatically saved** when:

1. ✅ User clicks "Save Scenario" button
2. ✅ Auto-save triggers (if implemented)
3. ✅ Client switches (saves previous client)

**You don't need to do anything!**

### Loading

Property instances are **automatically loaded** when:

1. ✅ User switches clients
2. ✅ Page refreshes
3. ✅ Scenario is loaded from Supabase

**You don't need to do anything!**

---

## 10. Extended DataAssumptions

### Access Property Assumptions with Full Fields

```typescript
import { useDataAssumptions } from '@/contexts/DataAssumptionsContext';

function MyComponent() {
  const { propertyAssumptions } = useDataAssumptions();
  
  // Each property assumption now has 34 fields + legacy fields
  propertyAssumptions.forEach(assumption => {
    console.log('Type:', assumption.type);
    console.log('Average Cost:', assumption.averageCost);
    
    // NEW: Access all 34 fields
    console.log('State:', assumption.state);
    console.log('Purchase Price:', assumption.purchasePrice);
    console.log('Rent per Week:', assumption.rentPerWeek);
    // ... all other fields
  });
}
```

---

## 11. Example: Complete CRUD Flow

```typescript
import React, { useState } from 'react';
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';

function PropertyManager() {
  const { instances, createInstance, updateInstance, deleteInstance, getInstance } = usePropertyInstance();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // CREATE
  const handleCreate = () => {
    const id = `prop-${Date.now()}`;
    createInstance(id, 'Units / Apartments', 1);
    setSelectedId(id);
  };
  
  // READ
  const selectedInstance = selectedId ? getInstance(selectedId) : null;
  
  // UPDATE
  const handleUpdatePrice = (newPrice: number) => {
    if (selectedId) {
      updateInstance(selectedId, { purchasePrice: newPrice });
    }
  };
  
  // DELETE
  const handleDelete = () => {
    if (selectedId) {
      deleteInstance(selectedId);
      setSelectedId(null);
    }
  };
  
  return (
    <div>
      <button onClick={handleCreate}>Create Property</button>
      
      {selectedInstance && (
        <div>
          <h3>Selected Property</h3>
          <p>State: {selectedInstance.state}</p>
          <p>Price: ${selectedInstance.purchasePrice}</p>
          
          <input 
            type="number" 
            value={selectedInstance.purchasePrice}
            onChange={(e) => handleUpdatePrice(Number(e.target.value))}
          />
          
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}
      
      <h4>All Properties ({Object.keys(instances).length})</h4>
      <ul>
        {Object.keys(instances).map(id => (
          <li key={id} onClick={() => setSelectedId(id)}>
            {id}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 12. Common Patterns

### Pattern 1: Check if Instance Exists

```typescript
const instanceId = `${propertyType}-${period}`;
const existing = getInstance(instanceId);

if (!existing) {
  createInstance(instanceId, propertyType, period);
}
```

### Pattern 2: Generate Instance ID

```typescript
// Convention: propertyType-period
const generateInstanceId = (propertyType: string, period: number): string => {
  return `${propertyType.toLowerCase().replace(/\s+/g, '-')}-${period}`;
};

// Usage:
const id = generateInstanceId('Units / Apartments', 1);
// Result: "units-/-apartments-1"
```

### Pattern 3: Bulk Update

```typescript
const handleBulkUpdate = (updates: Record<string, Partial<PropertyInstanceDetails>>) => {
  Object.entries(updates).forEach(([id, fields]) => {
    updateInstance(id, fields);
  });
};
```

### Pattern 4: Filter Instances by Criteria

```typescript
const getInstancesByState = (state: string) => {
  return Object.entries(instances)
    .filter(([_, instance]) => instance.state === state)
    .map(([id, instance]) => ({ id, ...instance }));
};

const vicProperties = getInstancesByState('VIC');
```

---

## 13. Debugging

### Enable Console Logs

Property instance operations log to console:

```
Creating instance: prop-1-period-1 Units / Apartments 1
ScenarioSaveContext: Loading scenario for client: 123
```

### React DevTools

1. Open React DevTools
2. Select `<PropertyInstanceProvider>`
3. View `instances` state
4. Inspect individual property instances

### Check Supabase Data

```sql
SELECT id, client_id, data->'propertyInstances' 
FROM scenarios 
WHERE client_id = 123;
```

---

## 14. Performance Tips

1. **Use useCallback** when passing instance handlers as props
2. **Memoize expensive calculations** based on instances
3. **Batch updates** when changing multiple fields
4. **Use debouncing** for frequent updates (already built-in)

---

## 15. Error Handling

### Check for Instance Existence

```typescript
const handleUpdate = (instanceId: string) => {
  const instance = getInstance(instanceId);
  
  if (!instance) {
    console.error(`Instance ${instanceId} not found`);
    return;
  }
  
  // Safe to update
  updateInstance(instanceId, { purchasePrice: 400000 });
};
```

### Handle Unknown Property Types

```typescript
import { getPropertyInstanceDefaults } from '@/utils/propertyInstanceDefaults';

try {
  const defaults = getPropertyInstanceDefaults('Unknown Type');
  // Will return minimal defaults + warning in console
} catch (error) {
  console.error('Failed to get defaults:', error);
}
```

---

## Quick Reference Card

```typescript
// IMPORT
import { usePropertyInstance } from '@/contexts/PropertyInstanceContext';
import { getPropertyInstanceDefaults } from '@/utils/propertyInstanceDefaults';
import type { PropertyInstanceDetails } from '@/types/propertyInstance';

// USE HOOK
const { instances, createInstance, updateInstance, deleteInstance, getInstance } = usePropertyInstance();

// CREATE
createInstance('prop-1-period-1', 'Units / Apartments', 1);

// READ
const instance = getInstance('prop-1-period-1');

// UPDATE
updateInstance('prop-1-period-1', { purchasePrice: 400000 });

// DELETE
deleteInstance('prop-1-period-1');

// GET DEFAULTS
const defaults = getPropertyInstanceDefaults('Units / Apartments', 80, 6.5);

// FIELDS (34 total)
// Section A (6): state, purchasePrice, valuationAtPurchase, rentPerWeek, growthAssumption, minimumYield
// Section B (8): daysToUnconditional, daysForSettlement, lvr, lmiWaiver, loanProduct, interestRate, loanTerm, loanOffsetAccount
// Section D (12): engagementFee, conditionalHoldingDeposit, buildingInsuranceUpfront, buildingPestInspection, plumbingElectricalInspections, independentValuation, unconditionalHoldingDeposit, mortgageFees, conveyancing, ratesAdjustment, maintenanceAllowancePostSettlement, stampDutyOverride
// Section E (8): vacancyRate, propertyManagementPercent, buildingInsuranceAnnual, councilRatesWater, strata, maintenanceAllowanceAnnual, landTaxOverride, potentialDeductionsRebates
```

---

## Need Help?

- 📖 Read: `PHASE1_IMPLEMENTATION_SUMMARY.md`
- 📊 View: `PHASE1_ARCHITECTURE_DIAGRAM.md`
- ✅ Verify: `PHASE1_VERIFICATION.md`
- 💬 Ask: Your team lead or check the inline JSDoc comments

---

**Ready to build Phase 2!** 🚀



