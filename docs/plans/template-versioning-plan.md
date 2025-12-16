# Template Versioning Implementation Plan

## Overview

Add version history support for templates, allowing users to:
- Automatically track changes when templates are updated
- View version history with timestamps and change summaries
- Compare any two versions side-by-side
- Revert to any previous version

## Current State

- Templates stored in `Template` model with basic fields (name, subject, content, etc.)
- No version tracking - updates overwrite previous content
- Templates linked to campaigns via `templateId`

## Architecture Design

### Database Schema

```prisma
model TemplateVersion {
  id          String   @id @default(cuid())
  templateId  String
  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  version     Int      // Sequential version number (1, 2, 3...)
  name        String
  subject     String?
  content     String   @db.Text
  thumbnail   String?
  category    String?

  // Change tracking
  changeType  VersionChangeType @default(UPDATE)
  changeSummary String?         // Auto-generated or user-provided

  // Audit
  createdBy   String?           // userId who made the change
  createdAt   DateTime @default(now())

  @@unique([templateId, version])
  @@index([templateId])
  @@index([createdAt])
}

enum VersionChangeType {
  CREATE    // Initial version
  UPDATE    // Content/settings changed
  REVERT    // Reverted from another version
}

// Update Template model
model Template {
  // ... existing fields ...

  currentVersion Int @default(1)
  versions       TemplateVersion[]
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates/[id]/versions` | List all versions with pagination |
| GET | `/api/templates/[id]/versions/[version]` | Get specific version details |
| POST | `/api/templates/[id]/versions/[version]/revert` | Revert to a specific version |
| GET | `/api/templates/[id]/versions/compare` | Compare two versions |

### Version Creation Logic

1. **On Template Create**: Create version 1 with `changeType: CREATE`
2. **On Template Update**:
   - Compare new content with current version
   - If content changed, create new version with `changeType: UPDATE`
   - Auto-generate change summary (e.g., "Updated subject and content")
3. **On Revert**:
   - Create new version copying from target version
   - Set `changeType: REVERT`
   - Set summary: "Reverted to version X"

### Change Detection

Track changes to these fields:
- `name` - Template name
- `subject` - Email subject line
- `content` - HTML content
- `category` - Template category

Generate summary like:
- "Updated content"
- "Changed subject and content"
- "Updated name, subject, and content"

## Implementation Phases

### Phase 1: Database Schema
- [ ] Add `TemplateVersion` model to Prisma schema
- [ ] Add `VersionChangeType` enum
- [ ] Update `Template` model with `currentVersion` and relation
- [ ] Create migration
- [ ] Generate Prisma client

### Phase 2: Version Service
- [ ] Create `src/lib/template/version-service.ts`
  - `createInitialVersion(templateId, data)` - Create v1 on template create
  - `createVersion(templateId, oldData, newData)` - Create version on update
  - `getVersions(templateId, options)` - List versions with pagination
  - `getVersion(templateId, version)` - Get specific version
  - `revertToVersion(templateId, version)` - Revert and create new version
  - `compareVersions(templateId, v1, v2)` - Get diff between versions
  - `generateChangeSummary(oldData, newData)` - Auto-generate summary

### Phase 3: Update Template API
- [ ] Update `POST /api/templates` to create initial version
- [ ] Update `PUT /api/templates/[id]` to create version on content change
- [ ] Add version info to template responses

### Phase 4: Version API Routes
- [ ] Create `src/app/api/templates/[id]/versions/route.ts`
  - GET: List versions with pagination
- [ ] Create `src/app/api/templates/[id]/versions/[version]/route.ts`
  - GET: Get version details
- [ ] Create `src/app/api/templates/[id]/versions/[version]/revert/route.ts`
  - POST: Revert to version
- [ ] Create `src/app/api/templates/[id]/versions/compare/route.ts`
  - GET: Compare two versions (?v1=X&v2=Y)

### Phase 5: Validation Schemas
- [ ] Create `src/lib/validations/template-version.ts`
  - `listVersionsQuerySchema` - Pagination params
  - `compareVersionsQuerySchema` - v1, v2 params
  - `revertVersionSchema` - Optional change summary

### Phase 6: Tests
- [ ] Unit tests for version service
- [ ] Integration tests for version API routes
- [ ] Test version creation on template updates
- [ ] Test revert functionality
- [ ] Test compare functionality

### Phase 7: Translations
- [ ] Add English translations for version UI
- [ ] Add Arabic translations for version UI

### Phase 8: Documentation
- [ ] Update CLAUDE.md with versioning documentation

## API Response Examples

### GET /api/templates/[id]/versions

```json
{
  "data": [
    {
      "version": 3,
      "changeType": "UPDATE",
      "changeSummary": "Updated content",
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": "user-123"
    },
    {
      "version": 2,
      "changeType": "UPDATE",
      "changeSummary": "Changed subject and content",
      "createdAt": "2024-01-14T15:20:00Z",
      "createdBy": "user-123"
    },
    {
      "version": 1,
      "changeType": "CREATE",
      "changeSummary": "Initial version",
      "createdAt": "2024-01-10T09:00:00Z",
      "createdBy": "user-123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### GET /api/templates/[id]/versions/[version]

```json
{
  "data": {
    "version": 2,
    "name": "Welcome Email",
    "subject": "Welcome to our platform!",
    "content": "<html>...</html>",
    "category": "welcome",
    "changeType": "UPDATE",
    "changeSummary": "Changed subject and content",
    "createdAt": "2024-01-14T15:20:00Z",
    "createdBy": "user-123"
  }
}
```

### GET /api/templates/[id]/versions/compare?v1=1&v2=3

```json
{
  "data": {
    "version1": {
      "version": 1,
      "name": "Welcome Email",
      "subject": "Welcome!",
      "content": "<html>Old content...</html>",
      "createdAt": "2024-01-10T09:00:00Z"
    },
    "version2": {
      "version": 3,
      "name": "Welcome Email",
      "subject": "Welcome to our platform!",
      "content": "<html>New content...</html>",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "changes": {
      "name": false,
      "subject": true,
      "content": true,
      "category": false
    }
  }
}
```

### POST /api/templates/[id]/versions/[version]/revert

**Request:**
```json
{
  "changeSummary": "Reverting to fix formatting issues"
}
```

**Response:**
```json
{
  "data": {
    "template": {
      "id": "template-123",
      "name": "Welcome Email",
      "currentVersion": 4
    },
    "newVersion": {
      "version": 4,
      "changeType": "REVERT",
      "changeSummary": "Reverted to version 2: Reverting to fix formatting issues",
      "createdAt": "2024-01-16T11:00:00Z"
    }
  },
  "message": "Successfully reverted to version 2"
}
```

## Version Retention Policy

- Keep all versions by default (no automatic cleanup)
- Future enhancement: Add configurable retention (e.g., keep last N versions)

## Migration Strategy

For existing templates without versions:
1. Migration script creates version 1 for all existing templates
2. Sets `currentVersion = 1`
3. Uses template's `createdAt` as version `createdAt`
4. Sets `changeType = CREATE`, `changeSummary = "Initial version (migrated)"`

## Security Considerations

- Version access follows template permissions
- Only template owner can revert versions
- Audit trail preserved (createdBy field)
- Content sanitization on revert (same as create/update)

## Performance Considerations

- Index on `templateId` for efficient version listing
- Index on `createdAt` for sorting
- Pagination on version list API
- Only store changed fields in future optimization (not implemented initially)

## Future Enhancements (Out of Scope)

- Visual diff viewer for HTML content
- Version branching (A/B test versions)
- Version comments/notes
- Bulk version operations
- Version retention policies
- Version export/import
