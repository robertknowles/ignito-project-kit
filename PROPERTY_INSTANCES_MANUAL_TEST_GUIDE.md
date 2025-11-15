# Property Instances Database Schema - Manual Test Guide

**Purpose:** Verify that the database properly stores and retrieves all 39 property instance fields for multiple properties.

**Time Required:** 15-20 minutes

---

## Prerequisites

✅ Application is running locally or deployed  
✅ User is logged in  
✅ At least one client exists in the database  
✅ Browser DevTools are open (for verification)

---

## Test 1: Create Single Property Instance

**Objective:** Verify that a single property instance can be created with all 39 fields.

### Steps:

1. **Navigate to Decision Engine**
   - Log in to the application
   - Select or create a client
   - Go to Decision Engine page

2. **Add Property**
   - Click "Add Property" button
   - Select any property type
   - Note the property appears in the timeline

3. **Edit Property Instance**
   - Click on the property in the timeline
   - Property details panel should open on the right
   - Verify all 5 sections are visible:
     - ✅ Section A: Property Overview (6 fields)
     - ✅ Section B: Contract & Loan Details (8 fields)
     - ✅ Section D: One-Off Purchase Costs (12 fields)
     - ✅ Section E: Cashflow (8 fields)

4. **Modify Fields**
   - Change at least one field in each section:
     - **Section A:** Change `Purchase Price` to `555,000`
     - **Section B:** Change `LVR` to `85`
     - **Section D:** Change `Engagement Fee` to `4,000`
     - **Section E:** Change `Vacancy Rate` to `3`

5. **Save Scenario**
   - Click "Save" button (or wait for auto-save)
   - Verify toast notification: "Scenario Saved"
   - Note the "Unsaved Changes" indicator disappears

6. **Verify in Browser DevTools**
   - Open DevTools → Network tab
   - Look for POST/PATCH request to `/scenarios`
   - Check request payload:
     - Should contain `propertyInstances` object
     - Should have key like `property_0_instance_0`
     - Should contain all 39 fields

### Expected Results:

✅ Property instance created successfully  
✅ All 39 fields visible and editable  
✅ Changes saved to database  
✅ Network request shows complete data structure  

### Verification Query:

```sql
-- Run in Supabase SQL Editor
SELECT 
  id, 
  name,
  data->'propertyInstances' as instances
FROM scenarios
WHERE client_id = [YOUR_CLIENT_ID]
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected Output:**
- `instances` should contain object with key `property_0_instance_0`
- Object should have all 39 fields with your modified values

---

## Test 2: Multiple Property Instances

**Objective:** Verify that multiple properties with multiple instances can be saved.

### Steps:

1. **Add Second Property**
   - Click "Add Property" again
   - Select a different property type
   - Verify it appears in the timeline as `property_1_instance_0`

2. **Add Third Property Instance**
   - Add a third property
   - Should appear as `property_2_instance_0`

3. **Modify Each Property**
   - Edit property 1: Set `Purchase Price` to `500,000`
   - Edit property 2: Set `Purchase Price` to `600,000`
   - Edit property 3: Set `Purchase Price` to `700,000`

4. **Save and Verify**
   - Save scenario (or wait for auto-save)
   - Open DevTools → Application → IndexedDB (if used) or check Network tab
   - Verify payload contains all 3 instances

5. **Reload Page**
   - Refresh the browser (F5)
   - Verify all 3 properties still appear
   - Verify purchase prices are correct:
     - Property 1: $500,000
     - Property 2: $600,000
     - Property 3: $700,000

### Expected Results:

✅ Multiple properties created successfully  
✅ Each property has independent data  
✅ All data persists after page reload  
✅ No data loss or mixing between properties

### Verification Query:

```sql
SELECT 
  jsonb_object_keys(data->'propertyInstances') as instance_id
FROM scenarios
WHERE client_id = [YOUR_CLIENT_ID]
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected Output:**
```
property_0_instance_0
property_1_instance_0
property_2_instance_0
```

---

## Test 3: All 39 Fields Verification

**Objective:** Verify that every single field is stored and retrieved correctly.

### Steps:

1. **Select One Property Instance**
   - Choose `property_0_instance_0`
   - Open the property details panel

