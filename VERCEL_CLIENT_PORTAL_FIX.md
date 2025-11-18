# Vercel Client Portal 404 Fix

## Problem
The client portal (`/client-view`) works locally but returns a 404 error when hosted on Vercel.

```
404: NOT_FOUND
Code: `NOT_FOUND`
ID: `sydl::lq25p-1763432155325-04e9468b7ab0`
```

## Root Cause
Your app is a **Single Page Application (SPA)** using React Router for client-side routing. Here's what happens:

### Local Development (Works ✅)
1. Vite dev server intercepts all routes
2. Always serves `index.html`
3. React Router handles routing in the browser
4. `/client-view` loads correctly

### Vercel Production (Fails ❌)
1. User visits `https://yourdomain.com/client-view`
2. Vercel looks for a file at `/client-view`
3. File doesn't exist → **404 error**
4. React Router never gets a chance to run

## The Solution
Created `vercel.json` to tell Vercel to serve `index.html` for all routes:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### How It Works
- **All routes** (`/*`) are rewritten to serve `index.html`
- The browser receives the React app
- React Router takes over and handles the route
- `/client-view` route renders correctly

## Deployment Steps

### 1. Commit the Changes
```bash
git add vercel.json
git commit -m "Add Vercel config to fix SPA routing for client portal"
git push
```

### 2. Vercel Will Auto-Deploy
Vercel automatically detects the new `vercel.json` and applies the configuration.

### 3. Test the Fix
After deployment completes:
1. Visit your client portal URL directly: `https://yourdomain.com/client-view?share_id=xxx`
2. Should now load correctly instead of 404

## Routes That Benefit From This Fix

All your app routes will now work when accessed directly:

- ✅ `/` - Landing page
- ✅ `/login` - Login page
- ✅ `/signup` - Signup page
- ✅ `/dashboard` - Dashboard
- ✅ `/clients` - Client scenarios
- ✅ `/data` - Data assumptions
- ✅ `/client-view` - **Client portal** (the main fix!)

## Technical Details

### What `rewrites` Does
- **Not a redirect**: The URL stays the same
- **Server-side**: Happens before the browser sees anything
- **Preserves query params**: `?share_id=xxx` is maintained

### Alternative: Using `routes` (Not Recommended)
```json
{
  "routes": [
    {
      "src": "/client-view",
      "dest": "/index.html"
    }
  ]
}
```
This only fixes one route. Using `rewrites` with `(.*)` fixes ALL routes.

## Verify It's Working

### Before Fix
```
curl https://yourdomain.com/client-view
→ 404: NOT_FOUND
```

### After Fix
```
curl https://yourdomain.com/client-view
→ 200: Returns index.html with React app
```

## Other Hosting Platforms

If you ever host elsewhere, here's the equivalent config:

### Netlify (`netlify.toml`)
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Netlify (`_redirects` file in `public/`)
```
/*    /index.html   200
```

### AWS S3 + CloudFront
Set error page for 404 to `/index.html` with 200 status code.

### Nginx
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Troubleshooting

### Issue: Still getting 404 after deploying
**Solution**: 
1. Check Vercel deployment logs
2. Ensure `vercel.json` is in the root directory
3. Clear Vercel build cache and redeploy

### Issue: Styles not loading
**Solution**: 
Check that your asset paths are relative or absolute from root:
```tsx
// Good
import './client-view.css'

// Also good
import '@/styles/client-view.css'
```

### Issue: Environment variables not working
**Solution**:
Add environment variables in Vercel dashboard:
- Project Settings → Environment Variables
- Add your Supabase URL, keys, etc.

## Summary

✅ **Fixed**: Client portal 404 error on Vercel  
✅ **Solution**: Added `vercel.json` with SPA rewrite rules  
✅ **Benefit**: All routes now work when accessed directly  
✅ **Action**: Commit and push to deploy the fix  

The client portal should now work perfectly on Vercel! 🎉

