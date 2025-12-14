# Unsubscribe Management Feature Plan

## Overview
This feature provides comprehensive unsubscribe management for email campaigns, ensuring compliance with anti-spam regulations (CAN-SPAM, GDPR) and maintaining a clean sender reputation.

## Competitor Analysis
- **Mailchimp**: One-click unsubscribe, suppression lists, re-subscription option
- **SendGrid**: Global suppression list, group unsubscribes, bounce management
- **Constant Contact**: Preference center, list-specific unsubscribes
- **HubSpot**: Subscription types, email preferences page

## Features to Implement

### 1. Unsubscribe Landing Page
- Professional unsubscribe confirmation page
- Optional feedback form (why unsubscribing)
- Re-subscription option
- Preference center (reduce frequency vs full unsubscribe)
- RTL support for Arabic

### 2. Suppression List Management
- View all unsubscribed contacts
- Import/export suppression list
- Manual add to suppression list
- Search and filter
- Bulk operations (re-subscribe, delete)
- Reason tracking

### 3. Unsubscribe Types
- Global unsubscribe (all emails)
- List-specific unsubscribe
- Campaign type preferences
- Temporary pause (snooze emails)

### 4. Compliance Features
- Automatic List-Unsubscribe header
- One-click unsubscribe support (RFC 8058)
- Honor unsubscribe within 10 days (CAN-SPAM)
- Audit trail for compliance

## Technical Implementation

### Files to Create/Modify

#### New Store
1. `src/stores/unsubscribe-store.ts` - Unsubscribe state management

#### New Components
1. `src/components/unsubscribe/UnsubscribeForm.tsx` - Unsubscribe confirmation form
2. `src/components/unsubscribe/SuppressionList.tsx` - List of unsubscribed contacts
3. `src/components/unsubscribe/UnsubscribeStats.tsx` - Unsubscribe analytics
4. `src/components/unsubscribe/ImportExport.tsx` - Import/export suppression list
5. `src/components/unsubscribe/index.ts` - Barrel export

#### New Pages
1. `src/app/[locale]/unsubscribe/page.tsx` - Unsubscribe landing page
2. `src/app/[locale]/contacts/suppression/page.tsx` - Suppression list management

#### API Routes
1. `src/app/api/unsubscribe/route.ts` - Process unsubscribe requests
2. `src/app/api/unsubscribe/[token]/route.ts` - Token-based unsubscribe
3. `src/app/api/suppression/route.ts` - Suppression list CRUD

#### Translations
- Update `src/messages/en.json` and `src/messages/ar.json`

### Store Structure
```typescript
interface UnsubscribeStore {
  // Suppression list
  suppressionList: SuppressedContact[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  reasonFilter: UnsubscribeReason | 'all';
  dateRange: DateRange;

  // Stats
  stats: UnsubscribeStats;

  // Actions
  loadSuppressionList: () => Promise<void>;
  addToSuppression: (email: string, reason: UnsubscribeReason) => Promise<void>;
  removeFromSuppression: (id: string) => Promise<void>;
  bulkRemove: (ids: string[]) => Promise<void>;
  importSuppression: (emails: string[]) => Promise<void>;
  exportSuppression: () => string;
  processUnsubscribe: (token: string, feedback?: string) => Promise<void>;
}

interface SuppressedContact {
  id: string;
  email: string;
  reason: UnsubscribeReason;
  campaignId?: string;
  campaignName?: string;
  feedback?: string;
  suppressedAt: Date;
  source: 'manual' | 'link' | 'import' | 'bounce' | 'complaint';
}

type UnsubscribeReason =
  | 'not_interested'
  | 'too_frequent'
  | 'never_subscribed'
  | 'inappropriate_content'
  | 'other';
```

### Unsubscribe Token System
- Generate unique token per recipient per campaign
- Token contains: recipientId, campaignId, timestamp
- Token encrypted with app secret
- Expiry: 30 days after campaign send

### Database Schema Updates (Prisma)
```prisma
model Suppression {
  id           String   @id @default(cuid())
  email        String   @unique
  reason       String
  feedback     String?
  campaignId   String?
  source       String   @default("link")
  suppressedAt DateTime @default(now())
  campaign     Campaign? @relation(fields: [campaignId], references: [id])
}
```

## UI Flow

### Unsubscribe Flow
1. User clicks unsubscribe link in email
2. Lands on branded unsubscribe page
3. Confirms unsubscribe (optional feedback)
4. Sees confirmation message
5. Option to re-subscribe shown

### Admin Flow
1. Navigate to Contacts > Suppression List
2. View all unsubscribed contacts with stats
3. Filter by date, reason, campaign
4. Import/export suppression list
5. Manually add emails to suppression

## Testing Strategy

### Unit Tests
- Unsubscribe store actions
- Token generation and validation
- Suppression list filtering
- CSV export format

### Integration Tests
- Full unsubscribe workflow
- Suppression list CRUD
- Import/export functionality

### E2E Tests
- Unsubscribe page responsiveness
- RTL support
- Form submission
