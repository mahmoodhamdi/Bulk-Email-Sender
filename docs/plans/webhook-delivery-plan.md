# Webhook Delivery System - Implementation Plan

## Overview

This feature implements **outbound webhook delivery** that allows users to send HTTP POST requests to external URLs when specific events occur in the email system. This enables integration with external services like CRMs, analytics platforms, Slack, Zapier, etc.

## Current State

- **Inbound webhooks exist**: `POST /api/tracking/webhook` receives events from email providers (SendGrid, Mailgun, etc.)
- **Automation UI exists**: The automation store defines a `webhook` action type but has no backend implementation
- **Queue system exists**: BullMQ + Redis infrastructure is ready and can be extended for webhook jobs
- **Event tracking exists**: All email events (open, click, bounce, etc.) are recorded in the `EmailEvent` table

## Feature Scope

### What Will Be Implemented

1. **Webhook Configuration** - CRUD for webhook endpoints
2. **Webhook Queue** - Dedicated queue for reliable delivery
3. **Webhook Worker** - Processes webhook jobs with retry logic
4. **Event-based Triggers** - Fire webhooks on email events
5. **Delivery Logging** - Track all webhook attempts and responses
6. **Webhook Testing** - Test endpoint connectivity

### Trigger Events

| Event | Description |
|-------|-------------|
| `email.sent` | Email successfully sent to SMTP |
| `email.delivered` | Email delivered (provider confirmation) |
| `email.opened` | Recipient opened email |
| `email.clicked` | Recipient clicked a link |
| `email.bounced` | Email bounced (hard/soft) |
| `email.unsubscribed` | Recipient unsubscribed |
| `email.complained` | Spam complaint received |
| `campaign.started` | Campaign started sending |
| `campaign.completed` | Campaign finished sending |
| `contact.created` | New contact added |
| `contact.updated` | Contact information changed |

---

## Database Schema

### New Models (add to `prisma/schema.prisma`)

```prisma
model Webhook {
  id          String   @id @default(cuid())
  name        String
  url         String   // Target URL for POST requests
  secret      String?  // Optional secret for signature verification

  // Events this webhook subscribes to
  events      String[] @default([]) // e.g., ["email.opened", "email.clicked"]

  // Authentication
  authType    WebhookAuthType @default(NONE)
  authHeader  String?  // Header name for auth (e.g., "Authorization")
  authValue   String?  // Encrypted auth value (e.g., "Bearer xxx")

  // Configuration
  isActive    Boolean  @default(true)
  timeout     Int      @default(30000) // Request timeout in ms
  maxRetries  Int      @default(3)

  // Filters (optional - limit to specific campaigns/contacts)
  campaignIds String[] @default([])
  contactListIds String[] @default([])

  // Owner
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  deliveries  WebhookDelivery[]

  @@index([userId])
  @@index([isActive])
}

enum WebhookAuthType {
  NONE
  BASIC      // Basic authentication
  BEARER     // Bearer token
  API_KEY    // Custom header with API key
  HMAC       // HMAC signature in header
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  webhookId   String
  webhook     Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  // Event details
  event       String   // e.g., "email.opened"
  payload     Json     // The data sent to the webhook

  // Delivery status
  status      WebhookDeliveryStatus @default(PENDING)
  attempts    Int      @default(0)

  // Response details
  statusCode  Int?
  response    String?  @db.Text
  error       String?

  // Timing
  scheduledAt DateTime @default(now())
  deliveredAt DateTime?
  nextRetryAt DateTime?

  createdAt   DateTime @default(now())

  @@index([webhookId])
  @@index([status])
  @@index([event])
  @@index([createdAt])
}

enum WebhookDeliveryStatus {
  PENDING
  PROCESSING
  DELIVERED
  FAILED
  RETRYING
}
```

### Update User Model

```prisma
model User {
  // ... existing fields
  webhooks    Webhook[]
}
```

---

## Directory Structure

```
src/
├── lib/
│   └── webhook/
│       ├── index.ts           # Main exports
│       ├── types.ts           # TypeScript types and Zod schemas
│       ├── webhook-queue.ts   # BullMQ queue for webhooks
│       ├── webhook-worker.ts  # Worker to process webhook jobs
│       ├── webhook-service.ts # High-level webhook operations
│       └── signature.ts       # HMAC signature generation
├── app/
│   └── api/
│       └── webhooks/
│           ├── route.ts           # GET (list) / POST (create)
│           ├── [id]/
│           │   ├── route.ts       # GET / PATCH / DELETE
│           │   ├── test/
│           │   │   └── route.ts   # POST - Test webhook
│           │   └── deliveries/
│           │       └── route.ts   # GET - List deliveries
│           └── events/
│               └── route.ts       # GET - List available events
```

