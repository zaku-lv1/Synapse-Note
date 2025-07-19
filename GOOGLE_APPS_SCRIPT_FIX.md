# Google Apps Script Redirect Issue Fix

## Problem Description

The API endpoints `/api/public/users/count` and `/api/public/quizzes/count` were returning incorrect responses containing HTML redirect messages instead of actual count data:

```json
{
  "success": true,
  "data": {
    "message": "\n\n\n\n\n\n
Moved Temporarily
\nThe document has moved here.\n\n\n"
  },
  "source": "google-apps-script",
  "timestamp": "2025-07-19T18:36:03.845Z"
}
```

## Root Cause

1. **Google Apps Script URL issue**: The configured Google Apps Script endpoint was returning HTML redirect pages instead of JSON responses
2. **Poor error handling**: The service was wrapping HTML responses in JSON format instead of detecting and rejecting them
3. **No proper fallback**: When Google Apps Script failed, the system didn't gracefully fall back to the local database

## Solution Implemented

### 1. Enhanced Response Validation (`googleAppsScriptService.js`)

Added proper detection of HTML redirect responses:

```javascript
// Check if response is HTML (redirect page) instead of JSON
const trimmedBody = body.trim();
const isHtml = trimmedBody.toLowerCase().includes('<html') || 
              trimmedBody.toLowerCase().includes('<!doctype') ||
              trimmedBody.toLowerCase().includes('moved temporarily') ||
              trimmedBody.toLowerCase().includes('moved permanently');

if (isHtml || res.statusCode >= 300) {
    // This is likely a redirect page or error page, not valid JSON
    reject(new Error(`Google Apps Script returned invalid response: ${res.statusCode} ${trimmedBody.substring(0, 100)}...`));
    return;
}
```

### 2. Improved API Error Handling (`api.js`)

Modified all public API endpoints to:

- Remove dependency on `requireDatabase` middleware
- Implement graceful fallback logic
- Provide informative error messages
- Distinguish between Google Apps Script disabled vs failed

```javascript
// Fallback to local database
const db = getDb();
if (!db) {
    const errorMessage = useGoogleAppsScript 
        ? 'Database not available and Google Apps Script failed'
        : 'Database not available and Google Apps Script is disabled';
    return res.status(503).json({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
    });
}
```

### 3. Better Error Messages

The system now provides clear error messages that help diagnose the issue:

- **When Google Apps Script is disabled**: `"Database not available and Google Apps Script is disabled"`
- **When Google Apps Script fails**: `"Database not available and Google Apps Script failed"`

## Expected Behavior

### With Working Database and Google Apps Script
```json
{
  "success": true,
  "data": {
    "count": 42,
    "generatedAt": "2025-07-19T18:51:32.783Z"
  },
  "source": "google-apps-script",
  "timestamp": "2025-07-19T18:51:32.783Z"
}
```

### With Working Database Only (Google Apps Script fails)
```json
{
  "success": true,
  "data": {
    "count": 42,
    "generatedAt": "2025-07-19T18:51:32.783Z"
  },
  "source": "local-database",
  "timestamp": "2025-07-19T18:51:32.783Z"
}
```

### With Neither Working
```json
{
  "success": false,
  "error": "Database not available and Google Apps Script failed",
  "timestamp": "2025-07-19T18:51:32.783Z"
}
```

## Testing

A test script was created to validate the fix:

```bash
node /tmp/test-google-apps-script-fix.js
```

**Test Results**: ✅ All tests passed

## Files Modified

1. **`/services/googleAppsScriptService.js`**: Enhanced response validation
2. **`/routes/api.js`**: Improved error handling for three endpoints:
   - `GET /api/public/stats`
   - `GET /api/public/users/count`
   - `GET /api/public/quizzes/count`

## Configuration

The behavior can be controlled via environment variables:

```env
# Enable/disable Google Apps Script integration
USE_GOOGLE_APPS_SCRIPT=true

# Google Apps Script endpoint URL
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

## Impact

- ✅ **Fixed**: API endpoints no longer return "Moved Temporarily" messages
- ✅ **Improved**: Better error handling and fallback mechanisms  
- ✅ **Enhanced**: More informative error messages for debugging
- ✅ **Maintained**: Backward compatibility with existing API contracts
- ✅ **Robust**: System gracefully handles various failure scenarios