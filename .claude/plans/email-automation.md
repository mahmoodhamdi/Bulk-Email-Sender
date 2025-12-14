# Email Automation Feature Plan

## Overview
Create an email automation system that allows users to build automated email sequences (drip campaigns) triggered by specific events or time-based conditions.

## Current State
The application has:
- Campaign creation and management
- Contact segmentation
- Template builder
- Scheduling capabilities

Missing:
- Automated trigger-based emails
- Multi-step email sequences
- Workflow builder interface
- Automation analytics

## Feature Requirements

### 1. Automation Store
Create a dedicated store for managing automations:
- Automation workflow definitions
- Trigger configurations
- Step/node management
- Execution history

### 2. Trigger Types
- **Time-based**: Send after X days/hours
- **Event-based**: On contact signup, tag added
- **Engagement-based**: On email open, link click
- **Date-based**: Birthday, anniversary, custom date field

### 3. Workflow Builder
- Visual node-based editor
- Drag-and-drop interface
- Add email steps
- Add delays/wait periods
- Add conditions/branches
- Preview workflow

### 4. Email Steps
- Select template
- Customize subject line
- Set sender details
- Preview email content

### 5. Condition Nodes
- If/else branching
- Check engagement (opened, clicked)
- Check contact properties
- Check tag membership

### 6. Delay Nodes
- Wait X hours/days/weeks
- Wait until specific time
- Wait until day of week

### 7. Action Nodes
- Send email
- Add/remove tag
- Update contact field
- Add to segment
- Send webhook

### 8. Automation Analytics
- Active automations count
- Emails sent via automations
- Conversion tracking
- Step-by-step performance

## Implementation Steps

### Step 1: Automation Store
- Workflow state management
- Trigger configuration
- Step definitions
- Execution tracking
- Mock data generation

### Step 2: Workflow Types
```typescript
interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerConfig;
  steps: AutomationStep[];
  status: 'draft' | 'active' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  stats: AutomationStats;
}

interface TriggerConfig {
  type: 'signup' | 'tag_added' | 'date_field' | 'manual';
  config: Record<string, unknown>;
}

interface AutomationStep {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'action';
  config: StepConfig;
  nextStepId?: string;
  trueStepId?: string;  // For conditions
  falseStepId?: string; // For conditions
}

interface EmailStepConfig {
  templateId: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
}

interface DelayStepConfig {
  duration: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
}

interface ConditionStepConfig {
  field: string;
  operator: 'equals' | 'contains' | 'exists' | 'opened' | 'clicked';
  value?: string;
}

interface ActionStepConfig {
  action: 'add_tag' | 'remove_tag' | 'update_field' | 'add_to_segment';
  target: string;
  value?: string;
}
```

### Step 3: Automation List Component
- Display all automations
- Status indicators
- Quick stats (sent, active contacts)
- Enable/disable toggle
- Delete automation

### Step 4: Workflow Builder Component
- Canvas for workflow
- Node components (email, delay, condition, action)
- Connection lines
- Add step buttons
- Save/publish workflow

### Step 5: Trigger Configuration
- Trigger type selector
- Configuration form per trigger type
- Preview trigger conditions

### Step 6: Step Configuration Modals
- Email step: template selection, subject editor
- Delay step: duration picker
- Condition step: field/operator selection
- Action step: action configuration

### Step 7: Automation Analytics
- Overview cards
- Step performance chart
- Contact flow visualization

### Step 8: Pages
- `/automations` - List all automations
- `/automations/new` - Create new automation
- `/automations/[id]` - Edit/view automation

### Step 9: API Routes
- GET/POST `/api/automations` - List/Create
- GET/PUT/DELETE `/api/automations/[id]` - CRUD
- POST `/api/automations/[id]/activate` - Activate
- POST `/api/automations/[id]/pause` - Pause

### Step 10: Translations
Add to en.json and ar.json for all automation strings.

### Step 11: Testing
- Unit tests for automation store
- Integration tests for workflows
- E2E tests for builder UI

## UI Components

### Automation List
```
+--------------------------------------------------+
| Automations                          [+ New]      |
+--------------------------------------------------+
| [Toggle] Welcome Series        Active   524 sent |
| [Toggle] Re-engagement         Paused   128 sent |
| [Toggle] Birthday Wishes       Active    45 sent |
+--------------------------------------------------+
```

### Workflow Builder
```
+--------------------------------------------------+
|  [Trigger: On Signup]                            |
|        |                                          |
|        v                                          |
|  [Email: Welcome]                                |
|        |                                          |
|        v                                          |
|  [Delay: 3 days]                                 |
|        |                                          |
|        v                                          |
|  [Condition: Opened welcome?]                    |
|      /    \                                       |
|    Yes     No                                     |
|     |       |                                     |
|     v       v                                     |
| [Email A] [Email B]                              |
+--------------------------------------------------+
```

## Priority
High - This is a key differentiator for email marketing platforms and enables sophisticated marketing workflows.

## Estimated Scope
- Store: 1 file (~400 lines)
- Components: 5-7 files (~1500 lines)
- Pages: 3 files (~400 lines)
- Translations: Updates to en.json, ar.json
- Tests: Unit, integration, e2e
