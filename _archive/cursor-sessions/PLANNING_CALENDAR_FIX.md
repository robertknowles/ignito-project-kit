# Planning Calendar Fix - Implementation Summary

## Issues Identified

1. **Data Source Mismatch**: The `useAllClientScenarios` hook was looking for scenario data in localStorage with key `scenario_${clientId}`, but scenarios are actually saved to the Supabase `scenarios` table.

2. **Missing Multiple Scenarios**: Each client can have multiple scenarios in the database, but the hook was not designed to handle or display them separately.

3. **Wrong Client Data**: Due to localStorage lookups failing, the hook was skipping clients or potentially showing incorrect data.

## Solution Implemented

### Updated: `src/hooks/useAllClientScenarios.ts`

#### Key Changes:

1. **Data Source Migration**
   - Changed from `localStorage.getItem(scenario_${clientId})` 
   - To `supabase.from('scenarios').select('*').eq('client_id', clientId)`

2. **Multiple Scenario Support**
   - Each scenario now creates a **separate row** in the timeline
   - Display names show: `"ClientName - ScenarioName"` when multiple scenarios exist
   - Single scenarios show just the client name

3. **Proper Data Flow**
   ```typescript
   // Before: localStorage lookup (data doesn't exist there)
   const savedScenario = localStorage.getItem(`scenario_${clientId}`);
   
   // After: Supabase query (data actually exists here)
   const { data: scenarios } = await supabase
     .from('scenarios')
     .select('*')
     .eq('client_id', client.id);
   ```

4. **Property Assumptions**
   - Now uses global `propertyAssumptions` from `DataAssumptionsContext`
   - Correctly maps property indices to assumption data
   - This matches how the main application works

5. **Timeline Row Structure**
   ```typescript
   // Each scenario creates a unique timeline row:
   {
     id: `${client.id}-${scenario.id}`,  // Compound ID for uniqueness
     name: "John Smith - Aggressive Growth",  // Descriptive name
     purchases: [...],  // Properties from this scenario
     scenarioName: "Aggressive Growth",
     clientId: 123,  // Original client ID
   }
   ```

## How It Works Now

1. **Fetch**: Hook queries Supabase for ALL scenarios for each client
2. **Process**: Each scenario is processed independently to extract property purchases
3. **Display**: Each scenario appears as a separate row in the PropertyTimeline component
4. **Identify**: Multiple scenarios for one client show with suffixed names

## Example Output

If "John Smith" has 2 scenarios:
- **Row 1**: "John Smith - Conservative" (3 properties over 10 years)
- **Row 2**: "John Smith - Aggressive" (8 properties over 10 years)

If "Jane Doe" has 1 scenario:
- **Row 1**: "Jane Doe" (5 properties over 8 years)

## Testing Checklist

- [ ] Multiple scenarios per client show as separate rows
- [ ] Single scenario clients show with just their name
- [ ] Property data correctly maps to client scenarios
- [ ] Timeline shows correct purchase years
- [ ] No data mixing between clients
- [ ] Console logs show scenario loading correctly

## Debugging Features Added

The updated hook includes comprehensive logging to help diagnose issues:

1. **Startup Logging**: Shows when the hook starts and number of clients/property types
2. **Per-Client Logging**: Shows each client being processed and scenarios found
3. **Per-Scenario Logging**: Shows property selections for each scenario
4. **Property Mapping Warnings**: Warns if a property index doesn't map to an assumption
5. **Summary Logging**: Final summary showing all timeline rows and their purchase counts

### Console Log Example:
```
useAllClientScenarios: Starting with 2 clients and 9 property types
Loading scenarios for client 123: John Smith
Found 2 scenario(s) for John Smith
  Scenario "Conservative Growth": {property_0: 3, property_2: 2}
    Creating 3 purchases of "Units / Apartments", starting year 2027
    Creating 2 purchases of "Houses (Regional focus)", starting year 2030
Total purchases for John Smith - Conservative Growth: 5
  Scenario "Aggressive Growth": {property_0: 5, property_2: 3}
    Creating 5 purchases of "Units / Apartments", starting year 2027
    Creating 3 purchases of "Houses (Regional focus)", starting year 2029
Total purchases for John Smith - Aggressive Growth: 8
useAllClientScenarios: Final timeline data with 2 rows
```

## Technical Notes

### Why Not Combine Scenarios?
The user specifically mentioned "not showing both scenarios", indicating they want to see them separately, not merged into one view.

### Purchase Year Calculation
Currently using a simplified calculation based on:
- Base year: 2025
- Deposit requirements per property
- Annual savings rate

**Future Enhancement**: Could integrate with the full affordability engine for more accurate purchase timing, but this would require significant refactoring to run the engine outside the main dashboard context.

### Data Persistence
- Scenarios: Stored in Supabase `scenarios` table
- Property Assumptions: Stored in user's profile in Supabase
- Property Selections: Part of scenario data (JSON column)

## Files Modified

1. `/src/hooks/useAllClientScenarios.ts` - Complete rewrite to fetch from Supabase

