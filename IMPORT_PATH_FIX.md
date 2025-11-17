# Import Path Fix - useSharedScenario

## Issue
The `useSharedScenario` hook had an incorrect import path for the Supabase client:

```typescript
// ❌ INCORRECT
import { supabase } from '../lib/supabase';
```

This caused a Vite error:
```
Failed to resolve import "../lib/supabase" from "src/hooks/useSharedScenario.ts". 
Does the file exist?
```

## Root Cause
The Supabase client is located at `src/integrations/supabase/client.ts`, not `src/lib/supabase`.

The correct project structure is:
```
src/
├── integrations/
│   └── supabase/
│       ├── client.ts       ← Supabase client is here
│       └── types.ts
├── lib/
│   └── utils.ts            ← Not here
└── hooks/
    └── useSharedScenario.ts
```

## Solution
Updated the import path in `src/hooks/useSharedScenario.ts`:

```typescript
// ✅ CORRECT
import { supabase } from '../integrations/supabase/client';
```

## Verification
- ✅ File exists at correct path
- ✅ Export is named correctly (`export const supabase`)
- ✅ No linter errors
- ✅ Import now resolves correctly

## Why It Seemed to "Self-Resolve"
The error might have appeared intermittently because:
1. Vite's hot module reload (HMR) sometimes shows errors temporarily
2. The dev server might have cached the module
3. Other files in the project use the correct import path, so Vite may have loaded the module from cache

However, the incorrect import would have caused issues when:
- Building for production
- Fresh development server starts
- Clearing Vite cache

## Status
✅ **Fixed and verified** - The import path is now correct and matches the actual file location in the project.

