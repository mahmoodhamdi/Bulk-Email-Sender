# Security & Improvements Implementation Plan

## Overview
This document outlines the implementation plan for 7 security fixes and improvements.

---

## 1. Fix XSS via dangerouslySetInnerHTML (add DOMPurify)

### Problem
HTML content is rendered using `dangerouslySetInnerHTML` without sanitization, allowing XSS attacks.

### Solution
- DOMPurify is already installed (`dompurify: ^3.3.1`)
- Create a `sanitizeHtml` utility function in `src/lib/crypto.ts`
- Wrap all `dangerouslySetInnerHTML` usages with DOMPurify sanitization

### Files to Modify
- `src/lib/crypto.ts` - Add sanitizeHtml function
- Search for all `dangerouslySetInnerHTML` usages and update them

### Testing
- Unit test for sanitizeHtml function
- Test that malicious scripts are stripped

---

## 2. Fix Timezone DST Handling

### Problem
Schedule times may shift incorrectly during Daylight Saving Time transitions.

### Solution
- Store all times in UTC in the database
- Use `date-fns-tz` or handle timezone conversions properly
- Update schedule-store to handle DST transitions

### Files to Modify
- `src/stores/schedule-store.ts` - Add proper timezone handling
- `src/lib/utils.ts` - Add timezone utility functions

### Testing
- Unit tests for DST edge cases
- Test scheduling across DST boundaries

---

## 3. Add CSRF Protection Middleware

### Problem
API routes lack CSRF protection, making them vulnerable to cross-site request forgery.

### Solution
- Create CSRF middleware using double-submit cookie pattern
- Generate CSRF token on page load
- Validate token on state-changing requests (POST, PUT, DELETE)

### Files to Create/Modify
- `src/lib/csrf.ts` - CSRF token generation and validation
- `src/middleware.ts` - Add CSRF validation to middleware

### Testing
- Unit tests for token generation/validation
- Integration test for protected routes

---

## 4. Fix Direct DOM Manipulation in settings-store

### Problem
Direct DOM manipulation (`document.documentElement.classList`) in Zustand store is not React-idiomatic and can cause hydration issues.

### Solution
- Move DOM manipulation to a React hook or component
- Use useEffect for client-side DOM updates
- Keep store pure for state management only

### Files to Modify
- `src/stores/settings-store.ts` - Remove DOM manipulation
- Create `src/hooks/useTheme.ts` - Handle DOM updates reactively

### Testing
- Unit test for settings store (pure state)
- Integration test for theme application

---

## 5. Fix Hardcoded Contact Information

### Problem
Contact information (email, phone) is hardcoded in source files instead of being configurable.

### Solution
- Move contact info to environment variables
- Create a config utility to access them
- Update all hardcoded references

### Files to Modify
- `.env.example` - Add contact info variables
- `src/lib/config.ts` - Create config utility
- Update components using hardcoded contact info

### Testing
- Unit test for config utility
- Verify fallback behavior

---

## 6. Add Pagination to Large Lists

### Problem
Large lists (contacts, campaigns, etc.) load all data at once, causing performance issues.

### Solution
- Create reusable pagination hook and component
- Implement server-side pagination for API routes
- Update stores to support paginated data

### Files to Create/Modify
- `src/hooks/usePagination.ts` - Pagination hook
- `src/components/ui/pagination.tsx` - Pagination component
- Update relevant API routes and stores

### Testing
- Unit tests for pagination logic
- Integration tests for paginated API responses

---

## 7. Add Type-Safe Translation Keys

### Problem
Translation keys are strings without type checking, leading to runtime errors for missing translations.

### Solution
- Generate TypeScript types from translation JSON files
- Create typed useTranslations wrapper
- Add build-time validation

### Files to Create/Modify
- `src/i18n/types.ts` - Generated translation key types
- `src/hooks/useTypedTranslations.ts` - Type-safe wrapper
- Update components to use typed translations

### Testing
- TypeScript compilation will catch invalid keys
- Unit test for hook behavior

---

## Implementation Order

1. **XSS Fix** (Critical security)
2. **CSRF Protection** (Critical security)
3. **Direct DOM Manipulation Fix** (Code quality)
4. **Hardcoded Contact Info** (Configuration)
5. **Timezone DST Handling** (Bug fix)
6. **Pagination** (Performance)
7. **Type-Safe Translations** (Developer experience)

Each feature will be tested and committed separately before moving to the next.
