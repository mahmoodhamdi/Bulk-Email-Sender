# Email Preview & Test Send Feature Plan

## Overview
This feature allows users to preview how their email will look before sending and send test emails to verify rendering across different email clients.

## Competitor Analysis
- **Mailchimp**: Preview with inbox view, test send to multiple addresses
- **SendGrid**: Email testing with spam check, multiple device previews
- **Constant Contact**: Preview mode with personalization testing
- **HubSpot**: Smart preview with dark mode and mobile views

## Features to Implement

### 1. Email Preview Component
- Live preview of email content with merge tag interpolation
- Desktop/Mobile/Tablet responsive preview toggles
- Dark mode preview toggle
- RTL preview support for Arabic
- Preview different email clients (Gmail, Outlook, Apple Mail styling hints)

### 2. Test Send Dialog
- Send test email to one or multiple email addresses
- Use sample contact data for merge tag preview
- Choose which SMTP config to use for testing
- Show delivery status after test send

### 3. Spam Score Analysis
- Basic spam keyword detection
- Subject line analysis
- Link analysis (broken links, too many links)
- Image-to-text ratio check
- Missing unsubscribe link warning

### 4. Personalization Preview
- Select a contact from list to preview personalization
- See all merge tags replaced with actual data
- Cycle through different contacts to verify merge tags

## Technical Implementation

### Files to Create/Modify

#### New Components
1. `src/components/preview/EmailPreview.tsx` - Main preview component
2. `src/components/preview/DeviceToggle.tsx` - Device size selector
3. `src/components/preview/TestSendDialog.tsx` - Test send modal
4. `src/components/preview/SpamScoreCard.tsx` - Spam analysis display
5. `src/components/preview/PersonalizationPicker.tsx` - Contact selector for preview
6. `src/components/preview/index.ts` - Barrel export

#### New Store
1. `src/stores/preview-store.ts` - Preview state management

#### New API Routes
1. `src/app/api/email/test/route.ts` - Test send endpoint
2. `src/app/api/email/spam-check/route.ts` - Spam analysis endpoint

#### Modify
1. `src/app/[locale]/campaigns/new/page.tsx` - Add preview step
2. `src/app/[locale]/templates/builder/page.tsx` - Add preview button
3. `src/messages/en.json` - Add translations
4. `src/messages/ar.json` - Add Arabic translations

### Store Structure
```typescript
interface PreviewStore {
  // Preview state
  previewMode: 'desktop' | 'mobile' | 'tablet';
  darkMode: boolean;
  emailClient: 'default' | 'gmail' | 'outlook' | 'apple';

  // Content
  subject: string;
  htmlContent: string;
  previewContact: Contact | null;

  // Test send
  testEmails: string[];
  testSending: boolean;
  testResult: TestSendResult | null;

  // Spam analysis
  spamScore: SpamAnalysis | null;
  isAnalyzing: boolean;

  // Actions
  setPreviewMode: (mode: 'desktop' | 'mobile' | 'tablet') => void;
  setDarkMode: (enabled: boolean) => void;
  setEmailClient: (client: string) => void;
  setPreviewContact: (contact: Contact | null) => void;
  sendTestEmail: () => Promise<void>;
  analyzeSpam: () => Promise<void>;
  getRenderedContent: () => string;
}
```

### Spam Analysis Rules
1. **Subject Line**
   - Check for ALL CAPS words
   - Check for excessive punctuation (!!!, ???)
   - Check for spam trigger words (free, urgent, act now, etc.)

2. **Content**
   - Image-to-text ratio (warn if >40% images)
   - Link count (warn if >5 links)
   - Check for missing unsubscribe
   - Check for display:none hidden content

3. **Technical**
   - Validate HTML structure
   - Check for broken images (src validation)
   - Verify all links are HTTPS

## UI Flow

### Campaign Creation Flow
1. User creates campaign with subject and content
2. User clicks "Preview & Test" button
3. Preview modal opens showing:
   - Device toggle (desktop/mobile/tablet)
   - Dark mode toggle
   - Email client selector
   - Personalization contact selector
   - Spam score card
   - Test send section
4. User can send test email
5. User closes preview and continues to schedule/send

### Template Builder Flow
1. User is building email template
2. Real-time preview panel on right side
3. Quick test send button
4. Spam score updates as user types

## Testing Strategy

### Unit Tests
- Preview store actions and state
- Spam analysis algorithm
- Merge tag replacement in preview
- Device viewport calculations

### Integration Tests
- Full preview workflow
- Test send with mock SMTP
- Spam analysis integration

### E2E Tests
- Preview responsive on different devices
- Test send button functionality
- RTL support for Arabic preview
