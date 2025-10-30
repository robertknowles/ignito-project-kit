# Planning Calendar Fix - Verification Steps

## What Was Fixed

✅ **Issue 1: Data Source Mismatch**
- Scenarios are now loaded from Supabase instead of localStorage
- This fixes the "wrong data for the client" issue

✅ **Issue 2: Multiple Scenarios Not Showing**
- Each scenario now appears as a separate row in the timeline
- Multiple scenarios for one client will show as "ClientName - ScenarioName"

## How to Verify the Fix

### Step 1: Check the Console Logs

Open your browser's DevTools Console and navigate to the Clients page (`/clients`). You should see logs like:

```
useAllClientScenarios: Starting with X clients and 9 property types
Loading scenarios for client 123: John Smith
Found 2 scenario(s) for John Smith
  Scenario "Conservative": {property_0: 3, ...}
  ...
useAllClientScenarios: Summary: [{id: "123-456", name: "John Smith - Conservative", ...}]
```

### Step 2: Verify Multiple Scenarios Display

If you have a client with multiple saved scenarios:

**Expected Behavior:**
- You should see **TWO (or more) separate rows** in the timeline
- Row 1: "ClientName - Scenario 1"
- Row 2: "ClientName - Scenario 2"

**Old Behavior (Bug):**
- Only one row showed (or no rows)

### Step 3: Verify Correct Client Data

**Test Case:** 
1. Create/select Client A with Scenario X (3 Units, 2 Houses)
2. Create/select Client B with Scenario Y (5 Duplexes, 1 Unit)
3. Navigate to `/clients` page

**Expected:**
- Timeline shows both clients' scenarios correctly
- Client A's row shows units and houses
- Client B's row shows duplexes and units
- No data mixing between clients

### Step 4: Check Property Mapping

If you see warnings in the console like:
```
WARNING: No property assumption found at index X
```

This means a scenario references a property type that no longer exists in your assumptions. This can happen if you:
- Deleted a property type from Data Assumptions
- Changed the order of property types
- The scenario is very old

**Solution:** Re-save the scenario for that client to update the property references.

## Known Limitations

### Purchase Year Calculation

The timeline uses a **simplified** calculation for purchase years:
- Based on deposit requirements and annual savings
- Does NOT run the full affordability engine
- May not match the exact years shown on the Dashboard

This is intentional for performance reasons (the full engine requires all client contexts loaded).

**Impact:** Timeline shows *approximate* purchase timing, which is acceptable for an overview.

### Property Assumptions Are Global

Property types and their characteristics (cost, yield, growth) are:
- ✅ **Global per user** (stored in your profile)
- ❌ **NOT per client** or per scenario

This means if you change a property assumption (e.g., change "Units" cost from $350k to $400k):
- All scenarios using that property will reflect the new cost in the timeline
- This is the expected behavior

## Troubleshooting

### No Timeline Data Shows

**Check:**
1. Do you have saved scenarios? (Check in Supabase `scenarios` table)
2. Are property assumptions loaded? (Check console for "Waiting for property assumptions")
3. Any errors in console?

### Timeline Shows Old/Wrong Data

**Causes:**
- Scenarios saved before recent property assumption changes
- Property indices don't match current assumptions

**Solution:**
1. Navigate to Dashboard
2. Select the client
3. Re-save their scenario (this updates the data)

### "Both Scenarios" Not Showing

**Check Console:**
```
Found 2 scenario(s) for [ClientName]
```

If it says "Found 1", then only one scenario exists in the database. You may need to create a second scenario for that client.

## Testing With Multiple Clients

### Test Scenario A: Single Client, Multiple Scenarios

1. Go to Dashboard
2. Select "Client 1"
3. Configure properties and save as "Scenario A"
4. Change properties
5. Save again (creates "Scenario B")
6. Navigate to `/clients`
7. **Expected:** See two rows for Client 1

### Test Scenario B: Multiple Clients, Single Scenario Each

1. Create Client A with Scenario 1
2. Create Client B with Scenario 2
3. Navigate to `/clients`
4. **Expected:** See two rows, one for each client

### Test Scenario C: Multiple Clients, Multiple Scenarios Each

1. Client A: Scenarios 1 & 2
2. Client B: Scenarios 1, 2, & 3
3. Navigate to `/clients`
4. **Expected:** See 5 total rows (2 + 3)

## Next Steps If Issues Persist

If you still see incorrect data after this fix:

1. **Capture console logs** - Copy the full console output from `/clients` page
2. **Check Supabase** - Verify scenarios exist in database with correct `client_id`
3. **Check property assumptions** - Ensure they're loaded correctly
4. **Try re-saving** - Re-save a scenario from the Dashboard and check if it appears

## Success Criteria

✅ Multiple scenarios per client show as separate rows  
✅ Property data correctly maps to property assumptions  
✅ No data mixing between different clients  
✅ Console logs show clear loading process  
✅ Timeline displays even with simplified year calculations  

