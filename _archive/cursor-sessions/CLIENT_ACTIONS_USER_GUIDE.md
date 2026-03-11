# Client Actions User Guide

## How to Rename or Delete Clients

This guide shows you how to use the new client management features in the Client Portfolio section.

## Location

Navigate to the **Client Scenarios** page (accessible from the home icon in the navbar).

In the **Client Portfolio** table, you'll see three buttons in the **Actions** column for each client:
- **View** - Opens the client's scenario
- **Download** - Generates a PDF report
- **⋯** (three dots) - Opens the actions menu 👈 **NEW!**

## Renaming a Client

### Step-by-Step:

1. **Open the Actions Menu**
   ```
   Click the three-dot button (⋯) in the Actions column
   ```

2. **Select Rename**
   ```
   Click "Rename Client" (shows pencil icon)
   ```

3. **Enter New Name**
   ```
   - A dialog box will appear
   - The current name will be pre-filled
   - Type the new name
   - Press Enter or click "Rename"
   ```

4. **Confirmation**
   ```
   - A success message will appear: "Client renamed successfully!"
   - The new name will appear immediately throughout the application
   - The client selector in the navbar will also update
   ```

### What Gets Updated:
- Client name in the portfolio table
- Client name in the navigation dropdown
- Client name in all reports and documents
- Active client display (if it's the current client)

## Deleting a Client

### ⚠️ WARNING
Deleting a client is **permanent** and cannot be undone. This will delete:
- The client record
- All scenarios for that client
- All properties in those scenarios
- All financial projections
- All timeline data

### Step-by-Step:

1. **Open the Actions Menu**
   ```
   Click the three-dot button (⋯) in the Actions column
   ```

2. **Select Delete**
   ```
   Click "Delete Client" (shows in red with trash icon)
   ```

3. **Read the Warning**
   ```
   A confirmation dialog will appear explaining:
   - This action cannot be undone
   - All associated data will be permanently deleted
   - Including properties, scenarios, and financial projections
   ```

4. **Confirm Deletion**
   ```
   - Click "Delete" (red button) to confirm
   - Or click "Cancel" to abort
   ```

5. **Confirmation**
   ```
   - A success message will appear: "Client deleted successfully!"
   - The client will be removed from the list immediately
   - If you were viewing this client, another client will be selected automatically
   ```

### What Happens After Deletion:
- Client is removed from the portfolio table
- All scenarios are deleted from the database
- If the client was active:
  - The first remaining client becomes active
  - Or no client is selected if none remain
- The planning calendar updates to remove that client's timeline

## Tips and Best Practices

### Before Renaming:
- ✅ Make sure the new name is descriptive and unique
- ✅ Consider including the client's full name
- ✅ Use consistent naming conventions

### Before Deleting:
- ⚠️ **BACKUP FIRST**: Download the client's PDF report as a backup
- ⚠️ Double-check you're deleting the correct client
- ⚠️ Consider if you might need this data in the future
- ⚠️ Remember: deletion is permanent and irreversible

### Keyboard Shortcuts:
- **Rename Dialog**: Press `Enter` to confirm the new name
- **Rename Dialog**: Press `Escape` to cancel
- **Delete Dialog**: Must click buttons (no keyboard shortcuts for safety)

## Troubleshooting

### Rename Failed
If you see "Failed to rename client":
- Check your internet connection
- Make sure the name isn't empty
- Try refreshing the page and trying again

### Delete Failed  
If you see "Failed to delete client":
- Check your internet connection
- Make sure you have permission to delete this client
- Try refreshing the page and trying again
- Contact support if the issue persists

### Menu Not Opening
If the three-dot menu doesn't open:
- Try clicking directly on the three-dot icon
- Refresh the page
- Check if you're logged in

## Visual Layout

```
Client Portfolio Table
┌─────────────────────────────────────────────────────────────────┐
│ Client          │ Next Purchase │ Created    │ Actions          │
├─────────────────────────────────────────────────────────────────┤
│ 👤 John Smith   │ Active        │ 10/15/2024 │ [View] [Download] [⋯] │
│    Client ID: 1 │ scenario      │            │                  │
│                 │               │            │    ↓ (click)     │
│                 │               │            │  ┌───────────────┐│
│                 │               │            │  │ ✏️ Rename     ││
│                 │               │            │  │────────────   ││
│                 │               │            │  │ 🗑️ Delete     ││
│                 │               │            │  └───────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Permissions

You can only rename or delete clients that you created. The system enforces:
- Row Level Security (RLS) on the database
- User authentication checks
- Ownership verification

## Questions?

If you need help or have questions about these features:
1. Check this guide first
2. Try the action in a test environment if available
3. Contact your system administrator
4. Report bugs through the appropriate channels