2. **Fill Out All Fields (systematically go through each section)**

   **Section A - Property Overview:**
   - State: `VIC`
   - Purchase Price: `500,000`
   - Valuation at Purchase: `550,000`
   - Rent per Week: `450`
   - Growth Assumption: `Medium`
   - Minimum Yield: `5.0`

   **Section B - Contract & Loan Details:**
   - Days to Unconditional: `14`
   - Days for Settlement: `60`
   - LVR: `80`
   - LMI Waiver: `No`
   - Loan Product: `Interest Only`
   - Interest Rate: `6.5`
   - Loan Term: `30`
   - Loan Offset Account: `10,000`

   **Section D - One-Off Purchase Costs:**
   - Engagement Fee: `3,500`
   - Conditional Holding Deposit: `10,000`
   - Building Insurance Upfront: `1,200`
   - Building & Pest Inspection: `600`
   - Plumbing/Electrical Inspections: `400`
   - Independent Valuation: `550`
   - Unconditional Holding Deposit: `0`
   - Mortgage Fees: `800`
   - Conveyancing: `1,800`
   - Rates Adjustment: `0`
   - Maintenance Allowance Post Settlement: `2,000`
   - Stamp Duty Override: `(leave blank / null)`

   **Section E - Cashflow:**
   - Vacancy Rate: `2`
   - Property Management %: `6.6`
   - Building Insurance Annual: `1,200`
   - Council Rates & Water: `2,400`
   - Strata: `0`
   - Maintenance Allowance Annual: `3,000`
   - Land Tax Override: `(leave blank / null)`
   - Potential Deductions/Rebates: `1,500`

3. **Save Scenario**
   - Save the scenario
   - Wait for confirmation

4. **Reload and Verify Each Field**
   - Refresh the page (F5)
   - Open the same property instance
   - **Go through EVERY field** and verify it matches what you entered
   - Check boxes should be checked/unchecked as you set them
   - Numbers should be exact
   - Dropdown selections should be preserved

### Expected Results:

✅ All 39 fields saved correctly  
✅ All 39 fields loaded correctly after page reload  
✅ No data loss on any field  
✅ Null values preserved for optional overrides

### Field Checklist:

```
Section A (6 fields):
☐ state
☐ purchasePrice
☐ valuationAtPurchase
☐ rentPerWeek
☐ growthAssumption
☐ minimumYield

Section B (8 fields):
☐ daysToUnconditional
☐ daysForSettlement
☐ lvr
☐ lmiWaiver
☐ loanProduct
☐ interestRate
☐ loanTerm
☐ loanOffsetAccount

Section D (12 fields):
☐ engagementFee
☐ conditionalHoldingDeposit
☐ buildingInsuranceUpfront
☐ buildingPestInspection
☐ plumbingElectricalInspections
☐ independentValuation
☐ unconditionalHoldingDeposit
☐ mortgageFees
☐ conveyancing
☐ ratesAdjustment
☐ maintenanceAllowancePostSettlement
☐ stampDutyOverride

Section E (8 fields):
☐ vacancyRate
☐ propertyManagementPercent
☐ buildingInsuranceAnnual
☐ councilRatesWater
☐ strata
☐ maintenanceAllowanceAnnual
☐ landTaxOverride
☐ potentialDeductionsRebates

TOTAL: 39 fields ✓
```

---

## Test 4: Maximum Scale (9 Properties)

**Objective:** Verify that the database can handle 9 properties with multiple instances each.

### Steps:

1. **Create 9 Properties**
   - Add 9 properties of different types
   - They should be numbered `property_0` through `property_8`

2. **Modify Each Property**
   - Set unique values for each property's `Purchase Price`:
     - Property 0: $500,000
     - Property 1: $550,000
     - Property 2: $600,000
     - Property 3: $650,000
     - Property 4: $700,000
     - Property 5: $750,000
     - Property 6: $800,000
     - Property 7: $850,000
     - Property 8: $900,000

3. **Save and Measure**
   - Save the scenario
   - Open DevTools → Network tab
   - Look at the request size
   - **Expected:** < 100KB

4. **Reload and Verify**
   - Refresh the page
   - Verify all 9 properties appear
   - Spot-check 3 random properties to ensure data is correct

5. **Check Performance**
   - Note the time it takes to load
   - **Expected:** < 1 second for full page load
   - **Expected:** < 500ms for data fetch

### Expected Results:

✅ Can save 9 properties successfully  
✅ Data size is reasonable (< 100KB)  
✅ Load performance is good (< 1 second)  
✅ All property data loads correctly

### Verification Query:

