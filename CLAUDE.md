# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bulk Email Sender - A production-ready web application for mass email sending with templates, personalization, scheduling, and analytics. Built with Next.js 16 (App Router), TypeScript (strict mode), and Tailwind CSS.

## Common Commands

```bash
# Development
npm run dev                    # Start development server
npm run worker:dev             # Start email worker with watch mode

# Building & Linting
npm run build                  # Production build
npm run lint                   # Run ESLint

# Testing
npm run test                   # Run vitest in watch mode
npm run test:unit              # Run unit tests (vitest.config.ts)
npm run test:integration       # Run integration tests (vitest.integration.config.ts)
npm run test:e2e               # Run Playwright E2E tests
npm run test:coverage          # Run tests with coverage

# Run a single test file
npx vitest run __tests__/unit/lib/utils.test.ts

# Run tests matching a pattern
npx vitest run __tests__/unit/lib/   # All unit tests in lib/
npx vitest run -t "email"            # Tests matching "email"

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

### Path Aliases
Use `@/*` to import from `src/*` (e.g., `import { cn } from '@/lib/utils'`)

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
  - `src/app/[locale]/` - Locale-based pages (i18n with EN/AR and RTL support)
  - `src/app/api/` - API route handlers
- `src/lib/` - Core libraries (auth, email, queue, webhook, payments, subscription, cache, ab-test, automation)
- `src/components/` - React components (ui/, email-builder/, analytics/, billing/, etc.)
- `src/stores/` - Zustand stores for client-side state
- `src/hooks/` - Custom React hooks
- `src/lib/validations/` - Zod schemas for API input validation
- `prisma/` - Database schema (PostgreSQL)
- `__tests__/` - Test files (unit/, integration/, e2e/)
- `src/messages/` - i18n translation files (en.json, ar.json)

### Database Schema (Prisma)
Key models: User, Campaign, Template, TemplateVersion, Contact, ContactList, Recipient, EmailEvent, SmtpConfig, Webhook, WebhookDelivery, ABTest, ABTestVariant, Automation, AutomationStep, AutomationEnrollment, Subscription, Payment, ApiKey.

Key enums: UserRole (USER/ADMIN/SUPER_ADMIN), CampaignStatus (DRAFT/SCHEDULED/SENDING/PAUSED/COMPLETED/CANCELLED), SubscriptionTier (FREE/STARTER/PRO/ENTERPRISE), PaymentProvider (STRIPE/PAYMOB/PAYTABS/PADDLE), EventType (SENT/DELIVERED/OPENED/CLICKED/BOUNCED/UNSUBSCRIBED/COMPLAINED).

### Middleware (`src/middleware.ts`)

- CSRF protection for mutating API routes (double-submit cookie pattern, validates `X-CSRF-Token` header)
- GET requests are exempt from CSRF validation (read-only operations)
- CSRF-exempt routes: `/api/health`, `/api/tracking/*`, `/api/auth`, `/api/webhooks/stripe|paymob|paytabs|paddle`
- Security headers via `applySecurityHeaders()` (CSP with nonces, X-Frame-Options, HSTS)
- i18n routing via next-intl
- CSRF token auto-generated and set as cookie for page requests

### Authentication (`src/lib/auth/`)

NextAuth.js v5 with Email/Password, Firebase Auth, Google OAuth, GitHub OAuth, and API Keys (prefix: `bes_`).

```typescript
import { auth, isAdmin, withAuth } from '@/lib/auth';

// Session-based
const session = await auth();
if (isAdmin(session)) { /* admin logic */ }

// API route protection with withAuth HOC
export const GET = withAuth(async (request, context, params) => {
  // context: AuthContext { type: 'session'|'api-key', userId, userRole, permissions? }
  return NextResponse.json({ data });
}, { requiredPermission: 'campaigns:read', requireAdmin: false });
```

Auth flow: checks API key (Bearer token) first, falls back to NextAuth session. Role hierarchy: USER < ADMIN < SUPER_ADMIN. API key permissions format: `resource:action` (e.g., `campaigns:read`, `contacts:*`).

### API Response Patterns (`src/lib/api-response.ts`)

Use the standardized response helpers for all API routes:

```typescript
import { apiSuccess, apiError, ApiErrors, paginatedResponse } from '@/lib/api-response';

// Success: { success: true, data: T }
return apiSuccess({ campaigns: [] });
return apiSuccess(campaign, 201);

// Paginated: { success: true, data: T, meta: { page, limit, total, totalPages, hasMore } }
return paginatedResponse(items, { page: 1, limit: 20, total: 100 });

// Error: { success: false, error: { code, message, details? } }
return apiError('VALIDATION_ERROR', 'Invalid input', 400);

