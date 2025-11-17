# ✅ How to Generate Client Report Links

## Migration Applied Successfully! ✅

The database migration for `share_id` has been applied. You can now generate client report links.

---

## 🎯 How to Create a Shareable Link

### Step 1: Log In and Load a Scenario
1. Log in to your agent dashboard
2. Select a client from the client selector
3. Load an existing scenario OR create a new one

### Step 2: Save the Scenario
- Click the **Save button** (💾 disk icon) in the navbar
- Wait for "Scenario saved successfully" toast notification
- This is important - you must save before sharing!

### Step 3: Generate the Link
- Look for the **Share button** (🔗 icon) in the navbar
- It should appear right next to the Save button
- Click the Share button
- You'll see "Link Copied!" toast notification
- The shareable link is now in your clipboard

### Step 4: Share with Client
- Paste the link (Cmd+V / Ctrl+V) into:
  - An email to your client
  - A text message
  - Your CRM notes
  - Anywhere you communicate with clients

---

## 📱 What Your Client Sees

When a client opens the link:
1. **No login required** - They see the report immediately
2. **4 Professional Pages:**
   - **Cover Page:** Client name, agent name, company name, date
   - **At A Glance:** Investment goals and portfolio charts
   - **Property Timeline:** Step-by-step acquisition plan
   - **Strategy Pathway:** Portfolio overview and long-term outcome
3. **Navigation:** Arrow buttons to move between pages
4. **Download PDF:** Button to save the report as PDF

---

## 🔧 Troubleshooting

### "No share_id found in URL" Error
**Cause:** You're trying to access `/client-portal` directly instead of through a share link.

**Solution:** 
1. Go back to the agent dashboard
2. Load a client scenario
3. Click Save (💾)
4. Click Share (🔗)
5. Use the generated link

### Share Button Not Visible
**Possible reasons:**
- No client is selected
- Scenario hasn't been saved yet

**Solution:**
1. Make sure a client is selected in the dropdown
2. Click the Save button first
3. Share button should appear after save

### "Report Not Found" Error
**Possible reasons:**
- The share_id in the URL is invalid
- The scenario was deleted
- Database connection issue

**Solution:**
1. Generate a new link from the dashboard
2. Make sure the scenario still exists
3. Try the new link

---

## 💡 Tips

### Generate Link Only Once
- Once you generate a link for a scenario, it stays the same
- You can click Share multiple times - it will copy the same link
- This means the link is permanent and won't change

### Update Scenario After Sharing
- If you update a scenario and save it, the link stays the same
- Clients with the old link will see the updated data
- No need to generate a new link after updates

### Security
- Links are randomly generated (22+ characters)
- Hard to guess without knowing the exact URL
- Only scenarios with share links are publicly accessible
- You control which scenarios are shared

---

## 📊 Current Database Status

✅ **Migration Applied:** `share_id` column exists
✅ **Public Access Policy:** Configured correctly
✅ **Existing Scenarios:** 4 scenarios found
❗ **Action Needed:** Generate share links for scenarios you want to share

### Your Scenarios:
1. Robert Knowles's Scenario (Ben Appleton)
2. John Smith's Scenario
3. Toby Blue's Scenario
4. Rob Knowles's Scenario

None of these have share links yet. Load any of them and click Share to generate a link!

---

## 🎉 You're All Set!

The system is ready to use. Just:
1. Load a scenario
2. Save it
3. Click Share
4. Send the link to your client

**The client portal with dynamic data is now fully functional!** 🚀

