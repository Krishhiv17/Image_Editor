# Google OAuth Setup Guide

Complete guide to set up Google OAuth for the Photo Editor application.

---

## Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account

---

## Step 2: Create a New Project (or Select Existing)

### Option A: Create New Project

1. Click on the **project dropdown** at the top (next to "Google Cloud")
2. Click **"NEW PROJECT"**
3. Enter project details:
   - **Project name**: `Photo Editor App` (or any name you like)
   - **Location**: Leave as default or select your organization
4. Click **"CREATE"**
5. Wait for project creation (takes ~30 seconds)
6. Select the new project from the dropdown

### Option B: Use Existing Project

1. Click on the project dropdown
2. Select your existing project

---

## Step 3: Enable Google+ API (Required for OAuth)

1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. In the search bar, type: `Google+ API`
3. Click on **"Google+ API"**
4. Click **"ENABLE"** button
5. Wait for it to enable (~10 seconds)

**Alternative (Recommended):**
1. Search for: `Google Identity`
2. Enable **"Google Identity Toolkit API"** or **"Identity Platform"**

---

## Step 4: Configure OAuth Consent Screen

1. Go to **"APIs & Services" → "OAuth consent screen"** (left sidebar)

### 4.1 Choose User Type

- **Internal**: Only for Google Workspace users (not recommended unless you have Workspace)
- **External**: For anyone with a Google account ✅ **SELECT THIS**

Click **"CREATE"**

### 4.2 App Information

Fill in the required fields:

**App information:**
- **App name**: `Photo Editor` (or your preferred name)
- **User support email**: Your email address (select from dropdown)

**App domain** (Optional - can skip for development):
- **Application home page**: `http://localhost:3000`
- **Application privacy policy link**: (skip for now)
- **Application terms of service link**: (skip for now)

**Authorized domains** (Optional):
- If deploying to Azure later, add: `azurewebsites.net` or your domain

**Developer contact information:**
- **Email addresses**: Your email address

Click **"SAVE AND CONTINUE"**

### 4.3 Scopes

1. Click **"ADD OR REMOVE SCOPES"**
2. Select these scopes (filter by typing):
   - ✅ `./auth/userinfo.email` - See your primary Google Account email address
   - ✅ `./auth/userinfo.profile` - See your personal info
   - ✅ `openid` - Associate you with your personal info on Google
3. Click **"UPDATE"**
4. Click **"SAVE AND CONTINUE"**

### 4.4 Test Users (for External/Testing mode)

While in "Testing" mode, only these users can sign in:

1. Click **"+ ADD USERS"**
2. Enter email addresses (your own email and any testers)
3. Click **"ADD"**
4. Click **"SAVE AND CONTINUE"**

### 4.5 Summary

- Review everything
- Click **"BACK TO DASHBOARD"**

---

## Step 5: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**

### 5.1 Configure OAuth Client

**Application type:**
- Select **"Web application"**

**Name:**
- Enter: `Photo Editor Web Client` (or any name)

**Authorized JavaScript origins:**
- Click **"+ ADD URI"**
- Add: `http://localhost:3000`
- (For production, add your deployed frontend URL)

**Authorized redirect URIs:**
- Click **"+ ADD URI"**
- Add: `http://localhost:8000/api/auth/oauth/google/callback`
- (This is your backend callback URL)

Click **"CREATE"**

---

## Step 6: Copy Your Credentials

A popup will show your credentials:

### Copy These Values:

1. **Client ID**: 
   ```
   123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```

2. **Client secret**:
   ```
   GOCSPX-abcdefghijklmnopqrstuvwxyz
   ```

**⚠️ IMPORTANT**: 
- Download the JSON if you want to save it
- Or click "OK" and you can always find them in the Credentials page

---

## Step 7: Update Backend Environment Variables

1. Open `backend/.env` file
2. Replace the Google OAuth placeholders:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_FROM_STEP_6
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_STEP_6
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/oauth/google/callback
```

**Example:**
```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/oauth/google/callback
```

3. Save the file

---

## Step 8: Update Frontend Environment Variables

1. Open `frontend/.env.local` file
2. Add the Google Client ID:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_FROM_STEP_6
```

