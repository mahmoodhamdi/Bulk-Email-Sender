# Bulk Email Sender - Architecture Documentation

This document provides an overview of the system architecture for the Bulk Email Sender application.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [Email Queue Architecture](#email-queue-architecture)
6. [Authentication Flow](#authentication-flow)
7. [Webhook Delivery System](#webhook-delivery-system)
8. [A/B Testing Flow](#ab-testing-flow)
9. [Payment System](#payment-system)

---

## System Overview

```mermaid
graph TB
    subgraph Client
        Browser[Web Browser]
        API_Client[API Client]
    end

    subgraph "Next.js Application"
        Pages[Pages - App Router]
        API[API Routes]
        Middleware[Middleware<br/>CSRF + i18n]
    end

    subgraph "Background Workers"
        EmailWorker[Email Worker]
        WebhookWorker[Webhook Worker]
    end

    subgraph "External Services"
        SMTP[SMTP Servers<br/>Gmail, SendGrid, etc.]
        OAuth[OAuth Providers<br/>Google, GitHub]
        Firebase[Firebase<br/>FCM + Auth]
        Payments[Payment Gateways<br/>Stripe, Paymob, PayTabs, Paddle]
    end

    subgraph "Data Stores"
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis)]
    end

    Browser --> Pages
    Browser --> API
    API_Client --> API
    Pages --> Middleware --> API
    API --> PostgreSQL
    API --> Redis
    EmailWorker --> Redis
    EmailWorker --> SMTP
    EmailWorker --> PostgreSQL
    WebhookWorker --> Redis
    WebhookWorker --> PostgreSQL
    API --> OAuth
    API --> Firebase
```

---

## Component Architecture

```mermaid
graph LR
    subgraph "Frontend Layer"
        A[React Components]
        B[Zustand Stores]
        C[Custom Hooks]
        D[i18n - next-intl]
    end

    subgraph "API Layer"
        E[API Routes]
        F[Middleware]
        G[Rate Limiting]
        H[CSRF Protection]
    end

    subgraph "Service Layer"
        I[Auth Service]
        J[Email Service]
        K[Queue Service]
        L[Webhook Service]
        M[Template Service]
        N[A/B Test Service]
        O2[Payment Service]
        P2[Subscription Service]
    end

    subgraph "Data Layer"
        O[Prisma Client]
        P[Redis Client]
    end

    A --> B
    B --> C
    A --> E
    E --> F --> G --> H
    E --> I
    E --> J
    E --> K
    E --> L
    E --> M
    E --> N
    I --> O
    J --> O
    K --> P
    L --> P
    M --> O
    N --> O
```

---

## Data Flow

### Campaign Sending Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant DB as PostgreSQL
    participant Q as Redis Queue
    participant W as Email Worker
    participant SMTP as SMTP Server
    participant WH as Webhook

    U->>API: Create Campaign
    API->>DB: Save Campaign (DRAFT)
    U->>API: Add Recipients
    API->>DB: Save Recipients (PENDING)
    U->>API: Start Sending
    API->>DB: Update Status (SENDING)
    API->>Q: Queue Email Jobs

    loop For Each Recipient
        W->>Q: Get Next Job
        W->>DB: Update Status (QUEUED)
        W->>SMTP: Send Email
        alt Success
            SMTP-->>W: Message ID
            W->>DB: Update Status (SENT)
            W->>WH: Fire email.sent event
        else Failure
            SMTP-->>W: Error
            W->>DB: Update Status (FAILED)
        end
    end

    W->>DB: Update Campaign (COMPLETED)
    W->>WH: Fire campaign.completed event
```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Campaign : owns
    User ||--o{ Contact : owns
    User ||--o{ Template : owns
    User ||--o{ ApiKey : has
    User ||--o{ Webhook : owns
    User ||--o| Subscription : has
    Subscription ||--o{ Payment : has
    Subscription ||--o{ Invoice : has

    Campaign ||--o{ Recipient : has
    Campaign ||--o| ABTest : has
    Campaign }o--|| Template : uses

    Contact ||--o{ Recipient : "sent to"
    Contact }o--o{ ContactList : "belongs to"

    Recipient ||--o{ EmailEvent : generates
    Recipient }o--o| ABTestVariant : "assigned to"

    ABTest ||--o{ ABTestVariant : has

    Template ||--o{ TemplateVersion : versions

    Webhook ||--o{ WebhookDelivery : delivers

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        enum role
        datetime createdAt
    }

    Campaign {
        string id PK
        string userId FK
        string name
        string subject
        string content
        enum status
        int totalRecipients
        int sentCount
        datetime scheduledAt
    }

    Contact {
        string id PK
        string userId FK
        string email UK
        string firstName
        string lastName
        enum status
        string[] tags
    }

    Recipient {
        string id PK
        string campaignId FK
        string contactId FK
        string email
        enum status
        string trackingId UK
    }

    Template {
        string id PK
        string userId FK
        string name
        string subject
        string content
        int currentVersion
    }

    ABTest {
        string id PK
        string campaignId FK UK
        enum testType
        int sampleSize
        enum status
        string winnerId FK
    }
```

---

## Email Queue Architecture

```mermaid
graph TB
    subgraph "Queue Producer"
        API[API Route]
        QS[Queue Service]
    end

    subgraph "Redis - BullMQ"
        EQ[Email Queue]
        WQ[Webhook Queue]
        JM[Job Manager]
    end

    subgraph "Queue Consumer"
        EW[Email Worker]
        WW[Webhook Worker]
    end

    subgraph "Processing"
        RL[Rate Limiter]
        RT[Retry Logic]
        BF[Backoff Strategy]
    end

    API --> QS
    QS --> EQ
    QS --> WQ

    EQ --> JM --> EW
    WQ --> JM --> WW

    EW --> RL
    EW --> RT --> BF
    WW --> RT --> BF

    style EQ fill:#f9f,stroke:#333
    style WQ fill:#f9f,stroke:#333
```

### Queue Job States

```mermaid
stateDiagram-v2
    [*] --> Waiting
    Waiting --> Active: Worker picks up
    Active --> Completed: Success
    Active --> Failed: Error
    Failed --> Waiting: Retry
    Failed --> [*]: Max retries exceeded
    Completed --> [*]

    Active --> Delayed: Rate limited
    Delayed --> Waiting: Delay expired
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant M as Middleware
    participant A as NextAuth
    participant DB as Database

    rect rgb(200, 220, 255)
        Note over U,DB: Session-based Auth
        U->>C: Login (email/password)
        C->>A: POST /api/auth/signin
        A->>DB: Verify credentials
        DB-->>A: User data
        A->>A: Create session
        A-->>C: Set session cookie
        C-->>U: Logged in
    end

    rect rgb(220, 255, 200)
        Note over U,DB: API Key Auth
        U->>C: API Request + API Key
        C->>M: Authorization: Bearer bes_xxx
        M->>DB: Validate API key
        DB-->>M: Key + permissions
        M-->>C: Request authorized
    end

    rect rgb(255, 220, 200)
        Note over U,DB: OAuth Flow
        U->>C: Login with Google
        C->>A: GET /api/auth/signin/google
        A-->>U: Redirect to Google
        U->>A: Google callback
        A->>DB: Create/update user
        A-->>C: Set session cookie
    end
```

---

## Webhook Delivery System

```mermaid
sequenceDiagram
    participant E as Event Source
    participant WS as Webhook Service
    participant Q as Webhook Queue
    participant W as Webhook Worker
    participant EP as External Endpoint
    participant DB as Database

    E->>WS: fireEvent(type, data)
    WS->>DB: Find active webhooks
    DB-->>WS: Matching webhooks

    loop For each webhook
        WS->>Q: Queue delivery job
    end

    W->>Q: Get delivery job
    W->>W: Generate signature
    W->>EP: POST with payload + headers

    alt Success (2xx)
        EP-->>W: Response
        W->>DB: Mark DELIVERED
    else Failure
        EP-->>W: Error/Timeout
        W->>DB: Mark RETRYING
        W->>Q: Schedule retry (exponential backoff)
    end

    Note over W,Q: Retry: 1min -> 5min -> 30min
    Note over W,Q: Max 3 retries
```

### Webhook Payload Structure

```json
{
  "id": "evt_xxx",
  "event": "email.sent",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": {
    "emailId": "...",
    "recipientEmail": "...",
    "campaignId": "..."
  }
}
```

---

## A/B Testing Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant AB as A/B Service
    participant Q as Queue
    participant W as Worker
    participant DB as Database

    U->>API: Create A/B Test
    API->>DB: Save test + variants

    U->>API: Start Campaign
    API->>AB: Split recipients
    AB->>DB: Assign variants to recipients

    loop Test Phase
        AB->>Q: Queue variant emails
        W->>W: Send with variant content
        W->>DB: Track opens/clicks
    end

    alt Auto-select winner
        AB->>AB: Wait for test duration
        AB->>DB: Calculate winner
    else Manual selection
        U->>API: Select winner
    end

    AB->>Q: Queue remaining recipients
    Note right of Q: With winner content
```

### A/B Test States

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Running: Start test
    Running --> Completed: Select winner
    Running --> Cancelled: Cancel
    Draft --> Cancelled: Cancel
    Completed --> [*]
    Cancelled --> [*]
```

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Localized pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Base UI components (Radix)
│   ├── email-builder/    # Email builder components
│   └── analytics/        # Analytics components
├── lib/                   # Core libraries
│   ├── auth/             # Authentication
│   ├── email/            # Email sending
│   ├── queue/            # BullMQ queue
│   ├── webhook/          # Webhook delivery
│   ├── ab-test/          # A/B testing
│   ├── cache/            # Redis caching
│   └── rate-limit/       # Rate limiting
├── stores/                # Zustand stores
├── hooks/                 # Custom React hooks
└── i18n/                  # Internationalization
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Next.js 16, Tailwind CSS |
| State Management | Zustand |
| API | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Cache/Queue | Redis + BullMQ |
| Authentication | NextAuth.js v5 |
| Email | Nodemailer |
| Push Notifications | Firebase Cloud Messaging |
| Testing | Vitest + Playwright |
| i18n | next-intl |

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production"
        LB[Load Balancer]

        subgraph "App Servers"
            App1[Next.js Instance 1]
            App2[Next.js Instance 2]
        end

        subgraph "Worker Servers"
            Worker1[Email Worker 1]
            Worker2[Email Worker 2]
            Worker3[Webhook Worker]
        end

        subgraph "Data Layer"
            PG[(PostgreSQL<br/>Primary)]
            PG_R[(PostgreSQL<br/>Replica)]
            Redis[(Redis<br/>Cluster)]
        end
    end

    LB --> App1
    LB --> App2
    App1 --> PG
    App2 --> PG
    App1 --> Redis
    App2 --> Redis
    Worker1 --> Redis
    Worker2 --> Redis
    Worker3 --> Redis
    Worker1 --> PG
    Worker2 --> PG
    Worker3 --> PG
    PG --> PG_R
```

---

## Payment System

Multi-gateway payment system supporting international and regional payment providers.

### Supported Providers

| Provider | Region | Methods |
|----------|--------|---------|
| Stripe | International | Cards, Apple Pay, Google Pay |
| Paymob | Egypt | Cards, Mobile Wallets, Kiosk |
| PayTabs | MENA | Mada, Cards, Apple Pay |
| Paddle | Global | MoR (handles taxes) |

### Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as API
    participant GW as Gateway Factory
    participant SP as Stripe/Paymob/etc
    participant DB as Database
    participant WH as Webhook

    U->>API: Create Checkout (tier, provider)
    API->>GW: Get Gateway Instance
    GW->>SP: Create Checkout Session
    SP-->>API: Session URL
    API-->>U: Redirect to Payment

    U->>SP: Complete Payment
    SP->>WH: Webhook Event
    WH->>DB: Verify Signature
    WH->>DB: Create/Update Subscription
    WH->>DB: Create Payment Record
    WH-->>SP: 200 OK

    U->>API: Return to App
    API->>DB: Check Subscription
    API-->>U: Show Success
```

### Subscription Tiers

```mermaid
graph LR
    subgraph "Tier Hierarchy"
        FREE[FREE<br/>$0/mo<br/>100 emails]
        STARTER[STARTER<br/>$4.99/mo<br/>5K emails]
        PRO[PRO<br/>$14.99/mo<br/>50K emails]
        ENTERPRISE[ENTERPRISE<br/>$49.99/mo<br/>Unlimited]
    end

    FREE --> STARTER --> PRO --> ENTERPRISE
```

### Feature Gating

```mermaid
graph TB
    subgraph "Request Flow"
        REQ[API Request]
        MW[Subscription Middleware]
        FEAT[Feature Check]
        USAGE[Usage Check]
        API[API Handler]
    end

    REQ --> MW
    MW --> FEAT
    FEAT -->|Has Feature| USAGE
    FEAT -->|No Feature| DENY[403 Forbidden]
    USAGE -->|Within Limits| API
    USAGE -->|Over Limit| LIMIT[429 Limit Exceeded]
    API --> RESP[Response]
```

### Gateway Factory Pattern

```mermaid
graph LR
    subgraph "Gateway Factory"
        GF[getPaymentGateway]
        STRIPE[Stripe Gateway]
        PAYMOB[Paymob Gateway]
        PAYTABS[PayTabs Gateway]
        PADDLE[Paddle Gateway]
    end

    GF -->|provider=stripe| STRIPE
    GF -->|provider=paymob| PAYMOB
    GF -->|provider=paytabs| PAYTABS
    GF -->|provider=paddle| PADDLE

    style STRIPE fill:#635bff
    style PAYMOB fill:#1a73e8
    style PAYTABS fill:#00b67a
    style PADDLE fill:#3b82f6
```

### Database Models

```mermaid
erDiagram
    User ||--o| Subscription : has
    Subscription ||--o{ Payment : has
    Subscription ||--o{ PaymentMethod : has
    Subscription ||--o{ Invoice : has

    Subscription {
        string id PK
        string userId FK UK
        enum tier
        enum status
        enum provider
        datetime currentPeriodStart
        datetime currentPeriodEnd
        boolean cancelAtPeriodEnd
        int emailLimit
        int contactLimit
        int emailsSent
    }

    Payment {
        string id PK
        string subscriptionId FK
        int amount
        string currency
        enum status
        enum provider
        string providerPaymentId
    }

    Invoice {
        string id PK
        string subscriptionId FK
        int amount
        string currency
        string pdfUrl
        datetime paidAt
    }
```

---

*Last updated: December 19, 2025*
