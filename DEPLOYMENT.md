# Synapse Note - Vercel Deployment Guide

## Environment Variables Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### Core Configuration
- `PORT` - Port number (default: 3000, automatically set by Vercel)
- `SESSION_SECRET` - Secret key for session encryption
- `NODE_ENV` - Environment (development/production)

#### Firebase Configuration
Choose one of the following options:

**Option 1: Service Account JSON (Recommended for Vercel)**
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
```

**Option 2: Service Account File Path (Local Development)**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
```

#### Additional Configuration
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `GEMINI_API_KEY` - Google AI API key for Gemini integration

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from template:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Start the development server:
```bash
npm run dev
```

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