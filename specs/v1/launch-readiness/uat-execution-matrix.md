# UAT Execution Matrix (Revcenter V1)

Environment: `stage` (required), `prod` (smoke only)
Evidence policy: attach test run links, screenshots, logs, or query output per journey.
Sign-off rule: no open P0 defects.

## 1. Test Run Metadata

| Field | Value |
|---|---|
| UAT Window Start | YYYY-MM-DD HH:MM UTC |
| UAT Window End | YYYY-MM-DD HH:MM UTC |
| Build/Release Tag | pending |
| Database Migration Version | pending |
| Test Lead | pending |
| Product Sign-off | pending |
| Engineering Sign-off | pending |
| Operations Sign-off | pending |

## 2. Journey Matrix

| Journey | Step | Expected Outcome | Owner | Result (`pass|fail|blocked`) | Evidence Link | Defect ID |
|---|---|---|---|---|---|---|
| Customer onboarding | Signup via magic link | User receives and redeems one-time magic link securely | Auth + QA | pending | pending | pending |
| Customer onboarding | Invitation accept flow | Invite token accepted, organization membership established | Auth + QA | pending | pending | pending |
| Customer onboarding | Organization creation + onboarding wizard | Organization and initial config saved without manual DB edits | Product + QA | pending | pending | pending |
| Customer onboarding | First agent creation + test interaction | Agent creates and responds correctly | AI platform + QA | pending | pending | pending |
| Integrations | Connect CRM | Provider auth/credential flow succeeds | Integrations + QA | pending | pending | pending |
| Integrations | Initial sync | Sync job completes with expected counts | Integrations + QA | pending | pending | pending |
| Integrations | Mapping validation | Lead mapping/status values match expected model | Integrations + QA | pending | pending | pending |
| Integrations | Disconnect/reconnect | Connection lifecycle is reversible and stable | Integrations + QA | pending | pending | pending |
| Campaigns | Create campaign | Campaign persists with valid targeting settings | Campaign team + QA | pending | pending | pending |
| Campaigns | Enroll leads | Eligible leads are enrolled and deduplicated | Campaign team + QA | pending | pending | pending |
| Campaigns | Activate campaign | Scheduler activates jobs inside send-window policy | Campaign team + QA | pending | pending | pending |
| Campaigns | Validate sends/calls | SMS/voice/email attempts recorded with delivery outcomes | Campaign team + QA | pending | pending | pending |
| Campaigns | Reply/unsubscribe handling | Replies/unsubscribes are processed and enforced globally | Campaign team + QA | pending | pending | pending |
| Campaigns | Stats visibility | Dashboard reflects campaign state and outcomes | Campaign team + QA | pending | pending | pending |
| Admin/support | Observe error logs | Error signals are visible with severity and service context | Ops + QA | pending | pending | pending |
| Admin/support | Correlation troubleshooting | Incident can be traced by correlation ID across services | Ops + QA | pending | pending | pending |
| Admin/support | Resolve/acknowledge workflow | Support workflow transitions (`open|acknowledged|resolved`) are usable | Ops + QA | pending | pending | pending |

## 3. Performance Validation

| Target | Threshold | Result | Evidence Link | Status |
|---|---|---|---|---|
| API latency p95 | < 400 ms | pending | pending | pending |
| Campaign scheduler lag | < 60 seconds | pending | pending | pending |
| Integration queue latency | < 120 seconds | pending | pending | pending |
| Dashboard render p95 | < 2.5 seconds | pending | pending | pending |

## 4. Defect Summary

| Severity | Open | Closed | Blocking Launch |
|---|---|---|---|
| P0 | 0 | 0 | yes |
| P1 | 0 | 0 | conditional |
| P2+ | 0 | 0 | no |

## 5. Final UAT Decision

| Decision | Date | Approved By | Notes |
|---|---|---|---|
| pending | YYYY-MM-DD | pending | pending |
