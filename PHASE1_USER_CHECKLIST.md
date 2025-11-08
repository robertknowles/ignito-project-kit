# Phase 1 User Checklist

## Quick Verification (5 minutes)

Use this checklist to verify Phase 1 implementation is working correctly.

---

## ✅ Step 1: Check Files Exist

Run this command:
```bash
ls -la src/types/propertyInstance.ts \
       src/contexts/PropertyInstanceContext.tsx \
       src/utils/propertyInstanceDefaults.ts \
       src/data/property-defaults.json
```

**Expected:** All 4 files should exist

□ `src/types/propertyInstance.ts` exists  
□ `src/contexts/PropertyInstanceContext.tsx` exists  
□ `src/utils/propertyInstanceDefaults.ts` exists  
□ `src/data/property-defaults.json` exists  

---

## ✅ Step 2: Verify Build

Run this command:
```bash
npm run build
```

**Expected:** Build completes with no errors

□ Build completes successfully  
□ No TypeScript errors  
□ No "Cannot find module" errors  

---

## ✅ Step 3: Start Dev Server

Run this command:
```bash
npm run dev
```

**Expected:** Dev server starts with no errors

□ Server starts on port 5173 (or similar)  
□ No console errors in terminal  
□ App loads in browser  

---

## ✅ Step 4: Check Browser Console

Open browser console (F12) and navigate to:
- `/login` (or `/clients` if already logged in)
- Login/Navigate to `/dashboard`

**Expected:** No console errors

□ No red errors in console  
□ No "PropertyInstanceContext" errors  
□ No "Cannot import" errors  
□ App renders correctly  

---

## ✅ Step 5: Verify React Context

Open React DevTools → Components tab

Search for: `PropertyInstanceProvider`

**Expected:** Provider is present in component tree

□ PropertyInstanceProvider found  
□ Located above ScenarioSaveProvider  
□ Has `instances` state (may be empty)  

---

## ✅ Step 6: Test Property Defaults (Optional)

Open browser console on `/dashboard` page and run:

```javascript
// Test importing defaults
import('/src/data/property-defaults.json').then(data => {
  console.log('Property types:', Object.keys(data.default));
  console.log('Units fields:', Object.keys(data.default['units-apartments']).length);
});
```

**Expected Output:**
```
Property types: (8) ["units-apartments", "villas-townhouses", ...]
Units fields: 34
```

□ 8 property types loaded  
□ 34 fields per property type  

---

## ✅ Step 7: Verify Scenario Persistence

1. Navigate to `/clients`
2. Select a client
3. Navigate to `/dashboard`
4. Add a property to timeline
5. Click "Save Scenario"

**Expected:** Scenario saves without errors

□ Save completes successfully  
□ "Scenario Saved" toast appears  
□ No errors in browser console  
□ No errors in Network tab  

---

## ✅ Step 8: Check Supabase Data (Optional)

If you have Supabase access:

1. Open Supabase dashboard
2. Go to Table Editor → scenarios
3. Find your scenario
4. Expand the `data` field

**Expected:** propertyInstances field present

```json
{
  "propertySelections": {...},
  "investmentProfile": {...},
  "propertyInstances": {},  ← Should be here
  "lastSaved": "..."
}
```

□ `propertyInstances` field exists  
□ Field is an object (may be empty)  

---

## ✅ Step 9: Documentation Review

Check that all documentation files are present:

```bash
ls -la PHASE1_*.md
```

**Expected Files:**
1. PHASE1_IMPLEMENTATION_SUMMARY.md
2. PHASE1_ARCHITECTURE_DIAGRAM.md
3. PHASE1_VERIFICATION.md
4. PHASE1_QUICK_START.md
5. PHASE1_FINAL_TEST.md
6. PHASE1_USER_CHECKLIST.md (this file)

□ All 6 documentation files present  

---

## ✅ Step 10: Code Quality Check (Optional)

Run linter:
```bash
npm run lint
```

**Expected:** No errors in Phase 1 files

□ No linter errors  
□ Code style is consistent  

---

## Summary Checklist

### Core Files
- □ PropertyInstanceDetails interface created (34 fields)
- □ PropertyInstanceContext created (CRUD operations)
- □ Property defaults JSON created (8 types × 34 fields)
- □ Property defaults utility created
- □ ScenarioSaveContext updated (save/load/changes)
- □ DataAssumptionsContext extended (34 fields)
- □ PropertyInstanceProvider integrated into app

### Build & Tests
- □ TypeScript compilation successful
- □ No linter errors
- □ Dev server starts without errors
- □ App loads in browser
- □ No console errors

### Documentation
- □ Implementation summary
- □ Architecture diagrams
- □ Verification guide
- □ Quick start guide
- □ Final test results
- □ User checklist (this file)

---

## If Any Items Failed

### TypeScript Errors
1. Run `npm install` to ensure all dependencies are installed
2. Check that all imports are correct
3. Verify file paths match exactly

### Console Errors
1. Check browser console for specific error message
2. Verify PropertyInstanceProvider is in provider tree
3. Ensure all contexts are properly imported

### Build Errors
1. Clear build cache: `rm -rf dist`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Rebuild: `npm run build`

### Still Having Issues?
Refer to:
- `PHASE1_VERIFICATION.md` for detailed troubleshooting
- `PHASE1_QUICK_START.md` for usage examples
- `PHASE1_ARCHITECTURE_DIAGRAM.md` for system overview

---

## Success Criteria

**Phase 1 is complete when:**

✅ All checkboxes above are checked  
✅ App builds and runs without errors  
✅ PropertyInstanceContext is available in components  
✅ Property defaults load correctly  
✅ Scenarios save/load with propertyInstances field  

---

## Next Steps

Once all items are verified:

1. ✅ Phase 1 Complete
2. 🚀 Ready for Phase 2: Timeline Integration
   - Add "Edit" button to property blocks
   - Create PropertyInstanceModal component
   - Wire up instance creation
   - Display instance values

---

## Verification Date

Date completed: _______________

Verified by: _______________

Notes:
_________________________________
_________________________________
_________________________________

---

**Phase 1 Status:** □ Complete ✅

**Ready for Phase 2:** □ Yes 🚀


