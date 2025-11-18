# Property Card Instance Values - Quick Test Guide

## ✅ Fixed Issues
1. Property cards now show **instance values** instead of template defaults
2. Price no longer shows "$0k" after editing
3. Each property displays its own independent edited values

## 🧪 Quick Test (5 minutes)

### Test 1: Basic Edit Flow

1. **Add a property to timeline**
   - Go to Strategy Builder
   - Select "Unit/Apartment" (or any property)
   - Click "+" to add to timeline

2. **Open property details**
   - In the Investment Timeline, find the property card
   - Click "[ Expand Full Details → ]" button

3. **Edit the purchase price**
   - In the modal, go to "Property Overview" tab
   - Change "Purchase Price" from $580,000 to $650,000
   - Click "Save Changes"
   - Close modal

4. **Verify the fix** ✅
   - Property card should show: **"Price: $650k"**
   - Before fix: Would show "$0k" or "$580k" (template default)
   - After fix: Shows "$650k" (your edited value)

### Test 2: Multiple Fields

1. **Open same property again**
2. **Edit multiple fields**:
   - Purchase Price: $700,000
   - Rent per week: $600
   - LVR: 90%
   - Interest Rate: 6.8%
3. **Save and close**
4. **Verify** ✅:
   - Price: $700k
   - Rent: $600/wk
   - LVR: 90%
   - Rate: 6.8%

### Test 3: Multiple Properties

1. **Add 3 Unit/Apartments**
2. **Edit each one differently**:
   - Property 1: $500k price
   - Property 2: $650k price  
   - Property 3: $720k price
3. **Verify** ✅:
   - Each card shows its own unique values
   - Property 1 still shows $500k
   - Property 2 still shows $650k
   - Property 3 still shows $720k

### Test 4: Inline Edits (Quick Edit on Card)

1. **Find any property card in timeline**
2. **Click directly on the price value** (e.g., "580")
   - Input field appears
3. **Type new value**: "750"
4. **Press Enter**
5. **Verify** ✅:
   - Saves as $750,000 (not $750)
   - Displays as "$750k"
   - Persists after refresh

## 🎯 Expected Results

### BEFORE the fix:
- ❌ Cards showed template defaults
- ❌ "$0k" appeared after editing
- ❌ Changes didn't persist visually
- ❌ All properties showed same values

### AFTER the fix:
- ✅ Cards show instance values
- ✅ Correct prices display (e.g., "$650k")
- ✅ Changes appear immediately
- ✅ Each property independent

## 🔍 What Changed (Technical)

### Change 1: Use correct instance ID
```typescript
// Before:
const instanceId = property?.id  // ❌ Wrong ID

// After:
const instanceId = property?.instanceId  // ✅ Correct ID
```

### Change 2: Convert 'k' format on save
```typescript
// When saving prices displayed as "$350k":
let parsedValue = parseFloat(editValue);  // 350

// Convert back to full number:
if (suffix === 'k' && field === 'purchasePrice') {
  parsedValue = parsedValue * 1000;  // 350,000 ✅
}
```

## 🐛 If Something Doesn't Work

### Price still shows "$0k" or wrong value?
1. Check browser console for errors
2. Verify instanceId is correct: Look for `property_X_instance_Y` format
3. Try clearing browser cache and reloading

### Changes don't persist after reload?
1. Ensure scenario is saved (disk icon in top right)
2. Check that PropertyInstanceContext is working
3. Verify localStorage has the instance data

### Multiple properties show same values?
1. Each should have unique instanceId
2. Check console logs: "Creating instance: property_0_instance_0", "property_0_instance_1", etc.
3. Verify getInstance() returns different data for each

## 📝 Files Modified

1. **src/components/PurchaseEventCard.tsx**
   - Line 29: Changed `property?.id` → `property?.instanceId`
   - Lines 117-122: Added 'k' format conversion logic

**Total changes**: 2 critical fixes (10 lines)

---

**Status**: ✅ Ready for testing

**Test Duration**: ~5 minutes

**Impact**: High - Core functionality fix


