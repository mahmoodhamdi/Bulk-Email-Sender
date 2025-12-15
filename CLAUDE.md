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
  - `src/app/api/` - API route handlers (health, smtp/test, email/test)
- `src/lib/` - Core libraries
  - `src/lib/email/` - Email sending logic (sender, merge-tags, validator)
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
Key models: Campaign, Template, Contact, ContactList, ContactListMember, Recipient, EmailEvent, SmtpConfig, Unsubscribe.

Enums:
- CampaignStatus: DRAFT, SCHEDULED, SENDING, PAUSED, COMPLETED, CANCELLED
- ContactStatus: ACTIVE, UNSUBSCRIBED, BOUNCED, COMPLAINED
- RecipientStatus: PENDING, QUEUED, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, FAILED, UNSUBSCRIBED
- EventType: SENT, DELIVERED, OPENED, CLICKED, BOUNCED, UNSUBSCRIBED, COMPLAINED

### Email System
- `src/lib/email/sender.ts` - SMTP integration with Nodemailer, factory pattern via `createEmailSender()`. Supports presets: gmail, outlook, yahoo, sendgrid, mailgun, ses, zoho
- `src/lib/email/merge-tags.ts` - Template variable processing ({{firstName}}, {{lastName}}, {{email}}, {{company}}, {{customField1}}, {{customField2}}, {{unsubscribeLink}}, {{date}})
- `src/lib/email/validator.ts` - Email validation

### Middleware
`src/middleware.ts` handles:
- CSRF protection for API routes (validates token from `X-CSRF-Token` header)
- Public API routes exempt from CSRF: `/api/health`, `/api/track`, `/api/unsubscribe`
- Internationalization routing via next-intl

### Internationalization
Two locales: English (en) and Arabic (ar) with RTL support. Config in `src/i18n/config.ts`. Routes use `[locale]` dynamic segment with `localePrefix: 'as-needed'`.

### Queue System
Uses BullMQ with Redis for email queue processing.

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

Optional:
- `NEXT_PUBLIC_CONTACT_EMAIL` - Contact email for footer
- `NEXT_PUBLIC_SUPPORT_EMAIL` - Support email
- `NEXT_PUBLIC_CONTACT_PHONE` - Contact phone
- `NEXT_PUBLIC_TRACK_OPENS` - Enable open tracking (default: true)
- `NEXT_PUBLIC_TRACK_CLICKS` - Enable click tracking (default: true)
