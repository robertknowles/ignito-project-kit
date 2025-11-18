# 🚨 ACTION REQUIRED: Apply Database Migration

## ⚠️ Important: Read This First

The public shareable report links feature is **fully implemented** in code, but you need to apply a database migration before it will work.

**Time Required:** 2 minutes  
**Difficulty:** Easy (copy and paste SQL)

---

## 🎯 Quick Start (Copy This SQL)

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL below
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
7. Done! ✅

---

## 📋 SQL to Run

```sql
-- Add share_id column to scenarios table
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_scenarios_share_id 
ON public.scenarios(share_id);

-- Add comment
COMMENT ON COLUMN public.scenarios.share_id IS 'Unique shareable ID for public report access';

-- Allow public read access to scenarios with share_id
CREATE POLICY "Public read access for shared scenarios"
ON public.scenarios
FOR SELECT
TO anon
USING (share_id IS NOT NULL);
```

---

## ✅ Verify It Worked

After running the SQL, verify the migration worked:

### Method 1: Check Column Exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scenarios' 
AND column_name = 'share_id';
```

**Expected Result:**
```
column_name | data_type
------------|----------
share_id    | text
```

### Method 2: Check Policy Exists
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'scenarios' 
AND policyname = 'Public read access for shared scenarios';
```

**Expected Result:**
```
policyname
-------------------------------------
Public read access for shared scenarios
```

---

## 🧪 Test the Feature

Once migration is applied:

### Step 1: Generate a Link
1. Log in to your agent dashboard
2. Load or create a scenario
3. Click **Save** button (💾 icon)
4. Click **Share** button (🔗 icon)
5. You should see: "Link Copied!" toast notification

### Step 2: View the Report
1. Paste the link in your browser
2. Open in incognito/private window (to test without login)
3. Report should load immediately
4. Navigate through all 4 pages
5. Test PDF download

---

## 🚨 Troubleshooting

### "Column already exists" Error
This is **SAFE** to ignore. The `IF NOT EXISTS` clause prevents errors if the column already exists.

### "Policy already exists" Error
This is **SAFE** to ignore. You can safely re-run the migration.

### "Permission denied" Error
Make sure you're running the SQL as a database admin in your Supabase project.

### Share Button Not Appearing
- Make sure you saved the scenario first
- Check browser console for errors
- Verify the migration was applied successfully

### Link Doesn't Work (404 or Auth Required)
- Verify the RLS policy was created
- Check that the route was added to AppRouter.tsx
- Inspect the database to see if share_id was saved

---

## 📁 Alternative: Use Migration File

If you prefer, you can use the migration file directly:

**File Location:**
```
supabase/migrations/20251117120000_add_share_id_to_scenarios.sql
```

**Using Supabase CLI:**
```bash
cd /Users/robknowles/Documents/Cursor-Repos/ignito-project-kit
supabase db push
```

---

## 🎉 After Migration

Once the migration is applied, the feature is **100% ready to use**!

### What You Can Do:
✅ Generate shareable links for any scenario  
✅ Share links with clients via email/SMS  
✅ Recipients view reports without login  
✅ Professional Magic Patterns design  
✅ PDF download works  

### What's Changed:
- New Share button (🔗) in navbar
- Public route: `/report/{shareId}`
- Database: `share_id` column in scenarios table

---

## 📚 More Information

- **Implementation Details:** See `PUBLIC_SHAREABLE_REPORT_IMPLEMENTATION.md`
- **Quick Start Guide:** See `PUBLIC_SHAREABLE_REPORT_QUICK_START.md`
- **Visual Guide:** See `PUBLIC_SHAREABLE_REPORT_VISUAL_GUIDE.md`
- **Complete Summary:** See `PUBLIC_SHAREABLE_REPORT_FINAL_SUMMARY.md`

---

## ✅ Checklist

Before testing:
- [ ] SQL migration applied in Supabase
- [ ] Verified column exists
- [ ] Verified RLS policy exists

Testing:
- [ ] Share button appears after saving
- [ ] Click share generates link
- [ ] Toast notification appears
- [ ] Link copied to clipboard
- [ ] Link works in incognito window
- [ ] Report loads without login
- [ ] All 4 pages accessible
- [ ] PDF download works

---

## 🚀 Ready to Go!

That's it! Apply the migration and you're ready to share beautiful reports with your clients.

**Estimated Time:** 2 minutes  
**Difficulty:** Easy  
**Impact:** High (game-changing feature!)

---

*Need help? Check the troubleshooting section above or review the detailed documentation files.*


