# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bulk Email Sender - A production-ready web application for mass email sending with templates, personalization, scheduling, and analytics. Built with Next.js 16 (App Router), TypeScript (strict mode), and Tailwind CSS.

## Common Commands

```bash
# Development
npm run dev                    # Start development server

# Building
npm run build                  # Production build

# Linting
npm run lint                   # Run ESLint

# Testing
npm run test                   # Run vitest in watch mode
npm run test:unit              # Run unit tests (vitest.config.ts)
npm run test:integration       # Run integration tests (vitest.integration.config.ts)
npm run test:e2e               # Run Playwright E2E tests
npm run test:coverage          # Run tests with coverage

# Run a single test file
npx vitest run __tests__/unit/lib/utils.test.ts

# Database (Prisma)
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Run migrations (dev)
npm run db:push                # Push schema changes
npm run db:studio              # Open Prisma Studio

# Docker
docker-compose -f docker/docker-compose.yml up -d

# Install dependencies (use --legacy-peer-deps if needed)
npm install --legacy-peer-deps
```

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
  - `src/app/[locale]/` - Locale-based pages (i18n routing)
  - `src/app/api/` - API route handlers
    - `campaigns/` - Campaign CRUD, send, queue-status
    - `contacts/` - Contact CRUD with bulk import
    - `templates/` - Template CRUD with duplicate
    - `tracking/` - Open/click tracking, inbound webhooks
    - `webhooks/` - Outbound webhook CRUD, test, deliveries
    - `queue/` - Queue health and management
    - `smtp/test` - SMTP connection test
    - `email/test` - Test email sending
- `src/lib/` - Core libraries
  - `src/lib/email/` - Email sending logic (sender, merge-tags, validator)
  - `src/lib/queue/` - BullMQ email queue and worker
  - `src/lib/webhook/` - Outbound webhook delivery system
  - `src/lib/db/` - Database utilities (Prisma client singleton)
  - `src/lib/crypto.ts` - Secure ID generation, AES-GCM encryption, HTML/CSV escaping, DOMPurify sanitization
  - `src/lib/rate-limit.ts` - In-memory rate limiting with pre-configured limiters
  - `src/lib/csrf.ts` - CSRF token generation and validation
  - `src/lib/config.ts` - Type-safe environment variable access
  - `src/lib/timezone.ts` - Timezone utilities
- `src/components/` - React components
  - `ui/` - Radix UI primitives (button, card, dialog, etc.)
  - `email-builder/` - Drag-and-drop email builder (Canvas, BlockPalette, PropertiesPanel, BlockRenderer)
  - `analytics/` - Charts, MetricCard, CampaignTable
  - `automation/` - Workflow builder (WorkflowBuilder, StepConfigPanel, AutomationList)
  - `reputation/` - Deliverability metrics, bounce manager, blacklist checker
  - `preview/` - Email preview (DeviceToggle, SpamScoreCard, TestSendDialog, PersonalizationPicker)
  - `unsubscribe/` - Unsubscribe management (UnsubscribeForm, SuppressionList)
- `src/stores/` - Zustand stores for client-side state
- `src/hooks/` - Custom React hooks (useCsrf, useTheme, usePagination)
- `src/i18n/` - Internationalization config (next-intl)
- `src/messages/` - Translation files (en.json, ar.json)
- `prisma/` - Database schema (PostgreSQL)
- `__tests__/` - Test files (unit/, integration/, e2e/)
- `docker/` - Docker configuration

### Path Aliases
Use `@/*` to import from `src/*` (e.g., `import { cn } from '@/lib/utils'`)

### Database Schema (Prisma)
Key models: User, Account, Session, VerificationToken, ApiKey, Campaign, Template, Contact, ContactList, ContactListMember, Recipient, EmailEvent, SmtpConfig, Unsubscribe, Webhook, WebhookDelivery.

Enums:
- UserRole: USER, ADMIN, SUPER_ADMIN
- CampaignStatus: DRAFT, SCHEDULED, SENDING, PAUSED, COMPLETED, CANCELLED
- ContactStatus: ACTIVE, UNSUBSCRIBED, BOUNCED, COMPLAINED
- RecipientStatus: PENDING, QUEUED, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, FAILED, UNSUBSCRIBED
- EventType: SENT, DELIVERED, OPENED, CLICKED, BOUNCED, UNSUBSCRIBED, COMPLAINED
- WebhookAuthType: NONE, BASIC, BEARER, API_KEY, HMAC
- WebhookDeliveryStatus: PENDING, PROCESSING, DELIVERED, FAILED, RETRYING

### Email System
- `src/lib/email/sender.ts` - SMTP integration with Nodemailer, factory pattern via `createEmailSender()`. Supports presets: gmail, outlook, yahoo, sendgrid, mailgun, ses, zoho
- `src/lib/email/merge-tags.ts` - Template variable processing ({{firstName}}, {{lastName}}, {{email}}, {{company}}, {{customField1}}, {{customField2}}, {{unsubscribeLink}}, {{date}})
- `src/lib/email/validator.ts` - Email validation