---

## API Endpoints

### 1. Webhook CRUD

#### `GET /api/webhooks`
List all webhooks for the authenticated user.

**Response:**
```json
{
  "webhooks": [
    {
      "id": "clx...",
      "name": "Slack Notifications",
      "url": "https://hooks.slack.com/...",
      "events": ["email.opened", "email.clicked"],
      "isActive": true,
      "authType": "NONE",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### `POST /api/webhooks`
Create a new webhook.

**Request:**
```json
{
  "name": "CRM Integration",
  "url": "https://api.crm.com/webhooks",
  "events": ["email.opened", "email.clicked", "email.bounced"],
  "authType": "BEARER",
  "authValue": "your-api-token",
  "timeout": 30000,
  "maxRetries": 3
}
```

#### `GET /api/webhooks/[id]`
Get webhook details including recent deliveries.

#### `PATCH /api/webhooks/[id]`
Update webhook configuration.

#### `DELETE /api/webhooks/[id]`
Delete webhook and all delivery history.

### 2. Webhook Testing

#### `POST /api/webhooks/[id]/test`
Send a test payload to verify connectivity.

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 245,
  "response": "OK"
}
```

### 3. Delivery History

#### `GET /api/webhooks/[id]/deliveries`
List delivery attempts with pagination.

**Query params:** `?page=1&limit=20&status=FAILED`

**Response:**
```json
{
  "deliveries": [
    {
      "id": "clx...",
      "event": "email.opened",
      "status": "DELIVERED",
      "statusCode": 200,
      "attempts": 1,
      "deliveredAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

### 4. Available Events

#### `GET /api/webhooks/events`
List all available webhook events.

**Response:**
```json
{
  "events": [
    { "id": "email.sent", "name": "Email Sent", "description": "Triggered when an email is sent" },
    { "id": "email.opened", "name": "Email Opened", "description": "Triggered when recipient opens email" }
  ]
}
```

---

## Queue System

### Webhook Queue (`src/lib/webhook/webhook-queue.ts`)

```typescript
interface WebhookJobData {
  webhookId: string;
  deliveryId: string;
  url: string;
  payload: WebhookPayload;
  authType: WebhookAuthType;
  authHeader?: string;
  authValue?: string;
  secret?: string;
  timeout: number;
  attempt: number;
  maxRetries: number;
}

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    campaignId?: string;
    campaignName?: string;
    recipientId?: string;
    contactId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    metadata?: Record<string, unknown>;
  };
}
```

### Queue Configuration

- **Queue name:** `webhook-delivery`
- **Concurrency:** 10 (configurable via `WEBHOOK_WORKER_CONCURRENCY`)
- **Rate limit:** 100 jobs/second
- **Default timeout:** 30 seconds
- **Retry strategy:** Exponential backoff (1min, 5min, 30min)
- **Max retries:** 3 (configurable per webhook)
- **Job retention:** 24h completed, 7 days failed

---

## Webhook Worker (`src/lib/webhook/webhook-worker.ts`)

### Processing Flow

```
1. Receive job from queue
2. Update delivery status to PROCESSING
3. Build HTTP request:
   - Set Content-Type: application/json
   - Add authentication headers
   - Generate HMAC signature (if configured)
4. Send POST request with timeout
5. On success (2xx):
   - Update delivery status to DELIVERED
   - Store response code and body
6. On failure:
   - If retries remaining:
     - Update status to RETRYING
     - Schedule next attempt with backoff
   - If no retries:
     - Update status to FAILED
     - Store error message
```

### HMAC Signature

When `authType: HMAC`, generate signature:

```typescript
const signature = crypto
  .createHmac('sha256', webhook.secret)
  .update(JSON.stringify(payload))
  .digest('hex');

