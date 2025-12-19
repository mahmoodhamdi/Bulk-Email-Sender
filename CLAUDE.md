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
  - `src/lib/payments/` - Payment gateway integrations (Stripe, Paymob, PayTabs, Paddle)
  - `src/lib/subscription/` - Subscription middleware and usage tracking
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
  - `billing/` - Payment components (PricingTable, SubscriptionStatus, PaymentHistory, CheckoutButton, BillingPage)
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
Key models: User, Account, Session, VerificationToken, ApiKey, FcmToken, Campaign, Template, TemplateVersion, Contact, ContactList, ContactListMember, Recipient, EmailEvent, SmtpConfig, Unsubscribe, Webhook, WebhookDelivery, Subscription, Payment, PaymentMethod, Invoice, WebhookEvent, Coupon.

Enums:
- UserRole: USER, ADMIN, SUPER_ADMIN
- CampaignStatus: DRAFT, SCHEDULED, SENDING, PAUSED, COMPLETED, CANCELLED
- ContactStatus: ACTIVE, UNSUBSCRIBED, BOUNCED, COMPLAINED
- RecipientStatus: PENDING, QUEUED, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, FAILED, UNSUBSCRIBED
- EventType: SENT, DELIVERED, OPENED, CLICKED, BOUNCED, UNSUBSCRIBED, COMPLAINED
- WebhookAuthType: NONE, BASIC, BEARER, API_KEY, HMAC
- WebhookDeliveryStatus: PENDING, PROCESSING, DELIVERED, FAILED, RETRYING
- VersionChangeType: CREATE, UPDATE, REVERT
- SubscriptionTier: FREE, STARTER, PRO, ENTERPRISE
- SubscriptionStatus: ACTIVE, PAST_DUE, CANCELED, EXPIRED, TRIALING
- PaymentStatus: PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED
- PaymentProvider: STRIPE, PAYMOB, PAYTABS, PADDLE

### Email System
- `src/lib/email/sender.ts` - SMTP integration with Nodemailer, factory pattern via `createEmailSender()`. Supports presets: gmail, outlook, yahoo, sendgrid, mailgun, ses, zoho
- `src/lib/email/merge-tags.ts` - Template variable processing ({{firstName}}, {{lastName}}, {{email}}, {{company}}, {{customField1}}, {{customField2}}, {{unsubscribeLink}}, {{date}})
- `src/lib/email/validator.ts` - Email validation

### Middleware
`src/middleware.ts` handles:
- CSRF protection for API routes (validates token from `X-CSRF-Token` header)
- Public API routes exempt from CSRF: `/api/health`, `/api/tracking/*`, `/api/auth`
- Security headers via `applySecurityHeaders()`
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

Note: The webhook worker is started programmatically via `startWebhookWorker()` from `@/lib/webhook`. There is no standalone webhook worker script.

### Template Versioning
Automatic version history for email templates with revert and compare functionality.

Files in `src/lib/template/`:
- `version-service.ts` - Version management (create, list, compare, revert)
- `index.ts` - Exports all template utilities

Database models (Prisma):
- `TemplateVersion` - Version snapshots (name, subject, content, category, changeType, changeSummary)
- `Template.currentVersion` - Tracks latest version number

Version API routes:
- `GET /api/templates/[id]/versions` - List versions with pagination
- `GET /api/templates/[id]/versions/[version]` - Get version details
- `POST /api/templates/[id]/versions/[version]/revert` - Revert to version
- `GET /api/templates/[id]/versions/compare?v1=X&v2=Y` - Compare two versions

Usage:
```typescript
import { createVersion, getVersions, revertToVersion, compareVersions } from '@/lib/template';

// Versions are created automatically on template updates
// List versions
const { versions, total } = await getVersions(templateId, { page: 1, limit: 20 });

// Compare two versions
const comparison = await compareVersions(templateId, 1, 3);

// Revert to a previous version (creates new version)
const { version, template } = await revertToVersion(templateId, 2, userId);
```

Change types: `CREATE` (initial), `UPDATE` (content changed), `REVERT` (restored from version)

Auto-generated change summaries: "Updated content", "Changed subject and content", etc.

### A/B Testing System
Server-side A/B testing for email campaigns with automatic winner selection.

Files in `src/lib/ab-test/`:
- `types.ts` - A/B test types and interfaces
- `ab-test-service.ts` - CRUD operations, variant management
- `ab-test-executor.ts` - Test execution engine (splitting, sending, winner selection)

A/B Test API routes:
- `GET /api/ab-tests` - List tests with pagination
- `POST /api/ab-tests` - Create A/B test for campaign
- `GET /api/ab-tests/[id]` - Get test details with stats
- `PATCH /api/ab-tests/[id]` - Update test configuration
- `DELETE /api/ab-tests/[id]` - Delete test
- `POST /api/ab-tests/[id]/start` - Start A/B test
- `POST /api/ab-tests/[id]/select-winner` - Manually select winner

