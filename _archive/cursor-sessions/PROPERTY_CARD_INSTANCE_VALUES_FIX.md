# Property Card Instance Values Fix - Implementation Complete

## 🎯 Problem Statement

Property cards in the timeline were showing **template values** instead of **instance values** after users edited property details in the modal. Changes would save successfully, but the cards continued displaying defaults like "$0k" for price.

## 🔍 Root Cause Analysis

### Issue 1: Wrong ID Field Used (Critical Bug)

**File**: `src/components/PurchaseEventCard.tsx` (Line 29)

**Problem**: The component was using `property?.id` instead of `property?.instanceId` to retrieve instance data.

```typescript
// BEFORE (WRONG):
const instanceId = property?.id || (yearData.purchases?.[0]?.propertyId) || `property_${yearData.year}`;
```

**Why this failed**:
- `property.id` = `"property_0_0"` (timeline display ID)
- `property.instanceId` = `"property_0_instance_0"` (actual instance storage key)
- `getInstance(property.id)` → **undefined** ❌
- Falls back to template defaults → Shows wrong values

### Issue 2: 'k' Format Conversion Bug

**File**: `src/components/PurchaseEventCard.tsx` (Lines 100-121)

**Problem**: The `EditableField` component displayed prices in "k" format (divided by 1000) but saved the edited value directly without multiplying back.

```typescript
// Display: $350k (shows value/1000)
<EditableField value={(propertyData.purchasePrice / 1000).toFixed(0)} field="purchasePrice" suffix="k" />

// User edits: 350
// Saved as: 350 (should be 350,000)
// Next display: 350 / 1000 = 0.35 → "$0k"
```

## ✅ Solutions Implemented

### Fix 1: Use Correct Instance ID

**File**: `src/components/PurchaseEventCard.tsx`

```typescript
// AFTER (CORRECT):
const instanceId = property?.instanceId || (yearData.purchases?.[0]?.propertyId) || `property_${yearData.year}`;
```

**Impact**:
- ✅ `getInstance(property.instanceId)` → Finds the correct instance
- ✅ Displays edited values from instance
- ✅ Falls back to template only if instance doesn't exist

### Fix 2: Add 'k' Format Conversion

**File**: `src/components/PurchaseEventCard.tsx`

```typescript
const handleSave = () => {
  // ... validation ...
  
  let parsedValue = type === 'number' ? parseFloat(editValue) : editValue;
  
  // Convert 'k' format back to full numbers for price fields
  if (suffix === 'k' && (field === 'purchasePrice' || field === 'valuationAtPurchase')) {
    parsedValue = parsedValue * 1000;
  }
  
  handleFieldUpdate(field, parsedValue);
  setIsEditing(false);
  setError(null);
};
```

**Impact**:
- ✅ User edits "350" → Saves as 350,000
- ✅ Displays as "350" next time (350,000 / 1000)
- ✅ Preserves actual property values correctly

## 📊 Data Flow (After Fix)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Timeline Generation (useAffordabilityCalculator)         │
│    • Creates instanceId: "property_0_instance_0"            │
│    • Stores in TimelineProperty.instanceId                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PurchaseEventCard Receives Property                      │
│    • property.instanceId = "property_0_instance_0" ✅       │
│    • getInstance(property.instanceId) ✅                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Display Data Priority                                    │
│    • propertyInstance (if exists) ✅ FIRST                  │
│    • propertyDefaults (template) - FALLBACK                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User Edits in Modal                                      │
│    • updateInstance(instanceId, { purchasePrice: 350000 }) │
│    • Saves to PropertyInstanceContext                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Card Refreshes                                           │
│    • getInstance(property.instanceId) returns updated data  │
│    • Displays: $350k ✅                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing Checklist

### Test 1: Basic Edit Flow
- [ ] 1. Add a property to timeline (e.g., Unit/Apartment)
- [ ] 2. Click "Expand Full Details" on the property card
- [ ] 3. Edit purchase price from $580k to $650k
- [ ] 4. Save and close modal
- [ ] 5. **Verify**: Card shows "$650k" ✅

