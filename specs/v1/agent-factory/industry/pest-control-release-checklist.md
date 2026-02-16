# Pest Control Agent Release Checklist (v1.0.0)

Use this checklist for every new or updated production Pest Control agent.

## 1. Identity And Prompt

- [ ] Industry pack `specs/v1/agent-factory/industry/pest-control.md` selected.
- [ ] Blueprint `specs/v1/agent-factory/industry/pest-control-blueprint.v1.yaml` selected.
- [ ] Compiled prompt `specs/v1/agent-factory/industry/pest-control-system-prompt.v1.md` selected.
- [ ] Core-tabs profile `specs/v1/agent-factory/core-tabs/pest-control-core-tabs-profile.v1.yaml` selected.
- [ ] Workflow profile `specs/v1/agent-factory/industry/pest-control-workflow.v1.yaml` selected.
- [ ] System prompt template ID and Pest Control service fragments attached.
- [ ] Safety/compliance escalation fragment attached.
- [ ] Prompt governance check approved by admin.

## 2. Customer Experience

- [ ] Greeting exists and tokenizes company name correctly.
- [ ] Greeting owner customization validated within policy.
- [ ] Voice selected from curated catalog.
- [ ] Voice profile and parameter bounds validated.

## 3. Knowledge Base

- [ ] Firecrawl source domain validated.
- [ ] Pest pages included (`/services`, `/pests`, `/termite`, `/rodent`, `/bed-bug`).
- [ ] Crawl completed without fatal errors.
- [ ] KB ingestion completed.
- [ ] Retrieval smoke test passed for preparation and warranty policies.

## 4. Tools And Integrations

- [ ] Post-call webhook endpoint uses `https://api.revcenter.ai/webhooks/elevenlabs/post-call`.
- [ ] Webhook signature verified.
- [ ] MCP endpoint uses `https://api.revcenter.ai/mcp/sse`.
- [ ] MCP auth validated.
- [ ] Booking tool call test passed.
- [ ] Customer lookup/create task tool tests passed.

## 5. Data Quality

- [ ] Required Pest Control fields configured (`urgency_level`, `service_type`, `pest_type`, `issue_summary`, `service_address`).
- [ ] Evaluation criteria configured with Pest Control thresholds.
- [ ] Thresholds approved by admin.

## 6. Workflow And Branches

- [ ] Intent map configured for safety, active infestation, inspection, and treatment flows.
- [ ] Safety branch transition tests passed.
- [ ] Routine booking branch transition tests passed.
- [ ] Human handoff and fallback route tests passed.

## 7. Testing And Health

- [ ] Baseline test suite passed.
- [ ] No blocking failed tests.
- [ ] Health check endpoint status healthy or approved degraded.
- [ ] Daily test run schedule active.
- [ ] Webhook and MCP daily health checks active.

## 8. Governance

- [ ] Admin approval record captured.
- [ ] Rollback strategy attached.
- [ ] Release notes captured with pack version and deployment date.
