# Synapse Note - Firebase Cloud Deployment Guide

This application is designed to run exclusively in Firebase/Vercel serverless environments.

## Environment Variables Setup

### Required Environment Variables

Configure the following variables in your cloud deployment platform:

#### Core Configuration
- `SESSION_SECRET` - Secret key for session encryption (generate a secure random string)
- `NODE_ENV` - Set to `production` for cloud deployment

#### Firebase Configuration (Required)
**Service Account JSON (Required for Cloud Deployment)**
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
```

#### Additional Configuration
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `GEMINI_API_KEY` - Google AI API key for Gemini integration

#### Optional Configuration
- `GOOGLE_APPS_SCRIPT_URL` - External API integration URL
- `USE_GOOGLE_APPS_SCRIPT` - Enable/disable Google Apps Script integration (default: true)

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database
3. Create a service account:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Copy the entire JSON content for `GOOGLE_APPLICATION_CREDENTIALS_JSON`

## Vercel Deployment

### Prerequisites
- Vercel account
- Firebase project with service account key
- Google AI API key (for Gemini features)

### Deployment Steps

1. **Connect Repository to Vercel**
   - Import your repository in Vercel dashboard
   - Or use Vercel CLI: `vercel --prod`

2. **Configure Environment Variables in Vercel**
   
   In your Vercel project settings, add these environment variables:
   
   ```
   SESSION_SECRET=your-secure-session-secret
   NODE_ENV=production
   FIREBASE_PROJECT_ID=your-firebase-project-id
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Firebase Service Account Setup**
   
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate a new private key (JSON file)
   - Copy the entire JSON content as a single line
   - Paste it as the value for `GOOGLE_APPLICATION_CREDENTIALS_JSON`

4. **Deploy**
   
   Vercel will automatically deploy when you push to your connected branch.

### Vercel Configuration

The project includes `vercel.json` with the following configuration:
- Uses `@vercel/node` runtime
- Routes all requests to `server.js`
- Sets maximum function duration to 30 seconds
- Automatically sets `NODE_ENV=production`

## Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**
   - Ensure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is properly formatted JSON
   - Verify Firebase project permissions
   - Check service account key validity

2. **Session Storage Issues**
   - Verify Firestore permissions for the service account
   - Ensure session secret is properly set

3. **API Rate Limits**
   - Check Gemini API quota and limits
   - Verify API key permissions

### Environment Variables Validation

The application will validate required environment variables on startup:
- `SESSION_SECRET` - Required for session management
- Firebase credentials - Required for database access
- `GEMINI_API_KEY` - Required for AI features

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique session secrets
- Rotate API keys regularly
- Restrict Firebase service account permissions to minimum required