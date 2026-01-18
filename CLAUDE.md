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

### Database Schema (Prisma)
Key models: User, Campaign, Template, TemplateVersion, Contact, ContactList, Recipient, EmailEvent, SmtpConfig, Webhook, WebhookDelivery, Subscription, Payment, ApiKey.

Key enums: UserRole (USER/ADMIN/SUPER_ADMIN), CampaignStatus (DRAFT/SCHEDULED/SENDING/PAUSED/COMPLETED/CANCELLED), SubscriptionTier (FREE/STARTER/PRO/ENTERPRISE), PaymentProvider (STRIPE/PAYMOB/PAYTABS/PADDLE).

### Middleware (`src/middleware.ts`)

- CSRF protection for API routes (validates `X-CSRF-Token` header)
- CSRF-exempt routes: `/api/health`, `/api/tracking/*`, `/api/auth`, `/api/webhooks/stripe|paymob|paytabs|paddle`
- Security headers via `applySecurityHeaders()`
- i18n routing via next-intl

### Authentication (`src/lib/auth/`)

NextAuth.js v5 with Email/Password, Google OAuth, GitHub OAuth, and API Keys (prefix: `bes_`).

```typescript
import { auth, isAdmin, withAuth } from '@/lib/auth';

// Session-based
const session = await auth();
if (isAdmin(session)) { /* admin logic */ }

// API route protection
export const GET = withAuth(async (request, context) => {
  // context.userId, context.userRole available
}, { requiredPermission: 'campaigns:read' });
```

Role hierarchy: USER < ADMIN < SUPER_ADMIN

### Email System (`src/lib/email/`)

- `sender.ts` - Nodemailer SMTP integration via `createEmailSender()`. Presets: gmail, outlook, yahoo, sendgrid, mailgun, ses, zoho
- `merge-tags.ts` - Variables: `{{firstName}}`, `{{lastName}}`, `{{email}}`, `{{company}}`, `{{customField1}}`, `{{customField2}}`, `{{unsubscribeLink}}`, `{{date}}`

### Queue System (`src/lib/queue/`)

BullMQ + Redis for email queue processing. Start worker: `npm run worker:dev`

### Webhook System (`src/lib/webhook/`)

Outbound webhooks with HMAC signing. Events: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `campaign.started`, `campaign.completed`, etc.

```typescript
import { fireEvent, WEBHOOK_EVENTS } from '@/lib/webhook';
fireEvent(WEBHOOK_EVENTS.EMAIL_SENT, { emailId, recipientEmail, campaignId }, { userId }).catch(console.error);
```

### Payment System (`src/lib/payments/`)

Multi-gateway: Stripe (International), Paymob (Egypt), PayTabs (MENA), Paddle (Global MoR).

```typescript
import { getPaymentGateway, SubscriptionTier } from '@/lib/payments';
import { checkFeatureAccess, trackUsage } from '@/lib/subscription';

const stripe = getPaymentGateway('stripe');
const canUseABTesting = await checkFeatureAccess(userId, 'abTesting');
await trackUsage(userId, 'emailsSent', 100);
```

Subscription tiers: FREE ($0, 100 emails), STARTER ($4.99, 5K), PRO ($14.99, 50K), ENTERPRISE ($49.99, unlimited).

### Caching (`src/lib/cache/`)

Redis caching with `cacheGetOrSet()` and domain-specific invalidation helpers.

### Security Utilities

- `src/lib/crypto.ts` - Secure IDs, AES-GCM encryption, HTML sanitization (DOMPurify)
- `src/lib/ssrf-protection.ts` - URL validation against private IPs
- `src/lib/rate-limit.ts` - In-memory and Redis-based rate limiting

### State Management

Zustand stores in `src/stores/`: campaign, analytics, billing, ab-test, automation, email-builder, etc.

## Testing

- Unit tests: `__tests__/unit/` - jsdom environment
- Integration tests: `__tests__/integration/` - node environment, 30s timeout
- E2E tests: `__tests__/e2e/` - Playwright

Test setup in `src/test/setup.ts` mocks `next/navigation`, `next-intl`, `ResizeObserver`, `window.matchMedia`.

## Environment Variables

**Required:**

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - NextAuth.js URL

**Optional (OAuth):**

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

**Firebase (FCM):**

- Server: `FIREBASE_SERVICE_ACCOUNT` or (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- Client: `NEXT_PUBLIC_FIREBASE_*` variables

**Payment Providers (configure at least one):**

- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
- Paymob: `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID_*`, `PAYMOB_HMAC_SECRET`
- PayTabs: `PAYTABS_PROFILE_ID`, `PAYTABS_SERVER_KEY`, `PAYTABS_REGION`
- Paddle: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, product IDs

See `.env.example` for complete list.