### Middleware
`src/middleware.ts` handles:
- CSRF protection for API routes (validates token from `X-CSRF-Token` header)
- Public API routes exempt from CSRF: `/api/health`, `/api/track`, `/api/unsubscribe`, `/api/auth`
- Internationalization routing via next-intl

### Authentication System
The app uses NextAuth.js v5 for authentication with multiple providers and API key support.

Files in `src/lib/auth/`:
- `config.ts` - NextAuth configuration, password hashing, role checking utilities
- `index.ts` - Main auth exports with type augmentation
- `api-key.ts` - API key generation, validation, rate limiting
- `middleware.ts` - Auth middleware for protecting routes

Authentication methods:
- Email/Password (credentials provider)
- Google OAuth (optional, requires env vars)
- GitHub OAuth (optional, requires env vars)
- API Key (for programmatic access, prefix: `bes_`)

Auth API routes:
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update profile
- `PUT /api/auth/me` - Change password
- `GET /api/auth/api-keys` - List user's API keys
- `POST /api/auth/api-keys` - Create API key
- `GET /api/auth/api-keys/[id]` - Get API key details
- `PATCH /api/auth/api-keys/[id]` - Update API key
- `DELETE /api/auth/api-keys/[id]` - Delete API key

Admin routes (requires ADMIN or SUPER_ADMIN role):
- `GET /api/admin/users` - List all users (pagination, search, filters)
- `GET /api/admin/users/[id]` - Get user details
- `PATCH /api/admin/users/[id]` - Update user
- `DELETE /api/admin/users/[id]` - Delete user (SUPER_ADMIN only)

Role hierarchy:
- USER - Standard user
- ADMIN - Can manage users
- SUPER_ADMIN - Full access, can manage admins

API Key permissions:
- `campaigns:read`, `campaigns:write`, `campaigns:delete`, `campaigns:send`
- `contacts:read`, `contacts:write`, `contacts:delete`
- `templates:read`, `templates:write`, `templates:delete`
- `analytics:read`, `settings:read`, `settings:write`

Auth utilities:
```typescript
import { auth, isAdmin, isSuperAdmin, withAuth } from '@/lib/auth';

// Session-based auth
const session = await auth();
if (isAdmin(session)) { /* admin logic */ }

// API route protection with withAuth HOC
export const GET = withAuth(async (request, context) => {
  // context.userId, context.userRole available
}, { requiredPermission: 'campaigns:read' });
```

### Firebase Integration
Firebase is used for push notifications (FCM) and can optionally integrate with authentication.

Files in `src/lib/firebase/`:
- `admin.ts` - Firebase Admin SDK (server-side): FCM, Auth verification
- `client.ts` - Firebase client SDK (browser): FCM, Google Auth
- `index.ts` - Exports all Firebase utilities

FCM API routes:
- `POST /api/fcm/token` - Register FCM token for push notifications
- `DELETE /api/fcm/token` - Unregister FCM token
- `GET /api/fcm/token` - List user's FCM tokens
- `POST /api/fcm/send` - Send push notification (admin for broadcast)
- `POST /api/fcm/topic` - Subscribe to topic
- `DELETE /api/fcm/topic` - Unsubscribe from topic

Client-side hook:
```typescript
import { useFCM } from '@/hooks/useFCM';

function MyComponent() {
  const { token, requestPermission, isSupported } = useFCM({
    autoRegister: true,
    onMessage: (payload) => console.log('Notification:', payload),
  });
}
```

Service worker: `public/firebase-messaging-sw.js` handles background notifications.

### Internationalization
Two locales: English (en) and Arabic (ar) with RTL support. Config in `src/i18n/config.ts`. Routes use `[locale]` dynamic segment with `localePrefix: 'as-needed'`.

### Queue System
Uses BullMQ with Redis for email queue processing.

Files in `src/lib/queue/`:
- `types.ts` - Queue types, job data interfaces, SMTP rate limits
- `redis.ts` - Redis connection manager (singleton pattern)
- `email-queue.ts` - BullMQ queue instance and operations
- `email-worker.ts` - Worker for processing email jobs
- `queue-service.ts` - High-level queue operations (queueCampaign, pauseCampaign, etc.)
- `index.ts` - Exports all queue functionality

Worker commands:
```bash
npm run worker        # Start email worker (production)
npm run worker:dev    # Start email worker with watch mode (development)
```

Worker environment variables:
- `WORKER_CONCURRENCY` - Number of concurrent jobs (default: 5)
- `WORKER_RATE_LIMIT_MAX` - Max jobs per duration (default: 10)
- `WORKER_RATE_LIMIT_DURATION` - Rate limit window in ms (default: 1000)

SMTP Provider Rate Limits (emails/minute):
- Gmail: 100, Outlook: 300, Yahoo: 100
- SendGrid: 600, Mailgun: 600, SES: 200
- Zoho: 150, Custom: 60

### Webhook System
Outbound webhook delivery system for real-time event notifications. Uses BullMQ for reliable delivery with exponential backoff retries.

