# Scheduled Campaigns Feature Plan

## Overview
Allow users to schedule email campaigns for a specific date and time instead of sending immediately. This enhances campaign management by enabling users to plan their email marketing ahead of time.

## Current State
The campaign review step already has basic UI elements for scheduling:
- `sendNow` / `sendLater` toggle
- `scheduleDate` / `scheduleTime` inputs
- `timezone` selection

However, the backend processing and proper UI implementation are missing.

## Feature Requirements

### 1. Campaign Store Updates
- Already has `sendNow` and `scheduledAt` in CampaignDraft
- Need to add `timezone` field
- Update validation for step 3 (review) to validate scheduled time

### 2. Scheduling Store (New)
Create a dedicated store for managing scheduled campaigns:
- Track scheduled campaigns
- Handle timezone conversions
- Manage schedule status (pending, executing, completed, failed)

### 3. UI Components

#### Schedule Selector Component
- Date picker for selecting send date
- Time picker for selecting send time
- Timezone dropdown with common timezones
- Display of local time conversion
- Minimum schedule time validation (e.g., 15 minutes in future)

#### Campaign Review Step Updates
- Improve the existing send options UI
- Add visual feedback for scheduled time
- Show countdown to scheduled send
- Allow editing of scheduled time

#### Scheduled Campaigns Dashboard
- List of all scheduled campaigns
- Status indicators (pending, sending, completed)
- Ability to cancel/reschedule
- Sort by scheduled time

### 4. API Endpoints

#### POST /api/campaigns/schedule
```typescript
{
  campaignId: string;
  scheduledAt: string; // ISO 8601 datetime
  timezone: string;    // IANA timezone
}
```

#### PATCH /api/campaigns/:id/reschedule
```typescript
{
  scheduledAt: string;
  timezone: string;
}
```

#### DELETE /api/campaigns/:id/schedule
Cancel a scheduled campaign

### 5. Database Schema Updates
Campaign model already has:
- `status`: includes SCHEDULED
- `scheduledAt`: DateTime field

May need to add:
- `timezone`: String field for storing user's selected timezone

### 6. Background Job Processing
Using existing BullMQ infrastructure:
- Create scheduled job when campaign is scheduled
- Job executes at scheduled time
- Handle timezone correctly
- Retry logic for failures
- Update campaign status on completion

## Implementation Steps

### Step 1: Create Schedule Store
- Create `src/stores/schedule-store.ts`
- Manage scheduling state
- Timezone conversion utilities
- Common timezone list

### Step 2: Build Schedule Selector Component
- Create `src/components/campaign/ScheduleSelector.tsx`
- Date/time picker UI
- Timezone dropdown
- Validation logic

### Step 3: Update Campaign Review Step
- Integrate ScheduleSelector
- Update form validation
- Show scheduled time summary

### Step 4: Create Scheduled Campaigns View
- Create dashboard page for viewing scheduled campaigns
- Filter and sort functionality
- Cancel/reschedule actions

### Step 5: API Implementation
- Schedule campaign endpoint
- Reschedule endpoint
- Cancel schedule endpoint

### Step 6: Background Processing
- Create scheduler job processor
- Queue management
- Status updates

### Step 7: Testing
- Unit tests for schedule store
- Integration tests for scheduling flow
- E2E tests for user journey

## Timezone Handling

### Common Timezones List
- UTC
- America/New_York (EST/EDT)
- America/Los_Angeles (PST/PDT)
- America/Chicago (CST/CDT)
- Europe/London (GMT/BST)
- Europe/Paris (CET/CEST)
- Europe/Berlin (CET/CEST)
- Asia/Dubai (GST)
- Asia/Tokyo (JST)
- Asia/Shanghai (CST)
- Asia/Kolkata (IST)
- Australia/Sydney (AEST/AEDT)
- Africa/Cairo (EET)
- Africa/Johannesburg (SAST)

### Conversion Logic
- Store all times in UTC in database
- Convert to user's timezone for display
- Validate minimum future time in user's timezone

## UI/UX Considerations

### Visual Feedback
- Clear indication of "Send Now" vs "Schedule"
- Countdown timer for upcoming scheduled sends
- Status badges for campaign states
- Toast notifications for scheduling actions

### Validation
- Cannot schedule in the past
- Minimum 15-minute buffer from current time
- Date format validation
- Timezone validation

### Mobile Responsiveness
- Touch-friendly date/time pickers
- Responsive timezone dropdown
- Compact scheduled campaigns list on mobile

## Translations
Add to both en.json and ar.json:
```json
"schedule": {
  "title": "Schedule Campaign",
  "sendNow": "Send Now",
  "sendLater": "Schedule for Later",
  "date": "Date",
  "time": "Time",
  "timezone": "Timezone",
  "selectDate": "Select date",
  "selectTime": "Select time",
  "selectTimezone": "Select timezone",
  "scheduledFor": "Scheduled for",
  "localTime": "Your local time",
  "minTimeError": "Schedule time must be at least 15 minutes in the future",
  "pastTimeError": "Cannot schedule in the past",
  "scheduled": "Campaign scheduled successfully",
  "rescheduled": "Campaign rescheduled successfully",
  "cancelled": "Scheduled campaign cancelled",
  "pending": "Pending",
  "executing": "Sending",
  "completed": "Completed",
  "failed": "Failed",
  "noScheduled": "No scheduled campaigns",
  "noScheduledDesc": "Schedule a campaign to see it here",
  "reschedule": "Reschedule",
  "cancelSchedule": "Cancel Schedule",
  "confirmCancel": "Are you sure you want to cancel this scheduled campaign?",
  "countdown": "Sends in",
  "days": "days",
  "hours": "hours",
  "minutes": "minutes"
}
```

## After Implementation

### User Flow
1. Create campaign (steps 1-3)
2. In Review step, choose "Schedule for Later"
3. Select date, time, and timezone
4. Preview scheduled time in local timezone
5. Confirm scheduling
6. View in scheduled campaigns dashboard
7. Optionally reschedule or cancel

### Campaign Status Flow
```
DRAFT -> SCHEDULED -> SENDING -> COMPLETED
                  \-> CANCELLED
```
