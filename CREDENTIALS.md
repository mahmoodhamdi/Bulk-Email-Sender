# Credentials and Environment Variables

This document lists all credentials and environment variables required for the Bulk Email Sender application.

## Local Development (.env file)

Create a `.env` file in the project root with the following variables:

### Required Variables

```bash
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/emailsender"

# Redis (for queue processing)
REDIS_URL="redis://localhost:6379"

# Application URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TRACKING_URL="http://localhost:3000/api/track"

# Authentication (NextAuth.js)
NEXTAUTH_SECRET=""  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### Optional Variables

```bash
# Contact Information (displayed in app footer if set)
NEXT_PUBLIC_CONTACT_EMAIL=""
NEXT_PUBLIC_SUPPORT_EMAIL=""
NEXT_PUBLIC_CONTACT_PHONE=""

# Feature Flags
NEXT_PUBLIC_TRACK_OPENS="true"
NEXT_PUBLIC_TRACK_CLICKS="true"
```

### OAuth Providers (Optional)

```bash
# Google OAuth (for direct Google sign-in via NextAuth)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# GitHub OAuth
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### Firebase Configuration (Optional - for FCM and Firebase Auth)

#### Server-side (Firebase Admin SDK)

Choose one of these methods:

**Option 1: JSON string of service account (Recommended for production)**
```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**Option 2: Individual values**
```bash
FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""  # Note: Replace \n with actual newlines or use \\n
```

#### Client-side (Firebase Web SDK)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=""  # Optional (for Analytics)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=""  # Required for FCM web push
```

---

## GitHub Secrets (for CI/CD)

Add these secrets in your GitHub repository settings: **Settings > Secrets and variables > Actions**

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string for CI | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Random string for session encryption | Generate with `openssl rand -base64 32` |

### Optional Secrets (for full functionality)

| Secret Name | Description |
|-------------|-------------|
| `REDIS_URL` | Redis connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (stringified) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase VAPID Key for web push |

### Deployment Secrets (if using Vercel, Railway, etc.)

| Secret Name | Description |
|-------------|-------------|
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Environment-Specific Values

### Development

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/emailsender"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TRACKING_URL="http://localhost:3000/api/track"
NEXTAUTH_URL="http://localhost:3000"
```

### Production

```bash
DATABASE_URL="postgresql://user:password@production-host:5432/emailsender?sslmode=require"
REDIS_URL="redis://production-redis:6379"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
TRACKING_URL="https://yourdomain.com/api/track"
NEXTAUTH_URL="https://yourdomain.com"
```

---

## How to Get Credentials

### 1. PostgreSQL Database
- **Local**: Use Docker: `docker-compose -f docker/docker-compose.yml up -d db`
- **Production**: Use services like Supabase, Railway, Neon, or AWS RDS

### 2. Redis
- **Local**: Use Docker: `docker-compose -f docker/docker-compose.yml up -d redis`
- **Production**: Use services like Upstash, Railway, or AWS ElastiCache

### 3. NextAuth Secret
Generate a secure random string:
```bash
openssl rand -base64 32
```

### 4. Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

### 5. GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`

### 6. Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. **For Admin SDK**: Go to Project Settings > Service Accounts > Generate New Private Key
4. **For Web SDK**: Go to Project Settings > General > Your apps > Web app
5. **For FCM VAPID Key**: Go to Project Settings > Cloud Messaging > Web configuration > Generate key pair

---

## Security Notes

1. **Never commit `.env` files** to version control
2. **Rotate secrets** if they are accidentally exposed
3. **Use different credentials** for development and production
4. **Firebase private keys** should be stored securely (use environment variables, not files in production)
5. **NEXTAUTH_SECRET** must be the same across all instances of your app
