# PWA Update Fix

## Problem
PWA apps were not updating to the latest version automatically. Users had to manually clear cache or wait too long for updates.

## Solution
Improved the update checking mechanism to be more aggressive and responsive.

### Changes Made

1. **More Frequent Update Checks**
   - Reduced interval from 6 hours to 1 hour
   - Added immediate check on app startup (after 2 seconds)
   - Added check when app becomes visible (user switches back to app)
   - Added check when window gains focus

2. **Better Cache Control**
   - Added `no-cache, no-store, must-revalidate` headers for `ngsw-worker.js`
   - Added cache control for `ngsw.json` (service worker manifest)
   - Ensures service worker files are never cached

3. **Improved Update Detection**
   - Checks happen on multiple triggers (startup, focus, visibility change, hourly)
   - Update banner will appear when new version is detected

## How Updates Work Now

1. **On App Startup**: Checks for updates 2 seconds after app stabilizes
2. **Every Hour**: Automatically checks for new versions
3. **On App Focus**: When user switches back to the app, checks for updates
4. **On Visibility Change**: When app becomes visible again, checks for updates

## For Users (How to Force Update)

If your PWA is still showing an old version:

### Option 1: Wait for Automatic Update
- The app will check for updates automatically
- A banner will appear saying "Mise à jour disponible"
- Click "Mettre à jour" to apply the update

### Option 2: Manual Update (iOS Safari)
1. Open Safari Settings
2. Go to Advanced → Website Data
3. Search for your domain (e.g., "finova-app.netlify.app")
4. Delete the website data
5. Close and reopen the PWA

### Option 3: Manual Update (Android Chrome)
1. Open Chrome Settings
2. Go to Site Settings → Storage
3. Find your site and click "Clear & reset"
4. Close and reopen the PWA

### Option 4: Reinstall PWA
1. Delete the PWA from your home screen
2. Visit the website in browser
3. Reinstall the PWA
4. This will get the latest version

### Option 5: Hard Refresh (Browser)
1. Open the PWA in browser
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. This bypasses cache and loads fresh version

## For Developers

### Testing Updates Locally

1. Build the app:
   ```bash
   npm run build
   ```

2. Serve with http-server:
   ```bash
   npx http-server dist/sakai-ng -p 8080
   ```

3. Make a change and rebuild
4. The service worker should detect the change and prompt for update

### Verifying Update Mechanism

1. Open browser DevTools
2. Go to Application → Service Workers
3. Check "Update on reload" to force updates
4. Check console for update messages

### Deployment Notes

- After deploying a new version, the service worker will detect it
- Users will see the update banner within 1 hour (or immediately on next app open)
- The update is applied when user clicks "Mettre à jour"
- App will reload automatically after update is applied

## Technical Details

### Update Check Flow

```
App Startup → Wait 2s → Check for Update
     ↓
App Visible → Check for Update
     ↓
Window Focus → Check for Update
     ↓
Every Hour → Check for Update
```

### Service Worker Files (Never Cached)

- `/ngsw-worker.js` - Service worker script
- `/ngsw.json` - Service worker manifest
- Both have `no-cache, no-store, must-revalidate` headers

### Update Detection

When a new version is detected:
1. `SwUpdate.checkForUpdate()` returns `true`
2. `versionUpdates` observable emits `VERSION_READY` event
3. `updateAvailable` flag is set to `true`
4. Update banner appears in UI
5. User clicks "Mettre à jour"
6. `SwUpdate.activateUpdate()` is called
7. Page reloads with new version