headers['X-Webhook-Signature'] = `sha256=${signature}`;
headers['X-Webhook-Timestamp'] = timestamp;
```

---

## Integration Points

### 1. Email Worker Integration

Update `src/lib/queue/email-worker.ts` to fire webhooks:

```typescript
// After successful send
await webhookService.fireEvent('email.sent', {
  campaignId,
  recipientId,
  email: recipient.email,
  // ...
});
```

### 2. Tracking Endpoint Integration

Update tracking routes to fire webhooks:

**`src/app/api/tracking/open/route.ts`:**
```typescript
// After recording open
await webhookService.fireEvent('email.opened', { ... });
```

**`src/app/api/tracking/click/route.ts`:**
```typescript
// After recording click
await webhookService.fireEvent('email.clicked', { ... });
```

### 3. Inbound Webhook Integration

Update `src/app/api/tracking/webhook/route.ts`:

```typescript
// After processing provider webhook
await webhookService.fireEvent(`email.${eventType.toLowerCase()}`, { ... });
```

---

## Webhook Service (`src/lib/webhook/webhook-service.ts`)

### Main Functions

```typescript
// Fire an event to all subscribed webhooks
async function fireEvent(
  event: WebhookEvent,
  data: WebhookEventData,
  options?: { userId?: string; campaignId?: string }
): Promise<void>

// Queue a webhook delivery
async function queueDelivery(
  webhook: Webhook,
  event: string,
  payload: WebhookPayload
): Promise<WebhookDelivery>

// Retry a failed delivery
async function retryDelivery(deliveryId: string): Promise<void>

// Get delivery statistics
async function getDeliveryStats(
  webhookId: string,
  period: 'day' | 'week' | 'month'
): Promise<WebhookStats>
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT SOURCES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Email Worker │  │ Tracking API │  │ Provider Webhooks    │  │
│  │  (sent)      │  │ (open/click) │  │ (delivered/bounced)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │               │
│         └────────────────┬┴─────────────────────┘               │
│                          │                                       │
│                          ▼                                       │
│               ┌─────────────────────┐                           │
│               │  webhookService.    │                           │
│               │  fireEvent()        │                           │
│               └──────────┬──────────┘                           │
│                          │                                       │
│                          ▼                                       │
│         ┌────────────────────────────────┐                      │
│         │  Find webhooks subscribed to   │                      │
│         │  this event (active only)      │                      │
│         └────────────────┬───────────────┘                      │
│                          │                                       │
│              ┌───────────┴───────────┐                          │
│              ▼                       ▼                          │
│    ┌─────────────────┐     ┌─────────────────┐                 │
│    │ Webhook A       │     │ Webhook B       │                 │
│    │ (Slack)         │     │ (CRM)           │                 │
│    └────────┬────────┘     └────────┬────────┘                 │
│             │                       │                           │
│             ▼                       ▼                           │
│    ┌─────────────────┐     ┌─────────────────┐                 │
│    │ Create delivery │     │ Create delivery │                 │
│    │ record (PENDING)│     │ record (PENDING)│                 │
│    └────────┬────────┘     └────────┬────────┘                 │
│             │                       │                           │
│             └───────────┬───────────┘                          │
│                         ▼                                       │
│              ┌─────────────────────┐                           │
│              │   Webhook Queue     │                           │
│              │   (BullMQ/Redis)    │                           │
│              └──────────┬──────────┘                           │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                           │
│              │   Webhook Worker    │                           │
│              └──────────┬──────────┘                           │
│                         │                                       │
│         ┌───────────────┼───────────────┐                      │
│         ▼               ▼               ▼                      │
│    ┌─────────┐    ┌──────────┐    ┌──────────┐                │
│    │ SUCCESS │    │  RETRY   │    │  FAILED  │                │
│    │ (2xx)   │    │ (5xx/    │    │ (max     │                │
│    │         │    │ timeout) │    │ retries) │                │
│    └────┬────┘    └────┬─────┘    └────┬─────┘                │
│         │              │               │                       │
│         ▼              ▼               ▼                       │
│    ┌─────────┐    ┌──────────┐    ┌──────────┐                │
│    │DELIVERED│    │ RETRYING │    │  FAILED  │                │
│    │ status  │    │ +backoff │    │  status  │                │
│    └─────────┘    └──────────┘    └──────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payload Examples

### Email Opened

```json
{
  "event": "email.opened",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "campaignId": "clx123...",
    "campaignName": "January Newsletter",
    "recipientId": "clx456...",
    "contactId": "clx789...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "openCount": 1
    }
  }
}
```

### Email Bounced

```json
{
  "event": "email.bounced",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "campaignId": "clx123...",
    "recipientId": "clx456...",
    "email": "invalid@example.com",
    "metadata": {
      "bounceType": "hard",
      "bounceSubType": "general",
      "diagnosticCode": "550 User not found"
    }
  }
}
```