```sql
SELECT 
  id,
  name,
  pg_column_size(data) as data_size_bytes,
  pg_column_size(data) / 1024.0 as data_size_kb,
  jsonb_object_keys(data->'propertyInstances') as instance_count
FROM scenarios
WHERE client_id = [YOUR_CLIENT_ID]
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected Output:**
- `data_size_kb` should be < 100
- Should list 9 instance keys (property_0 through property_8)

---

## Test 5: CRUD Operations

**Objective:** Verify Create, Read, Update, Delete operations work correctly.

### 5A: Create

✅ Already tested in Tests 1-4

### 5B: Read

1. **Read from UI**
   - Open any property instance
   - Verify all fields display correctly
   - ✅ **Pass** if data appears

2. **Read from Database**
   - Run verification query (see below)
   - ✅ **Pass** if data structure is correct

### 5C: Update

1. **Update Single Field**
   - Change `Purchase Price` from $500,000 to $525,000
   - Save
   - Reload page
   - Verify new value: $525,000
   - ✅ **Pass** if update persisted

2. **Update Multiple Fields**
   - Change `Purchase Price` to $530,000
   - Change `Rent per Week` to $475
   - Change `LVR` to 85
   - Save
   - Reload page
   - Verify all 3 fields updated
   - ✅ **Pass** if all updates persisted

### 5D: Delete

1. **Delete Property Instance**
   - Remove one property from the timeline
   - (Look for delete/remove button or functionality)
   - Save
   - Reload page
   - Verify property is still gone
   - ✅ **Pass** if deletion persisted

2. **Verify in Database**
   - Run count query (see below)
   - Count should be reduced by 1
   - ✅ **Pass** if count is correct

### Verification Queries:

```sql
-- Read: View specific instance
SELECT data->'propertyInstances'->'property_0_instance_0' as instance_data
FROM scenarios
WHERE client_id = [YOUR_CLIENT_ID]
ORDER BY updated_at DESC
LIMIT 1;

-- Update: Check updated field
SELECT 
  data->'propertyInstances'->'property_0_instance_0'->>'purchasePrice' as purchase_price
FROM scenarios
WHERE client_id = [YOUR_CLIENT_ID]
ORDER BY updated_at DESC
LIMIT 1;

-- Delete: Count remaining instances
SELECT 
  jsonb_object_keys(data->'propertyInstances') as instance_id
