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
- `src/lib/` - Core libraries
  - `src/lib/email/` - Email sending logic (sender, merge-tags, validator)
  - `src/lib/db/` - Database utilities (Prisma client)
- `src/components/` - React components (UI primitives in `ui/`)
- `src/i18n/` - Internationalization config (next-intl)
- `src/messages/` - Translation files (en.json, ar.json)
- `prisma/` - Database schema (PostgreSQL)
- `__tests__/` - Test files
  - `__tests__/unit/` - Unit tests
  - `__tests__/e2e/` - Playwright E2E tests
- `docker/` - Docker configuration

### Path Aliases
Use `@/*` to import from `src/*` (e.g., `import { cn } from '@/lib/utils'`)

### Database Schema (Prisma)
Key models: Campaign, Template, Contact, ContactList, Recipient, EmailEvent, SmtpConfig, Unsubscribe. Campaign statuses: DRAFT, SCHEDULED, SENDING, PAUSED, COMPLETED, CANCELLED.

### Email System
- `src/lib/email/sender.ts` - SMTP integration with Nodemailer, supports presets for Gmail, Outlook, Yahoo, SendGrid, Mailgun, SES, Zoho
- `src/lib/email/merge-tags.ts` - Template variable processing ({{firstName}}, {{lastName}}, {{email}}, etc.)
- `src/lib/email/validator.ts` - Email validation

### Internationalization
Two locales: English (en) and Arabic (ar) with RTL support. Translations in `src/messages/`. Routes use `[locale]` dynamic segment with `localePrefix: 'as-needed'`.

### Queue System
Uses BullMQ with Redis for email queue processing.

### State Management
Uses Zustand for client-side state management.

## Testing Strategy

- Unit tests: `__tests__/unit/` - Test individual functions/components
- Integration tests: `__tests__/integration/` - Configured via `vitest.integration.config.ts` with 30s timeout
- E2E tests: `__tests__/e2e/` - Playwright browser tests

Test files follow pattern: `*.test.ts` for unit/integration, `*.spec.ts` for E2E.

Test setup mocks `next/navigation` and `next-intl` in `src/test/setup.ts`.

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXT_PUBLIC_APP_URL` - Application URL
- `TRACKING_URL` - Email tracking endpoint URL
