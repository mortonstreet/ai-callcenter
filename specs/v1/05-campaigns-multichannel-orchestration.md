# V1 Subspec: Campaigns Multichannel Orchestration

Status: Draft v1
Owner: Campaigns engineering
Parent: `specs/v1/master-v1-spec.md`

Git Delivery Branch: `feature/campaigns-multichannel-orchestration`
Subspec Completion Gate:
1. Start implementation with `git switch -c feature/campaigns-multichannel-orchestration` from the current base branch.
2. Keep all code, tests, and docs for this subspec on `feature/campaigns-multichannel-orchestration`.
3. Create at least one intentional commit that references this subspec scope.
4. Push the branch to GitHub with `git push -u origin feature/campaigns-multichannel-orchestration`.
5. Do not mark this subspec complete until the implementation commit is present on `feature/campaigns-multichannel-orchestration` in GitHub.

## 1. Purpose

Deliver a Revcenter Campaigns module that allows home services operators to run outbound outreach across:

1. Voice
2. SMS
3. Email

with unified visibility, channel-specific execution engines, and compliance-safe controls.

## 2. Product Surface

### 2.1 Primary UI

1. New route: `/dashboard/campaigns`.
2. Campaign list with status, channel mix, lead counts, and recent activity.
3. Campaign detail with channel tabs:
- Voice
- SMS
- Email
- Performance

### 2.2 Campaign Creation Modes

1. Quick start (single channel).
2. Multichannel sequence (for example SMS day 0 -> email day 2 -> voice day 5).
3. Import leads from list/integration.

## 3. Domain Model Strategy

To maximize reuse and reduce risk, v1 uses a hybrid model:

1. Reuse Omnidial-style `campaign` for voice campaign assignment context.
2. Reuse/extend `sms_campaign*` tables for sequenced messaging.
3. Reuse/extend `agent_message` and email config tables for email delivery.
4. Add unifying metadata table:
- `campaign_orchestration` with channel enablement and ordering.

## 4. Channel Engines

### 4.1 Voice Engine

1. Source from existing voice campaign + dialer patterns.
2. Lead assignment, call status updates, and call outcome tracking.
3. Integrates with Twilio and existing Revcenter call-center modules.

### 4.2 SMS Engine

1. Reuse Omnidial SMS sequencer concepts:
- campaign steps
- day offsets
- send windows
- enrollment statuses

2. Worker runs every minute for due enrollments.
3. Uses per-campaign daily limits and timezone-aware scheduling.
4. Handles replies, unsubscribes, and delivery updates via queue jobs.

### 4.3 Email Engine

1. Reuse `AgentEmailConfig` and `AgentMessage` style design.
2. Send from configured provider (AgentMail/Gmail first; Outlook optional).
3. Track `queued|sending|sent|delivered|opened|clicked|failed`.
4. Enforce daily send limits and bounce/failure handling.

## 5. Execution Flow

### 5.1 Enrollment

1. Enroll by explicit lead IDs.
2. Enroll from lead list.
3. Enroll from CRM sync cohorts.
4. Validate lead contactability before enrollment.

### 5.2 Sequencing

1. Each step has:
- channel type
- offset (days/minutes)
- template
- optional AI personalization
- skip rules

2. Skip rules examples:
- skip if replied.
- skip if booked appointment.
- skip if DNC/unsubscribed.

### 5.3 State Machine

Campaign states:

1. `draft`
2. `active`
3. `paused`
4. `completed`
5. `failed`

Enrollment states:

1. `active`
2. `paused`
3. `completed`
4. `replied`
5. `unsubscribed`
6. `failed`

## 6. Compliance Controls (US Baseline)

1. Respect outbound send windows in recipient local timezone.
2. Enforce SMS STOP/unsubscribe behavior globally for org.
3. Suppress contacts marked DNC.
4. Record consent source and timestamp when available.
5. Include unsubscribe footer/copy in email templates where required.

## 7. API Contract

### 7.1 Campaign CRUD

1. `GET /campaigns`
2. `POST /campaigns`
3. `GET /campaigns/:id`
4. `PATCH /campaigns/:id`
5. `DELETE /campaigns/:id`

### 7.2 Campaign Actions

1. `POST /campaigns/:id/activate`
2. `POST /campaigns/:id/pause`
3. `POST /campaigns/:id/duplicate`

### 7.3 Steps And Sequences

1. `POST /campaigns/:id/steps`
2. `PATCH /campaigns/:id/steps/:stepId`
3. `DELETE /campaigns/:id/steps/:stepId`

### 7.4 Enrollment

1. `GET /campaigns/:id/enrollments`
2. `POST /campaigns/:id/enrollments`
3. `POST /campaigns/:id/enrollments/from-list`
4. `DELETE /campaigns/:id/enrollments/:enrollmentId`

### 7.5 Channel-Specific Events

1. `POST /campaigns/webhooks/sms-status`
2. `POST /campaigns/webhooks/sms-inbound`
3. `POST /campaigns/webhooks/email-events`
4. `POST /campaigns/webhooks/voice-events`

## 8. Queue And Worker Requirements

1. Dedicated queues by channel.
2. Concurrency tuning per provider constraints.
3. Idempotency per outbound message/call event.
4. Dead-letter queues and replay tooling.

Required recurring jobs:

1. `campaign-scheduler` every minute.
2. `campaign-health-check` every 5 minutes.

## 9. Reporting And Analytics

Campaign-level metrics:

1. total enrolled
2. sent/dialed counts
3. delivery/connection rate
4. reply rate
5. unsubscribe rate
6. booking conversion rate

Step-level metrics:

1. attempts
2. successful sends
3. failures
4. average response delay

## 10. Migration Plan From Omnidial

### 10.1 Reuse Now

1. `campaign` CRUD and lead assignment concepts.
2. `sms_campaign*` schema and service logic.
3. queue worker pattern for sequenced SMS execution.

### 10.2 Adapt For Revcenter

1. add email channel to sequence orchestration.
2. integrate with Revcenter onboarding/agents/leads models.
3. align UI language with home services workflows.

## 11. Acceptance Criteria

1. User can create and activate campaign with at least one of SMS/Voice/Email.
2. Leads can be enrolled manually and from lists.
3. Scheduled steps execute correctly with timezone-safe send windows.
4. Replies/unsubscribes stop future sends for affected enrollment.
5. Campaign metrics update within acceptable delay (< 60s for operational views).
