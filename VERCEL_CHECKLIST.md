# Vercel Deployment Checklist

## Pre-deployment Setup ✅

### Local Development
- [ ] Copy `.env.example` to `.env`
- [ ] Configure all required environment variables:
  - [ ] `SESSION_SECRET` (strong random string)
  - [ ] `FIREBASE_PROJECT_ID` (your Firebase project ID)
  - [ ] `GEMINI_API_KEY` (Google AI API key)
  - [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] Run `npm run validate-env` to verify configuration
- [ ] Test locally with `npm run dev`

### Firebase Setup
- [ ] Create Firebase project
- [ ] Enable Firestore database
- [ ] Generate service account key (JSON file)
- [ ] Configure Firestore security rules
- [ ] Test Firebase connection locally

### Google AI Setup
- [ ] Enable Google AI/Gemini API
- [ ] Generate API key
- [ ] Test API key with your application

## Vercel Deployment ✅

### Repository Setup
- [ ] Push all changes to your GitHub repository
- [ ] Ensure `vercel.json` is present in root directory
- [ ] Verify `.gitignore` excludes sensitive files

### Vercel Configuration
- [ ] Connect repository to Vercel
- [ ] Configure environment variables in Vercel dashboard:
  ```
  SESSION_SECRET=your-secure-session-secret
  NODE_ENV=production
  FIREBASE_PROJECT_ID=your-firebase-project-id
  GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
  GEMINI_API_KEY=your-gemini-api-key
  ```
- [ ] Deploy application
- [ ] Test deployed application functionality

### Post-deployment Verification
- [ ] Verify application loads correctly
- [ ] Test user registration/login
- [ ] Test quiz creation (AI features)
- [ ] Test database operations (save/load data)
- [ ] Check Vercel function logs for errors

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SESSION_SECRET` | ✅ | Session encryption key | `your-super-secret-key-here` |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID | `synapse-note-12345` |
| `GEMINI_API_KEY` | ✅ | Google AI API key | `AIzaSy...` |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | ✅* | Service account JSON (as string) | `{"type":"service_account",...}` |
| `NODE_ENV` | ⚠️ | Environment mode | `production` (auto-set by Vercel) |
| `PORT` | ⚠️ | Server port | `3000` (auto-set by Vercel) |

*Required for production deployment. Use `GOOGLE_APPLICATION_CREDENTIALS` for local development with file path.

## Troubleshooting

### Common Issues
1. **"Firebase Admin SDK initialization failed"**
   - Check `GOOGLE_APPLICATION_CREDENTIALS_JSON` format
   - Verify service account permissions

2. **"Session secret required"**
   - Ensure `SESSION_SECRET` is set in Vercel environment variables

3. **"AI features unavailable"**
   - Verify `GEMINI_API_KEY` is correctly set
   - Check API quota and billing

4. **Database connection issues**
   - Verify Firestore permissions
   - Check Firebase project ID

### Getting Help
- Check Vercel function logs in the dashboard
- Use `npm run validate-env` for configuration issues
- Review `DEPLOYMENT.md` for detailed setup instructions