### Test 2: Multiple Fields
- [ ] 1. Open property modal
- [ ] 2. Edit multiple fields:
  - Purchase Price: $700k
  - Rent: $600/wk
  - LVR: 90%
  - Interest Rate: 6.8%
- [ ] 3. Save and close
- [ ] 4. **Verify**: All fields show edited values ✅

### Test 3: Multiple Properties
- [ ] 1. Add 3x Units/Apartments
- [ ] 2. Edit each property differently:
  - Property 1: $500k
  - Property 2: $650k
  - Property 3: $720k
- [ ] 3. **Verify**: Each card shows its own edited values independently ✅

### Test 4: Inline Edits (Card Quick Edit)
- [ ] 1. Click on any editable field in the card (e.g., Price)
- [ ] 2. Change from "580" to "700"
- [ ] 3. Press Enter
- [ ] 4. **Verify**: 
  - Saves as $700,000 (not $700)
  - Displays as "$700k"
  - Other properties unaffected ✅

### Test 5: Persistence After Reload
- [ ] 1. Edit property price to $800k
- [ ] 2. Save scenario
- [ ] 3. Switch to different scenario
- [ ] 4. Switch back to original scenario
- [ ] 5. **Verify**: Price still shows "$800k" ✅

## 🎨 Affected Fields

All fields in the property card now correctly use instance values:

### Property Details Section
- ✅ State (e.g., "VIC")
- ✅ Yield (calculated from rent/price)
- ✅ Rent per week (e.g., "$500/wk")

### Purchase Section
- ✅ Purchase Price (e.g., "$650k")
- ✅ Valuation at Purchase (e.g., "$702k")
- ✅ %MV (calculated from price/valuation)

### Finance Section
- ✅ LVR (e.g., "85%")
- ✅ Loan Product (IO or P&I)
- ✅ Interest Rate (e.g., "6.5%")
- ✅ Loan Amount (calculated from price × LVR + LMI)

## 🔄 Backwards Compatibility

### Existing Data
- ✅ Properties without instances → Falls back to template defaults (as before)
- ✅ Properties with instances → Shows instance values (fixed)

### Auto-Create Integration
The fix works seamlessly with the auto-create instances feature:
- Properties automatically get instances when added to timeline
- Instances are created with template defaults
- Users can then customize each property's instance values
- Cards immediately reflect changes

## 📝 Key Technical Details

### Instance ID Format
```typescript
// In useAffordabilityCalculator.ts (Line 877):
const instanceId = `${propertyId}_instance_${i}`;

// Examples:
// "property_0_instance_0" - First Unit/Apartment
// "property_0_instance_1" - Second Unit/Apartment
// "property_7_instance_0" - First Custom Block
```

### Timeline Property Structure
```typescript
interface TimelineProperty {
  id: string;              // "property_0_0" - Display ID
  instanceId: string;      // "property_0_instance_0" - Storage key ✅
  title: string;
  cost: number;
  // ... other fields
}
```

### Data Priority Logic
```typescript
const propertyInstance = getInstance(instanceId);
const propertyDefaults = getPropertyData(propertyType);

const propertyData = propertyInstance || propertyDefaults || {
  // Hard-coded fallbacks...
};
```

## 🐛 Bugs Fixed

1. ✅ **Property cards show template values instead of instance values**
   - Changed from `property.id` to `property.instanceId`

2. ✅ **Price shows "$0k" after editing**
   - Added 'k' format conversion (× 1000) when saving

3. ✅ **Changes in modal don't appear on cards**
   - Now correctly retrieves instance by instanceId

4. ✅ **All properties show same values**
   - Each property now uses its own unique instanceId

## 🎉 Result

- ✅ Property cards display **instance values** (edited data)
- ✅ Changes appear **immediately** after closing modal
- ✅ Each property shows **its own** independent values
- ✅ Inline edits work correctly with proper unit conversion
- ✅ Template defaults only used when no instance exists (correct fallback behavior)

---

**Files Changed**:
1. `src/components/PurchaseEventCard.tsx` - Lines 29, 117-122

**Lines of Code**: 2 critical changes (10 lines total)

**Impact**: High - Fixes core functionality of property instance system