FROM scenarios
WHERE client_id = [YOUR_CLIENT_ID]
ORDER BY updated_at DESC
LIMIT 1;
```

---

## Test 6: Data Integrity

**Objective:** Verify that data doesn't get corrupted or mixed between instances.

### Steps:

1. **Create 3 Properties with Distinct Values**
   - Property 0: State = `VIC`, Purchase Price = `500,000`
   - Property 1: State = `NSW`, Purchase Price = `600,000`
   - Property 2: State = `QLD`, Purchase Price = `700,000`

2. **Save and Reload Multiple Times**
   - Save scenario
   - Reload page (F5)
   - Repeat 3 times

3. **Verify Data After Each Reload**
   - Property 0: Should still be VIC, $500,000
   - Property 1: Should still be NSW, $600,000
   - Property 2: Should still be QLD, $700,000

4. **Update Middle Property**
   - Change Property 1 to $650,000
   - Save and reload
   - Verify:
     - Property 0: Still $500,000 (unchanged)
     - Property 1: Now $650,000 (updated)
     - Property 2: Still $700,000 (unchanged)

### Expected Results:

✅ No data corruption  
✅ No data mixing between instances  
✅ Updates don't affect other instances  
✅ Data persists correctly across reloads

---

## Test 7: Edge Cases

**Objective:** Test boundary conditions and edge cases.

### 7A: Null Values

1. **Leave Optional Overrides Blank**
   - `stampDutyOverride`: Leave blank
   - `landTaxOverride`: Leave blank
   - Save and reload
   - Verify they remain blank (null)
   - ✅ **Pass** if nulls are preserved

### 7B: Zero Values

1. **Set Fields to Zero**
   - `unconditionalHoldingDeposit`: 0
   - `ratesAdjustment`: 0
   - `strata`: 0
   - Save and reload
   - Verify they remain 0 (not null, not blank)
   - ✅ **Pass** if zeros are preserved

### 7C: Maximum Values

1. **Set Large Numbers**
   - `Purchase Price`: 99,999,999
   - `Valuation at Purchase`: 100,000,000
   - Save and reload
   - Verify large numbers are preserved
   - ✅ **Pass** if large numbers work

### 7D: Decimal Precision

1. **Set Precise Decimals**
   - `Interest Rate`: 6.79
   - `Minimum Yield`: 5.25
   - `Property Management %`: 6.63
   - Save and reload
   - Verify decimals are exact (not rounded)
   - ✅ **Pass** if precision preserved

---

## Test 8: Performance Under Load

**Objective:** Verify acceptable performance with maximum data.

### Steps:

1. **Create Maximum Scenario**
   - 9 properties
   - All 39 fields filled for each
   - Save scenario

2. **Measure Save Performance**
   - Open DevTools → Network tab
   - Click Save button
   - Note the time from request start to completion
   - **Target:** < 500ms
   - ✅ **Pass** if < 1000ms (acceptable)
   - ⚠️ **Warning** if 1000-2000ms (needs investigation)
   - ❌ **Fail** if > 2000ms (needs optimization)

3. **Measure Load Performance**
   - Clear browser cache
   - Reload page (F5)
   - Note time from page load to data appearing
   - **Target:** < 1000ms
   - ✅ **Pass** if < 2000ms (acceptable)
   - ⚠️ **Warning** if 2000-5000ms (needs investigation)
   - ❌ **Fail** if > 5000ms (needs optimization)

4. **Measure Update Performance**
   - Change one field
   - Save
   - Note time to save
   - **Target:** Same as save performance above

### Performance Checklist:

```
☐ Save time: _______ ms (Target: < 500ms)
☐ Load time: _______ ms (Target: < 1000ms)
☐ Update time: _______ ms (Target: < 500ms)
☐ Data size: _______ KB (Target: < 100KB)
```

---

## Troubleshooting

### Issue: Changes Not Saving

**Check:**
1. Is "Unsaved Changes" indicator showing?
2. Are there any error messages in toast notifications?
3. Check browser console for errors
4. Check Network tab for failed requests

**Fix:**
- Verify user is authenticated
- Check RLS policies in Supabase
- Verify network connection

### Issue: Data Not Loading

**Check:**
1. Is the page loading at all?
2. Is the scenario selector showing the right scenario?
3. Check browser console for errors
4. Check Network tab for 404 or 500 errors

**Fix:**
- Verify scenario exists in database
- Check client_id is correct
- Verify RLS policies allow reading

### Issue: Missing Fields

**Check:**
1. Are fields visible in the UI?
2. Are fields in the database payload?
3. Check the `propertyInstances` object structure

**Fix:**
- Verify UI components are rendering all sections
- Check that default values are being set
- Verify TypeScript types match database structure

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Single Property Instance | ☐ Pass ☐ Fail | |
| 2. Multiple Properties | ☐ Pass ☐ Fail | |
| 3. All 39 Fields | ☐ Pass ☐ Fail | |
| 4. Maximum Scale (9 props) | ☐ Pass ☐ Fail | |
| 5. CRUD Operations | ☐ Pass ☐ Fail | |
| 6. Data Integrity | ☐ Pass ☐ Fail | |
| 7. Edge Cases | ☐ Pass ☐ Fail | |
| 8. Performance | ☐ Pass ☐ Fail | |

---

## Final Verification

After completing all tests, run this comprehensive query:

```sql
-- Final verification query
SELECT 
  s.id,
  s.name,
  s.client_id,
  c.name as client_name,
  -- Count property instances
  (SELECT COUNT(*) 
   FROM jsonb_object_keys(s.data->'propertyInstances')) as instance_count,
  -- Data size
  pg_column_size(s.data) as data_size_bytes,
  pg_column_size(s.data) / 1024.0 as data_size_kb,
  -- Timestamps
  s.created_at,
  s.updated_at,
  -- Sample instance (first one)
  (SELECT jsonb_object_keys(s.data->'propertyInstances') LIMIT 1) as sample_instance_id
FROM scenarios s
JOIN clients c ON c.id = s.client_id
WHERE s.client_id = [YOUR_CLIENT_ID]
ORDER BY s.updated_at DESC
LIMIT 1;
```

**Expected Results:**
- `instance_count`: 1-9 (depending on your test)
- `data_size_kb`: < 100
- `sample_instance_id`: Should follow pattern `property_N_instance_M`

---

## Conclusion

If all tests pass:
✅ **Database schema is verified and ready for production use**

If any tests fail:
⚠️ **Document the failure and investigate root cause**

---

**Test Date:** _______________  
**Tester Name:** _______________  
**Environment:** ☐ Local ☐ Staging ☐ Production  
**Overall Result:** ☐ Pass ☐ Fail ☐ Needs Investigation

