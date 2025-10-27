# Scenario Switching Debug Guide

## Issue
Scenario switching using the dropdown in the navbar only works on the `/clients` page, not on the `/dashboard` page.

## Changes Made

### 1. Disabled Auto-Loading in PropertySelectionContext
**File**: `src/contexts/PropertySelectionContext.tsx`
- Removed automatic localStorage loading when client changes
- This prevents conflicts between context auto-loading and coordinated scenario loading

### 2. Added Manual Load Method
**File**: `src/contexts/PropertySelectionContext.tsx`
- Added `loadClientData(clientId: number)` method to PropertySelectionContext
- This method loads all property-related data: selections, pause blocks, loan types, custom blocks
- Uses `setTimeout` to prevent React batching issues

### 3. Updated Client Switching Hook
**File**: `src/hooks/useClientSwitching.ts`
- Calls the new `loadClientData` method when client changes
- Added comprehensive logging to track:
  - When the effect triggers
  - What client is being loaded
  - Current pathname (to see which page you're on)
  - Selection changes

## How to Test

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open your browser console** (F12 or Cmd+Option+I)

3. **Test on /clients page**:
   - Navigate to http://localhost:5173/clients
   - Open dropdown, select a different client
   - Check console for logs starting with `useClientSwitching:` and `PropertySelectionContext:`
   - Verify the page updates with the new client's data

4. **Test on /dashboard page**:
   - Navigate to http://localhost:5173/dashboard
   - Open dropdown, select a different client
   - Check console for the same logs
   - **THIS IS WHERE THE ISSUE SHOULD BE**

## What to Look For in Console

### Expected Log Sequence (when switching clients):

```
useClientSwitching: Effect triggered
  {pathname: "/dashboard", activeClientId: 123, activeClientName: "Client A", lastLoaded: null, shouldLoad: true}

useClientSwitching: Client changed, loading new data for: 123 on path: /dashboard

PropertySelectionContext: Loading data for client 123
PropertySelectionContext: localStorage key: property_selections_123
PropertySelectionContext: stored data: {...}
PropertySelectionContext: Loaded selections {...}
PropertySelectionContext: Finished loading client data for client 123

useClientSwitching: selections updated
  {pathname: "/dashboard", selections: {...}, activeClientId: 123}
```

## Potential Issues to Check

### Issue 1: LoadClientData Not Being Called
- **Symptom**: You see "Effect triggered" but not "Client changed, loading new data"
- **Cause**: `lastLoadedClientRef` might already match `activeClient.id`
- **Fix**: Check if the ref is being set correctly

### Issue 2: Data Not in localStorage
- **Symptom**: You see "No selections found, reset to empty"
- **Cause**: Client data hasn't been saved yet
- **Fix**: On the working page, make some changes and save, then test switching

### Issue 3: Context Not Re-rendering
- **Symptom**: Data loads in console but Dashboard doesn't update
- **Cause**: Dashboard might not be subscribed to the right context values
- **Fix**: Check if Dashboard uses `usePropertySelection()` correctly

### Issue 4: Dropdown Not Working at All
- **Symptom**: Clicking dropdown doesn't select the client
- **Cause**: Click event might be blocked or z-index issue
- **Fix**: Check if dropdown is visible and clickable

## Additional Debugging Steps

### 1. Check localStorage manually:
Open console and run:
```javascript
// List all client-related keys
Object.keys(localStorage).filter(k => k.includes('property_selections'))

// Check specific client data (replace 123 with your client ID)
JSON.parse(localStorage.getItem('property_selections_123'))
```

### 2. Force re-render:
Add a key prop to Dashboard in App.tsx to force remount:
```tsx
<Dashboard key={activeClient?.id} />
```

### 3. Check if ClientSelector is triggering setActiveClient:
Add a log in ClientSelector.tsx in the `handleClientSelect` function:
```typescript
const handleClientSelect = (client: typeof activeClient) => {
  console.log('ClientSelector: Switching to client', client);
  setActiveClient(client);
  setDropdownOpen(false);
};
```

## Quick Fix to Try

If the above doesn't work, try adding a key to the Dashboard in App.tsx to force it to remount when the client changes:

```tsx
// In src/App.tsx
import { useClient } from './contexts/ClientContext';

export function App() {
  const { activeClient } = useClient();
  
  return (
    <div className="flex flex-col h-screen w-full bg-[#f9fafb] font-sans">
      <Navbar />
      <div className="flex-1 overflow-hidden pb-8 px-8">
        <div className="bg-white rounded-lg h-full overflow-auto shadow-sm">
          <Dashboard key={activeClient?.id} />
        </div>
      </div>
    </div>
  );
}
```

This will force Dashboard to completely remount when switching clients, which should definitely trigger a re-render.