Test types: `SUBJECT`, `CONTENT`, `FROM_NAME`, `SEND_TIME`
Winner criteria: `OPEN_RATE`, `CLICK_RATE`, `CONVERSION_RATE`

Usage:
```typescript
import { createABTest, startABTest, selectWinner } from '@/lib/ab-test';

// Create test with variants
const test = await createABTest({
  campaignId: 'campaign-123',
  name: 'Subject Line Test',
  testType: 'SUBJECT',
  sampleSize: 20, // % of recipients for test phase
  winnerCriteria: 'OPEN_RATE',
  testDuration: 4, // hours
  autoSelectWinner: true,
  variants: [
    { name: 'Variant A', subject: 'Hello {{firstName}}!' },
    { name: 'Variant B', subject: 'Special offer for you' },
  ],
});
```

### Caching System
Redis-based caching with automatic serialization and TTL management.

Files in `src/lib/cache/`:
- `redis-cache.ts` - Core caching functions with domain-specific helpers

Cache prefixes: `template:`, `campaign:`, `user:`, `session:`, `stats:`

Default TTLs:
- Templates: 1 hour
- Campaigns: 5 minutes
- Users: 30 minutes
- Sessions: 24 hours
- Stats: 5 minutes

Usage:
```typescript
import { cacheGetOrSet, invalidateTemplateCache, getCacheStats } from '@/lib/cache';

// Cache with automatic fallback
const template = await cacheGetOrSet(
  `template:${id}`,
  () => prisma.template.findUnique({ where: { id } }),
  3600 // TTL in seconds
);

// Invalidate on update
await invalidateTemplateCache(templateId);
```

### Automation System
Visual workflow builder for automated email sequences.

Files in `src/lib/automation/` (if exists) or API routes:
- Automation CRUD and execution
- Step types: EMAIL, DELAY, CONDITION, ACTION, WEBHOOK

Trigger types: `SIGNUP`, `TAG_ADDED`, `DATE_FIELD`, `MANUAL`, `EMAIL_OPENED`, `LINK_CLICKED`, `FORM_SUBMITTED`

### State Management
Zustand stores in `src/stores/`: campaign, analytics, schedule, preview, ab-test, automation, segmentation, email-builder, reputation, unsubscribe, settings.

### Rate Limiting
Two implementations available in `src/lib/rate-limit/`:

**In-memory limiters** (single-server deployments):
- `apiRateLimiter`: 100 req/min
- `authRateLimiter`: 5 req/min
- `smtpTestRateLimiter`: 5 req/5min
- `emailSendRateLimiter`: 10 req/min

**Distributed limiters** (multi-server deployments via Redis):
- `distributedApiLimiter`, `distributedAuthLimiter`, etc.
- `checkRateLimitRedis()` - Pure Redis implementation
- `checkRateLimitHybrid()` - Falls back to memory if Redis unavailable

### Security Utilities
`src/lib/crypto.ts` provides:
- `generateSecureId()` / `generateShortId()` - Cryptographically secure IDs
- `encryptString()` / `decryptString()` - AES-GCM encryption with PBKDF2 key derivation
- `sanitizeHtml()` - DOMPurify-based HTML sanitization for email content
- `escapeHtml()` / `escapeCSV()` - XSS and CSV injection prevention
- `sanitizeUrl()` - Block javascript:/data:/vbscript: URLs

`src/lib/security-headers.ts` provides:
- `applySecurityHeaders()` - Applies X-Frame-Options, CSP, HSTS, etc.
- Used automatically by middleware for all responses

### Payment System
Multi-gateway payment and subscription system supporting Stripe (International), Paymob (Egypt), PayTabs (MENA), and Paddle (Global MoR).

Files in `src/lib/payments/`:
- `types.ts` - Enums, interfaces, tier configuration, gateway types
- `index.ts` - Gateway factory with lazy-loaded singletons
- `stripe/` - Stripe SDK integration (checkout, portal, webhooks)
- `paymob/` - Paymob HTTP client (card, wallet, kiosk payments)
- `paytabs/` - PayTabs integration (Mada, Apple Pay support)
- `paddle/` - Paddle SDK integration (overlay checkout)

Files in `src/lib/subscription/`:
- `middleware.ts` - Tier-based access control and feature gating
- `usage.ts` - Usage tracking and limit enforcement

Database models (Prisma):
- `Subscription` - User subscription (tier, status, dates, limits)
- `Payment` - Payment records (amount, provider, status)
- `PaymentMethod` - Stored payment methods
- `Invoice` - Invoice records with PDF URLs
- `WebhookEvent` - Provider webhook event logs
- `Coupon` - Discount coupons