**Example:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

3. Save the file

---

## Step 9: Restart Servers

### Restart Backend:
```bash
# Stop current backend (Ctrl+C in the terminal)
# Then restart:
cd backend
PYTHONPATH=/Users/krishhiv/Desktop/DPCS/Image_Editor/backend ./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Restart Frontend:
```bash
# Stop current frontend (Ctrl+C in the terminal)
# Then restart:
cd frontend
npm run dev
```

Or just refresh your browser if frontend is still running.

---

## Step 10: Test Google OAuth

### 10.1 Test Login Flow

1. Go to: http://localhost:3000/login
2. Click **"Continue with Google"** button
3. You should be redirected to Google's consent screen
4. Select your Google account
5. Grant permissions (if asked)
6. You should be redirected back to your app dashboard!

### 10.2 Test Signup Flow

1. Go to: http://localhost:3000/signup
2. Click **"Continue with Google"** button
3. Same flow as above

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**:
1. Check the error message for the actual redirect URI being used
2. Go to Google Cloud Console → Credentials
3. Click on your OAuth 2.0 Client ID
4. Add the exact URI from the error message to "Authorized redirect URIs"
5. Save and try again

### Error: "Access blocked: This app's request is invalid"

**Problem**: OAuth consent screen not configured properly.

**Solution**:
1. Go to "OAuth consent screen"
2. Make sure all required fields are filled
3. Add your email to "Test users" if in Testing mode
4. Save and try again

### Error: "403: app_not_configured_for_user"

**Problem**: Your email is not in the test users list.

**Solution**:
1. Go to "OAuth consent screen"
2. Scroll to "Test users"
3. Add your email address
4. Save and try again

### Error: Not seeing Google sign-in page

**Problem**: Frontend or backend configuration issue.

**Solution**:
1. Check browser console for errors
2. Verify `GOOGLE_CLIENT_ID` is set in both `backend/.env` and `frontend/.env.local`
3. Verify `GOOGLE_REDIRECT_URI` matches exactly in both Google Console and `backend/.env`
4. Restart both servers

---

## Verification Checklist

Before testing, ensure:

- ✅ Google Cloud project created
- ✅ OAuth consent screen configured
- ✅ OAuth 2.0 Client ID created
- ✅ Authorized redirect URI: `http://localhost:8000/api/auth/oauth/google/callback`
- ✅ Authorized JavaScript origin: `http://localhost:3000`
- ✅ `backend/.env` updated with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- ✅ `frontend/.env.local` updated with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- ✅ Backend server restarted
- ✅ Frontend refreshed
- ✅ Your email added to test users (if in Testing mode)

---

## Production Deployment Notes

When deploying to production:

1. **Update Authorized Origins:**
   - Add your production frontend URL (e.g., `https://yourapp.azurewebsites.net`)

2. **Update Redirect URIs:**
   - Add your production backend callback URL (e.g., `https://api.yourapp.com/api/auth/oauth/google/callback`)

3. **Publish OAuth App:**
   - In OAuth consent screen, click "PUBLISH APP"
   - This allows any Google user to sign in (not just test users)

4. **Update Environment Variables:**
   - Update `GOOGLE_REDIRECT_URI` in production `.env`
   - Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` the same

---

## Security Best Practices

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Use environment variables** in production (Azure App Settings)
3. **Rotate client secret** periodically
4. **Monitor OAuth usage** in Google Cloud Console
5. **Revoke suspicious tokens** if needed

---

## Next Steps After Setup

Once Google OAuth is working:

1. Test both login and signup flows
2. Verify user data is stored in Azure PostgreSQL
3. Check that `oauth_provider` field is set to "google"
4. Continue building photo upload features

---

**Need Help?**

- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2
- OAuth Playground: https://developers.google.com/oauthplayground

---

Let me know when you've completed the setup and we'll test it! 🚀