Files in `src/lib/webhook/`:
- `types.ts` - Webhook types, Zod schemas, event constants
- `signature.ts` - HMAC signature generation and verification
- `webhook-queue.ts` - BullMQ queue for webhook jobs
- `webhook-worker.ts` - Worker for processing webhook deliveries
- `webhook-service.ts` - High-level service (fireEvent, CRUD operations)
- `index.ts` - Exports all webhook functionality

Database models (Prisma):
- `Webhook` - Webhook configuration (url, events, auth settings)
- `WebhookDelivery` - Delivery attempts and status

Enums:
- `WebhookAuthType`: NONE, BASIC, BEARER, API_KEY, HMAC
- `WebhookDeliveryStatus`: PENDING, PROCESSING, DELIVERED, FAILED, RETRYING

Webhook events:
- Email: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.unsubscribed`, `email.complained`
- Campaign: `campaign.started`, `campaign.completed`, `campaign.paused`
- Contact: `contact.created`, `contact.updated`

Webhook API routes:
- `GET /api/webhooks` - List webhooks with pagination
- `POST /api/webhooks` - Create webhook
- `GET /api/webhooks/[id]` - Get webhook with stats
- `PATCH /api/webhooks/[id]` - Update webhook
- `DELETE /api/webhooks/[id]` - Delete webhook
- `POST /api/webhooks/[id]/test` - Test webhook connectivity
- `GET /api/webhooks/[id]/deliveries` - List delivery history
- `POST /api/webhooks/[id]/deliveries` - Retry failed delivery
- `GET /api/webhooks/events` - List available events

Usage:
```typescript
import { fireEvent, WEBHOOK_EVENTS } from '@/lib/webhook';

// Fire webhook event (non-blocking)
fireEvent(WEBHOOK_EVENTS.EMAIL_SENT, {
  emailId: 'email-123',
  recipientEmail: 'user@example.com',
  campaignId: 'campaign-456',
}, { userId: 'user-id', campaignId: 'campaign-456' }).catch(console.error);
```

Webhook payload format:
```json
{
  "id": "evt_xxx",
  "event": "email.sent",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": { "emailId": "...", "recipientEmail": "..." }
}
```

Authentication headers:
- HMAC: `X-Webhook-Signature: sha256=...`, `X-Webhook-Timestamp: ...`
- Bearer: `Authorization: Bearer <token>`
- Basic: `Authorization: Basic <base64>`
- API Key: Custom header with key value

Retry strategy: Exponential backoff (1min → 5min → 30min), max 3 retries.

Worker command:
```bash
npm run webhook-worker     # Start webhook worker (production)
npm run webhook-worker:dev # Start with watch mode (development)
```

### State Management
Zustand stores in `src/stores/`: campaign, analytics, schedule, preview, ab-test, automation, segmentation, email-builder, reputation, unsubscribe, settings.

### Rate Limiting
Pre-configured limiters in `src/lib/rate-limit.ts`:
- `apiRateLimiter`: 100 req/min
- `authRateLimiter`: 5 req/min
- `smtpTestRateLimiter`: 5 req/5min
- `emailSendRateLimiter`: 10 req/min

### Security Utilities
`src/lib/crypto.ts` provides:
- `generateSecureId()` / `generateShortId()` - Cryptographically secure IDs
- `encryptString()` / `decryptString()` - AES-GCM encryption with PBKDF2 key derivation
- `sanitizeHtml()` - DOMPurify-based HTML sanitization for email content
- `escapeHtml()` / `escapeCSV()` - XSS and CSV injection prevention
- `sanitizeUrl()` - Block javascript:/data:/vbscript: URLs

## Testing Strategy

- Unit tests: `__tests__/unit/` - jsdom environment, `src/test/setup.ts`
- Integration tests: `__tests__/integration/` - node environment, 30s timeout, `src/test/integration-setup.ts`
- E2E tests: `__tests__/e2e/` - Playwright browser tests (*.spec.ts)

Test setup mocks `next/navigation` and `next-intl` in `src/test/setup.ts`. Also mocks `ResizeObserver` and `window.matchMedia`.

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXT_PUBLIC_APP_URL` - Application URL
- `TRACKING_URL` - Email tracking endpoint URL

Required for authentication:
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with: openssl rand -base64 32)
- `NEXTAUTH_URL` - Application URL for NextAuth.js (same as NEXT_PUBLIC_APP_URL)

Optional OAuth providers:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret

Firebase Admin (server-side, choose one method):
- `FIREBASE_SERVICE_ACCOUNT` - JSON string of service account
- Or individual values: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Firebase Client (browser-side):
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (for FCM web push)

Optional:
- `NEXT_PUBLIC_CONTACT_EMAIL` - Contact email for footer
- `NEXT_PUBLIC_SUPPORT_EMAIL` - Support email
- `NEXT_PUBLIC_CONTACT_PHONE` - Contact phone
- `NEXT_PUBLIC_TRACK_OPENS` - Enable open tracking (default: true)
- `NEXT_PUBLIC_TRACK_CLICKS` - Enable click tracking (default: true)
