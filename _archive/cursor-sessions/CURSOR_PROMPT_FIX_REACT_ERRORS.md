# Cursor Prompt: Fix React Errors After Assumptions Changes

## Goal

Fix three critical issues causing errors in the console:
1. **setState during render** - Cannot update PropertyInstanceProvider while rendering
2. **State is undefined** - Land tax calculator receiving undefined state
3. **Missing property instances** - Instance ID mismatch causing fallback to template defaults

---

## Problem 1: setState During Render (CRITICAL)

### Error Message
```
Warning: Cannot update a component (`PropertyInstanceProvider`) while rendering a different component (`ExportPDFButton`). 
To locate the bad setState() call inside `ExportPDFButton`, follow the stack trace as described in https://reactjs.org/link/setstate-in-render
```

### Root Cause

In `useAffordabilityCalculator.ts` around line 853, inside the `determineNextPurchasePeriod` function (which is called from `useMemo`), we're calling `createInstance()` which updates React state.

**This is not allowed** - you cannot update state during the render phase.

### Solution

Move instance creation to a `useEffect` instead of doing it inside `useMemo`.

### Implementation

**File:** `src/hooks/useAffordabilityCalculator.ts`

**Step 1: Find the problematic code** (around line 853)

Look for something like:
```typescript
// Inside determineNextPurchasePeriod or similar function
if (!propertyInstance) {
  createInstance(instanceId, property.title, period);
  propertyInstance = getInstance(instanceId);
}
```

**Step 2: Remove the createInstance call from inside useMemo**

**Step 3: Add a useEffect to create missing instances**

Add this AFTER the `useMemo` that calculates the timeline:

```typescript
// After the main useMemo that generates the timeline
useEffect(() => {
  // Auto-create property instances for any properties in the timeline that don't have one
  if (!timeline) return;
  
  const instancesToCreate: Array<{ instanceId: string; propertyType: string; period: number }> = [];
  
  timeline.forEach(period => {
    period.purchases.forEach(purchase => {
      const instance = getInstance(purchase.instanceId);
      if (!instance) {
        instancesToCreate.push({
          instanceId: purchase.instanceId,
          propertyType: purchase.title,
          period: period.period
        });
      }
    });
    
    period.failedAttempts?.forEach(attempt => {
      const instance = getInstance(attempt.property.instanceId);
      if (!instance) {
        instancesToCreate.push({
          instanceId: attempt.property.instanceId,
          propertyType: attempt.property.title,
          period: period.period
        });
      }
    });
  });
  
  // Create all missing instances
  instancesToCreate.forEach(({ instanceId, propertyType, period }) => {
    console.log(`Auto-creating missing instance: ${instanceId} for ${propertyType}`);
    createInstance(instanceId, propertyType, period);
  });
}, [timeline, getInstance, createInstance]);
```

**Step 4: Inside useMemo, use template defaults if instance doesn't exist YET**

Where you currently have:
```typescript
if (!propertyInstance) {
  createInstance(instanceId, property.title, period); // REMOVE THIS
  propertyInstance = getInstance(instanceId);
}
```

Replace with:
```typescript
if (!propertyInstance) {
  // Use template defaults for calculation
  // Instance will be created by useEffect after render
  console.log(`Property instance not found for ${instanceId}, using template defaults`);
  const template = getPropertyTypeTemplate(property.title);
  // Use template for this calculation
  // ... rest of code uses template instead of propertyInstance
}
```

---

## Problem 2: State is Undefined

### Error Message
```
calculateLandTax: state is undefined, returning 0
```

### Root Cause

When creating property instances from templates, the `state` field is not being set.

### Solution

Ensure all property type templates have a `state` field, and that it's copied when creating instances.

### Implementation

**File:** `src/contexts/PropertyInstanceContext.tsx`

**In the `createInstance` function:**

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
    ...template,
    // Ensure state is set (fallback to VIC if template doesn't have it)
    state: template.state || 'VIC',
  };
  
  setInstances(prev => ({
    ...prev,
    [instanceId]: newInstance,
  }));
  
  console.log(`Created instance: ${instanceId} ${propertyType} ${period} with state: ${newInstance.state}`);
};
```

**File:** `src/contexts/DataAssumptionsContext.tsx` (or wherever templates are defined)

**Ensure all property type templates have a `state` field:**

```typescript
export const defaultPropertyTypeTemplates: PropertyTypeTemplate[] = [
  {
    propertyType: "Units / Apartments",
    state: "VIC", // ADD THIS
    purchasePrice: 350000,
    // ... rest of fields
  },
  {
    propertyType: "Villas / Townhouses",
    state: "VIC", // ADD THIS
    purchasePrice: 325000,
    // ... rest of fields
  },
  // ... add state to ALL templates
];
```

---

## Problem 3: Instance ID Mismatch

### Error Message
```
Property instance not found for property_0_instance_0, using template defaults
Creating instance: property_0_instance_1 Units / Apartments 1
Creating instance: property_0_instance_2 Units / Apartments 1
```

### Root Cause

The code is looking for `property_0_instance_0` but creating `property_0_instance_1`, `property_0_instance_2`, etc.

There's a mismatch in how instance IDs are generated vs how they're looked up.

### Solution

Ensure instance ID generation is consistent.

### Investigation Steps

**Step 1: Find where instance IDs are generated**

Search for where `instanceId` is created. It might be in:
- `PropertySelectionContext.tsx` (when adding properties to timeline)
- `useAffordabilityCalculator.ts` (when creating timeline)

**Step 2: Find where instance IDs are looked up**

Search for `getInstance(property.instanceId)` or similar.

**Step 3: Ensure they match**

The generation logic should be:
```typescript
const instanceId = `property_${propertyIndex}_instance_${instanceNumber}`;
```

Where:
- `propertyIndex` = index of the property type (0 for first type, 1 for second, etc.)
- `instanceNumber` = which instance of this type (0 for first, 1 for second, etc.)

**OR** use a simpler approach:

```typescript
const instanceId = `${propertyType}_${Date.now()}_${Math.random()}`;
```

But this should be consistent across the codebase.

### Quick Fix

**File:** Search for where instanceId is generated

**Option A: Start from 0 instead of 1**

If you're currently doing:
```typescript
const instanceId = `property_${index}_instance_${count + 1}`;
```

Change to:
```typescript
const instanceId = `property_${index}_instance_${count}`;
```

**Option B: Use the same ID everywhere**

Ensure that when you add a property to the timeline, you use the SAME instanceId that was generated when the property was selected.

---

## Testing After Fixes

1. ✅ No "Cannot update component while rendering" errors
2. ✅ No "state is undefined" warnings
3. ✅ No "Property instance not found" warnings
4. ✅ All property instances are created correctly
5. ✅ Land tax calculation works (no longer returns 0)
6. ✅ Timeline generates without errors
7. ✅ Can push to Git without console errors

---

## Summary of Changes

**Fix 1:** Move `createInstance()` calls from `useMemo` to `useEffect`
**Fix 2:** Ensure all templates have `state` field set
**Fix 3:** Fix instance ID generation to be consistent (start from 0 or use same ID everywhere)

---

**End of Prompt**