// Pre-built errors (preferred):
return ApiErrors.notFound();
return ApiErrors.unauthorized();
return ApiErrors.forbidden();
return ApiErrors.validationError(zodDetails);
return ApiErrors.rateLimited();
return ApiErrors.insufficientPermissions();
```

**Note:** `createErrorResponse`/`createSuccessResponse` from `@/lib/auth` are deprecated. Use `apiSuccess`/`apiError`/`ApiErrors` instead.

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_INPUT`, `NOT_FOUND`, `ALREADY_EXISTS`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`, `DATABASE_ERROR`, `QUOTA_EXCEEDED`, `FEATURE_DISABLED`.

### Email System (`src/lib/email/`)

- `sender.ts` - Nodemailer SMTP integration via `createEmailSender()`. Presets: gmail, outlook, yahoo, sendgrid, mailgun, ses, zoho
- `merge-tags.ts` - Variables: `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{company}}`, `{{customField1}}`, `{{customField2}}`, `{{unsubscribeLink}}`, `{{date}}`

### Queue System (`src/lib/queue/`)

BullMQ + Redis for email queue processing. Worker runs via `tsx` (TypeScript executor).

```bash
npm run worker:dev   # Development with watch mode (tsx watch)
npm run worker       # Production (tsx)
```

Worker env vars: `WORKER_CONCURRENCY` (default: 5), `WORKER_RATE_LIMIT_MAX` (default: 10), `WORKER_RATE_LIMIT_DURATION` (default: 1000ms).

Key files: `email-queue.ts` (queue ops), `email-worker.ts` (worker logic), `queue-service.ts` (high-level service), `redis.ts` (connection management).

### Webhook System (`src/lib/webhook/`)

Outbound webhooks with HMAC signing. Events: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `campaign.started`, `campaign.completed`, etc.

```typescript
import { fireEvent, WEBHOOK_EVENTS } from '@/lib/webhook';
fireEvent(WEBHOOK_EVENTS.EMAIL_SENT, { emailId, recipientEmail, campaignId }, { userId }).catch(console.error);
```

### Payment System (`src/lib/payments/`)

Multi-gateway factory pattern with lazy-loaded singletons. Each gateway implements `PaymentGateway` interface (checkout, subscriptions, refunds, webhooks, customer management).

```typescript
import { getPaymentGateway, PaymentProvider } from '@/lib/payments';
import { checkFeatureAccess, checkEmailLimit, incrementEmailCount } from '@/lib/subscription';

const gateway = await getPaymentGateway(PaymentProvider.STRIPE);
// Or auto-select by region:
const gateway = await getGatewayForRegion('EG'); // Returns Paymob for Egypt
```

Regional routing: Stripe (international/default), Paymob (Egypt), PayTabs (MENA: SA/AE/KW/BH/OM/QA/JO/LB), Paddle (EU countries).

Subscription tiers: FREE ($0, 100 emails), STARTER ($4.99, 5K), PRO ($14.99, 50K), ENTERPRISE ($49.99, unlimited).

Tier helpers: `getTierConfig()`, `getTierLimits()`, `canAccessFeature()`, `canUpgradeTo()`, `formatPrice()`.

### Subscription System (`src/lib/subscription/`)

Usage tracking and feature gating middleware for API routes.

```typescript
import { checkFeatureAccess, checkEmailLimit, incrementEmailCount } from '@/lib/subscription';

const { allowed } = await checkFeatureAccess(userId, 'abTesting');
const emailCheck = await checkEmailLimit(userId, 100);
if (emailCheck.allowed) await incrementEmailCount(userId, 100);
```

### A/B Testing (`src/lib/ab-test/`)

Service (`ab-test-service.ts`) and executor (`ab-test-executor.ts`). Test types: SUBJECT, CONTENT, FROM_NAME, SEND_TIME. Requires PRO tier.

### Automation (`src/lib/automation/`)

Workflow engine with triggers (SIGNUP, TAG_ADDED, EMAIL_OPENED, LINK_CLICKED, etc.) and steps (EMAIL, DELAY, CONDITION, ACTION, WEBHOOK). Full CRUD + enrollment/execution management.

### Caching (`src/lib/cache/`)

Redis caching with `cacheGetOrSet()` and domain-specific invalidation helpers.

### Security Utilities

- `src/lib/crypto/` - Secure ID generation (`index.ts`), AES-GCM encryption and HTML sanitization via DOMPurify (`server-encryption.ts`)
- `src/lib/ssrf-protection.ts` - URL validation against private IPs
- `src/lib/rate-limit/` - In-memory and Redis-based rate limiting (`redis-rate-limit.ts`)
- `src/lib/csrf.ts` - CSRF token generation/validation (constant-time comparison)
- `src/lib/security-headers.ts` - CSP with nonces, security headers

### State Management

Zustand stores in `src/stores/`: campaign, analytics, billing, ab-test, automation, email-builder, preview, reputation, schedule, segmentation, settings, unsubscribe.

## Testing

- **Unit tests:** `__tests__/unit/` - jsdom environment, setup in `src/test/setup.ts` (mocks `next/navigation`, `next-intl`, `ResizeObserver`, `window.matchMedia`)
- **Integration tests:** `__tests__/integration/` - node environment, 30s timeout, setup in `src/test/integration-setup.ts` (mocks `nodemailer`, sets test env vars)
- **E2E tests:** `__tests__/e2e/` - Playwright

## Environment Variables

**Required:** `DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`, `TRACKING_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

**Optional OAuth:** `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`

**Firebase:** Server: `FIREBASE_SERVICE_ACCOUNT` or (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Client: `NEXT_PUBLIC_FIREBASE_*` variables.

**Worker:** `WORKER_CONCURRENCY`, `WORKER_RATE_LIMIT_MAX`, `WORKER_RATE_LIMIT_DURATION`

**Feature Flags:** `NEXT_PUBLIC_TRACK_OPENS`, `NEXT_PUBLIC_TRACK_CLICKS`

**Payment Providers (configure at least one):**
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
- Paymob: `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID_*`, `PAYMOB_HMAC_SECRET`
- PayTabs: `PAYTABS_PROFILE_ID`, `PAYTABS_SERVER_KEY`, `PAYTABS_REGION`
- Paddle: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, product IDs

See `.env.example` for complete list.

## Validation

Use Zod schemas from `src/lib/validations/` for API input validation. Available schemas: `auth.ts`, `campaign.ts`, `contact.ts`, `template.ts`, `payment.ts`, `fcm.ts`, `tracking.ts`, `queue.ts`. Schemas follow the pattern `{resource}Schema`.

## Next.js Config

- Standalone output mode (for Docker deployment)
- Wrapped with `next-intl/plugin` for i18n
- Remote image patterns: unsplash, cdn.example.com, *.githubusercontent.com, localhost
