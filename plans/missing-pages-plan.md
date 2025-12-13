# Plan: Create Missing Pages

## Problem
The dashboard has navigation links to pages that don't exist yet, causing 404 errors:
- `/campaigns` - Campaigns list page
- `/campaigns/new` - Create new campaign page
- `/templates` - Templates list page
- `/contacts` - Contacts list page
- `/contacts/import` - Import contacts page
- `/analytics` - Analytics page
- `/settings` - Settings page

## Implementation Plan

### 1. Campaigns Pages
**Files to create:**
- `src/app/[locale]/campaigns/page.tsx` - List all campaigns with status, stats, search/filter
- `src/app/[locale]/campaigns/new/page.tsx` - Multi-step campaign creation wizard

**Features:**
- Campaign list with status badges (draft, scheduled, sending, completed, etc.)
- Search and filter functionality
- Quick actions (edit, duplicate, delete, view report)
- Link to create new campaign

### 2. Templates Page
**File to create:**
- `src/app/[locale]/templates/page.tsx` - Template library

**Features:**
- Template grid/list view
- Categories filter (newsletter, promotional, transactional, etc.)
- Use, edit, duplicate, delete actions
- Link to create new template

### 3. Contacts Pages
**Files to create:**
- `src/app/[locale]/contacts/page.tsx` - Contacts management
- `src/app/[locale]/contacts/import/page.tsx` - CSV import wizard

**Features:**
- Contacts table with search/filter
- Status filter (active, unsubscribed, bounced)
- Bulk actions
- Import from CSV with column mapping

### 4. Analytics Page
**File to create:**
- `src/app/[locale]/analytics/page.tsx` - Performance metrics

**Features:**
- Overview metrics (sent, delivered, opened, clicked, bounced)
- Charts using recharts (already installed)
- Campaign selector
- Date range filter

### 5. Settings Page
**File to create:**
- `src/app/[locale]/settings/page.tsx` - Application settings

**Features:**
- SMTP configuration with provider presets
- Test connection functionality
- Sending settings (batch size, rate limits)
- Appearance settings (theme, language)

## Technical Notes
- All pages use `setRequestLocale()` for i18n
- Use existing UI components from `@/components/ui/`
- Translations already exist in `src/messages/en.json` and `ar.json`
- Follow the pattern from the existing dashboard page

## Testing
After implementation:
- Run `npm run test:unit` for unit tests
- Run `npm run build` to ensure no build errors
- Manual testing of all routes in both en and ar locales

## Usage After Implementation
1. Navigate to http://localhost:3003
2. Click any navigation link (Campaigns, Templates, Contacts, Analytics, Settings)
3. All pages should render without 404 errors