### Campaign Completed

```json
{
  "event": "campaign.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "campaignId": "clx123...",
    "campaignName": "January Newsletter",
    "metadata": {
      "totalRecipients": 5000,
      "sentCount": 4950,
      "deliveredCount": 4800,
      "bouncedCount": 50,
      "duration": "2h 15m"
    }
  }
}
```

---

## Implementation Order

### Phase 1: Core Infrastructure
1. Add Prisma schema for `Webhook` and `WebhookDelivery`
2. Run database migration
3. Create `src/lib/webhook/types.ts` with types and Zod schemas
4. Create `src/lib/webhook/webhook-queue.ts`
5. Create `src/lib/webhook/webhook-worker.ts`
6. Create `src/lib/webhook/signature.ts`

### Phase 2: API Routes
1. Create `POST/GET /api/webhooks` - Create and list webhooks
2. Create `GET/PATCH/DELETE /api/webhooks/[id]` - Single webhook operations
3. Create `POST /api/webhooks/[id]/test` - Test webhook endpoint
4. Create `GET /api/webhooks/[id]/deliveries` - Delivery history
5. Create `GET /api/webhooks/events` - List available events

### Phase 3: Webhook Service
1. Create `src/lib/webhook/webhook-service.ts`
2. Implement `fireEvent()` function
3. Implement delivery queueing and retry logic

### Phase 4: Integration
1. Integrate with email worker (sent events)
2. Integrate with tracking endpoints (open/click events)
3. Integrate with inbound webhook handler (delivered/bounced/etc.)

### Phase 5: Testing
1. Unit tests for webhook service
2. Integration tests for API routes
3. Integration tests for queue/worker

---

## Environment Variables

```env
# Webhook Worker Configuration
WEBHOOK_WORKER_CONCURRENCY=10    # Concurrent webhook deliveries
WEBHOOK_RATE_LIMIT_MAX=100       # Max deliveries per second
WEBHOOK_DEFAULT_TIMEOUT=30000    # Default timeout in ms
WEBHOOK_MAX_RETRIES=3            # Default max retries
```

---

## Security Considerations

1. **Secret Encryption**: Store `authValue` encrypted using existing `encryptString()` from `src/lib/crypto.ts`
2. **URL Validation**: Validate webhook URLs (no localhost, private IPs in production)
3. **Payload Size**: Limit payload size to prevent memory issues
4. **Rate Limiting**: Implement per-webhook rate limiting to prevent abuse
5. **SSRF Prevention**: Block requests to internal networks
6. **Signature Verification**: Document how recipients should verify HMAC signatures

---

## Usage After Implementation

### Creating a Webhook via API

```bash
curl -X POST /api/webhooks \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/xxx",
    "events": ["email.opened", "email.clicked"],
    "authType": "NONE"
  }'
```

### Testing a Webhook

```bash
curl -X POST /api/webhooks/clx123/test \
  -H "X-CSRF-Token: $TOKEN"
```

### Viewing Delivery History

```bash
curl /api/webhooks/clx123/deliveries?status=FAILED
```

---

## Files to Create/Modify

### New Files
- `prisma/schema.prisma` (modify)
- `src/lib/webhook/index.ts`
- `src/lib/webhook/types.ts`
- `src/lib/webhook/webhook-queue.ts`
- `src/lib/webhook/webhook-worker.ts`
- `src/lib/webhook/webhook-service.ts`
- `src/lib/webhook/signature.ts`
- `src/app/api/webhooks/route.ts`
- `src/app/api/webhooks/[id]/route.ts`
- `src/app/api/webhooks/[id]/test/route.ts`
- `src/app/api/webhooks/[id]/deliveries/route.ts`
- `src/app/api/webhooks/events/route.ts`
- `__tests__/unit/lib/webhook/webhook-service.test.ts`
- `__tests__/integration/api/webhooks.test.ts`
- `src/messages/en.json` (add webhook translations)
- `src/messages/ar.json` (add webhook translations)

### Files to Modify
- `src/lib/queue/email-worker.ts` (add webhook firing)
- `src/app/api/tracking/open/route.ts` (add webhook firing)
- `src/app/api/tracking/click/route.ts` (add webhook firing)
- `src/app/api/tracking/webhook/route.ts` (add outbound webhook firing)
- `CLAUDE.md` (document webhook system)
