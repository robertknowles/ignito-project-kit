# Scenario Switching Fix - Dashboard Page

## Problem
The scenario dropdown in the navbar wasn't working on the `/dashboard` page. It worked fine on `/clients` and `/data` pages, but when on the dashboard, selecting a different client from the dropdown didn't update the displayed data.

## Root Cause Analysis

The issue had multiple contributing factors:

### 1. **Conflicting Data Loading Systems**
- `PropertySelectionContext` had its own `useEffect` that auto-loaded data from localStorage whenever the `activeClient.id` changed
- `useClientSwitching` hook was trying to coordinate scenario loading
- These two systems were fighting each other, causing race conditions and inconsistent state

### 2. **Component Re-rendering Issue**
- The Dashboard component wasn't being forced to re-render when the client changed
- Even though context state was updating, React wasn't always triggering a full re-render of the Dashboard
- This is because the Dashboard's local state (like `accordian` and `activeTab`) was persisting even when the underlying data changed

## Solution Implemented

### Part 1: Centralize Data Loading Control

**File: `src/contexts/PropertySelectionContext.tsx`**

1. **Disabled Auto-Loading**:
   - Removed the automatic `useEffect` that loaded from localStorage on client change
   - This prevents the context from loading data independently

2. **Added Manual Load Method**:
   ```typescript
   loadClientData: (clientId: number) => void;
   ```
   - Provides explicit control over when data is loaded
   - Loads all property-related data: selections, pause blocks, loan types, custom blocks
   - Uses `setTimeout` to prevent React batching issues
   - Includes comprehensive logging for debugging

### Part 2: Coordinate Loading Through Hook

**File: `src/hooks/useClientSwitching.ts`**

1. **Updated to use new load method**:
   - Calls `loadClientData` from PropertySelectionContext
   - Tracks last loaded client to prevent unnecessary reloads
   
2. **Added debugging logs**:
   - Logs when effect triggers
   - Shows current pathname (to identify which page you're on)
   - Tracks selection changes
   - Helps identify where the flow breaks

### Part 3: Force Dashboard Re-mount (KEY FIX!)

**File: `src/App.tsx`**

Added a `key` prop to the Dashboard component:

```tsx
<Dashboard key={activeClient?.id || 'no-client'} />
```

**Why this works**:
- React uses the `key` prop to identify component instances
- When the key changes, React unmounts the old component and mounts a new one
- This forces a complete re-render with fresh state
- Ensures the Dashboard starts with clean state when switching clients

## Files Modified

1. `src/contexts/PropertySelectionContext.tsx`
   - Disabled auto-loading
   - Added `loadClientData` method
   - Added comprehensive logging

2. `src/hooks/useClientSwitching.ts`
   - Simplified to use new load method
   - Added logging for debugging
   - Added location tracking

3. `src/App.tsx`
   - Added `useClient` hook
   - Added `key` prop to Dashboard component

## Testing

### Before Testing
1. Make sure you have at least 2 clients with different data
2. Open browser console (F12) to see detailed logs
3. Run: `npm run dev`

### Test Steps

1. **Go to /clients page**:
   - Select Client A from dropdown
   - Make some property selections
   - Navigate to /dashboard
   - Verify Client A's data is showing

2. **Switch to Client B on /dashboard**:
   - Open the dropdown in navbar
   - Select Client B
   - **Dashboard should immediately update** with Client B's data
   - Check console for logs confirming data load

3. **Switch back to Client A**:
   - Select Client A from dropdown
   - Dashboard should show Client A's data again

4. **Test on other pages**:
   - Try switching on /data page (should still work)
   - Try switching on /clients page (should still work)

### Console Logs to Expect

When switching clients, you should see:
```
useClientSwitching: Effect triggered {pathname: "/dashboard", activeClientId: 2, ...}
useClientSwitching: Client changed, loading new data for: 2 on path: /dashboard
PropertySelectionContext: Loading data for client 2
PropertySelectionContext: localStorage key: property_selections_2
PropertySelectionContext: Loaded selections {...}
PropertySelectionContext: Finished loading client data for client 2
useClientSwitching: selections updated {...}
```

## Why This Solution Works

1. **Centralized Control**: All data loading goes through one path (useClientSwitching hook)
2. **No Conflicts**: Disabled auto-loading prevents race conditions
3. **Explicit Loading**: We control exactly when and how data loads
4. **Forced Re-render**: The key prop ensures Dashboard fully resets on client change
5. **Debugging**: Comprehensive logs help identify any future issues

## Performance Considerations

The `key` prop forces a complete remount, which means:
- ✅ **Pro**: Guarantees fresh state and correct data
- ✅ **Pro**: Prevents stale state bugs
- ⚠️ **Con**: Slightly more expensive than a simple re-render
- ✅ **Verdict**: Acceptable trade-off for correctness

The Dashboard isn't a heavy component, so the remount cost is negligible.

## Troubleshooting

If the issue persists, check:

1. **LocalStorage has data**:
   ```javascript
   Object.keys(localStorage).filter(k => k.includes('property_selections'))
   ```

2. **ClientSelector is calling setActiveClient**:
   - Add a console.log in `ClientSelector.tsx` `handleClientSelect` function

3. **Context provider order**:
   - Check `AppRouter.tsx` - ClientProvider should wrap PropertySelectionProvider

4. **Browser cache**:
   - Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
   - Or clear localStorage: `localStorage.clear()`

## Future Improvements

Consider:
1. Moving all context data to a unified scenario storage system
2. Adding React Query or similar for better state management
3. Implementing optimistic updates for better UX
4. Adding loading states during client switches