Subscription tiers:
| Tier | Price | Emails/Month | Contacts | Features |
|------|-------|--------------|----------|----------|
| FREE | $0 | 100 | 500 | Basic templates, 1 SMTP |
| STARTER | $4.99/mo | 5,000 | 5,000 | All templates, 3 SMTP, Analytics |
| PRO | $14.99/mo | 50,000 | 50,000 | A/B testing, Automation, API access |
| ENTERPRISE | $49.99/mo | Unlimited | Unlimited | Priority support, Custom integrations |

Payment API routes:
- `POST /api/payments/checkout` - Create checkout session
- `GET /api/payments/portal` - Get customer portal URL
- `GET /api/payments/subscription` - Get current subscription
- `PATCH /api/payments/subscription` - Update subscription
- `DELETE /api/payments/subscription` - Cancel subscription
- `GET /api/payments/methods` - List payment methods
- `POST /api/payments/methods` - Add payment method
- `DELETE /api/payments/methods/[id]` - Remove payment method
- `GET /api/payments/invoices` - List invoices

Webhook routes (CSRF exempt):
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paymob` - Paymob callback handler
- `POST /api/webhooks/paytabs` - PayTabs callback handler
- `POST /api/webhooks/paddle` - Paddle webhook handler

Usage:
```typescript
import { getPaymentGateway, SubscriptionTier, TIER_CONFIG } from '@/lib/payments';
import { checkFeatureAccess, trackUsage, getUserLimits } from '@/lib/subscription';

// Get gateway by provider
const stripe = getPaymentGateway('stripe');
const session = await stripe.createCheckoutSession({
  userId: 'user-123',
  tier: SubscriptionTier.PRO,
  billingInterval: 'monthly',
  successUrl: '/billing?success=true',
  cancelUrl: '/billing?canceled=true',
});

// Check feature access
const canUseABTesting = await checkFeatureAccess(userId, 'abTesting');

// Track usage
await trackUsage(userId, 'emailsSent', 100);

// Get user limits
const limits = await getUserLimits(userId);
console.log(limits.emailsPerMonth, limits.abTesting);
```

Billing store (Zustand):
```typescript
import { useBillingStore, canAccessFeature, isPaidPlan } from '@/stores/billing-store';

function BillingComponent() {
  const { subscription, payments, fetchSubscription, createCheckout } = useBillingStore();

  // Check access
  const hasAbTesting = canAccessFeature(useBillingStore.getState(), 'abTesting');
  const isPaid = isPaidPlan(useBillingStore.getState());
}
```

Billing components in `src/components/billing/`:
- `PricingTable` - Tier selection with monthly/yearly toggle
- `SubscriptionStatus` - Current subscription, usage progress bars
- `PaymentHistory` - Payment list with receipt links
- `CheckoutButton` - Checkout with optional provider selection
- `BillingPage` - Full billing management page with tabs

Billing page route: `/[locale]/billing`

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

Payment Providers (configure at least one):

Stripe (International):
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_...)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (pk_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_...)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side publishable key
- `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_STARTER_YEARLY` - Price IDs
- `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` - Price IDs
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`, `STRIPE_PRICE_ENTERPRISE_YEARLY` - Price IDs

Paymob (Egypt):
- `PAYMOB_API_KEY` - Paymob API key
- `PAYMOB_INTEGRATION_ID_CARD` - Card payment integration ID
- `PAYMOB_INTEGRATION_ID_WALLET` - Mobile wallet integration ID
- `PAYMOB_HMAC_SECRET` - Webhook HMAC secret
- `PAYMOB_IFRAME_ID` - Payment iframe ID

PayTabs (MENA Region):
- `PAYTABS_PROFILE_ID` - Merchant profile ID
- `PAYTABS_SERVER_KEY` - Server-side API key
- `PAYTABS_CLIENT_KEY` - Client-side key
- `PAYTABS_REGION` - Region code (SAU, UAE, EGY, OMN, JOR, ARE)

Paddle (Global MoR):
- `PADDLE_API_KEY` - Paddle API key
- `PADDLE_ENVIRONMENT` - Environment (sandbox or production)
- `PADDLE_WEBHOOK_SECRET` - Webhook signature secret
- `PADDLE_PRODUCT_STARTER_MONTHLY`, `PADDLE_PRODUCT_STARTER_YEARLY` - Product IDs
- `PADDLE_PRODUCT_PRO_MONTHLY`, `PADDLE_PRODUCT_PRO_YEARLY` - Product IDs
- `PADDLE_PRODUCT_ENTERPRISE_MONTHLY`, `PADDLE_PRODUCT_ENTERPRISE_YEARLY` - Product IDs
