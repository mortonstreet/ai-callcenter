# Agent Release Checklist (Template)

Use this checklist for every new or updated production agent.

## 1. Identity And Prompt

- [ ] Industry pack version selected.
- [ ] System prompt template ID selected.
- [ ] Service fragments attached for selected services.
- [ ] Escalation fragment attached.
- [ ] Prompt governance check (admin approved).

## 2. Customer Experience

- [ ] Greeting exists.
- [ ] Greeting owner customization validated.
- [ ] Voice selected from curated catalog.
- [ ] Voice profile and parameter bounds validated.

## 3. Knowledge Base

- [ ] Firecrawl source domain validated.
- [ ] Crawl completed without fatal errors.
- [ ] KB ingestion completed.
- [ ] Retrieval smoke test passed.

## 4. Tools And Integrations

- [ ] Post-call webhook enabled.
- [ ] Webhook signature verified.
- [ ] MCP endpoint and auth validated.
- [ ] Booking tool call test passed.
- [ ] Core behavior tools test passed.

## 5. Data Quality

- [ ] Data collection fields configured.
- [ ] Evaluation criteria configured.
- [ ] Thresholds approved by admin.

## 6. Workflow And Branches

- [ ] Intent map configured.
- [ ] Branch transition tests passed.
- [ ] Fallback route test passed.

## 7. Testing And Health

- [ ] Baseline test suite passed.
- [ ] No blocking failed tests.
- [ ] Health check endpoint status healthy or approved degraded.
- [ ] Daily test run schedule active.

## 8. Governance

- [ ] Admin approval record captured.
- [ ] Rollback strategy attached.
- [ ] Release notes captured.

