# Plumbing Agent Release Checklist (v1.0.0)

Use this checklist for every new or updated production Plumbing agent.

## 1. Identity And Prompt

- [ ] Industry pack `specs/v1/agent-factory/industry/plumbing.md` selected.
- [ ] Blueprint `specs/v1/agent-factory/industry/plumbing-blueprint.v1.yaml` selected.
- [ ] Compiled prompt `specs/v1/agent-factory/industry/plumbing-system-prompt.v1.md` selected.
- [ ] Core-tabs profile `specs/v1/agent-factory/core-tabs/plumbing-core-tabs-profile.v1.yaml` selected.
- [ ] Workflow profile `specs/v1/agent-factory/industry/plumbing-workflow.v1.yaml` selected.
- [ ] System prompt template ID and Plumbing service fragments attached.
- [ ] Safety/compliance escalation fragment attached.
- [ ] Prompt governance check approved by admin.

## 2. Customer Experience

- [ ] Greeting exists and tokenizes company name correctly.
- [ ] Greeting owner customization validated within policy.
- [ ] Voice selected from curated catalog.
- [ ] Voice profile and parameter bounds validated.

## 3. Knowledge Base

- [ ] Firecrawl source domain validated.
- [ ] Plumbing pages included (`/services`, `/emergency-plumbing`, `/drain`, `/water-heater`).
- [ ] Crawl completed without fatal errors.
- [ ] KB ingestion completed.
- [ ] Retrieval smoke test passed for emergency and warranty policies.

## 4. Tools And Integrations

- [ ] Post-call webhook endpoint uses `https://api.revcenter.ai/webhooks/elevenlabs/post-call`.
- [ ] Webhook signature verified.
- [ ] MCP endpoint uses `https://api.revcenter.ai/mcp/sse`.
- [ ] MCP auth validated.
- [ ] Booking tool call test passed.
- [ ] Customer lookup/create task tool tests passed.

## 5. Data Quality

- [ ] Required Plumbing fields configured (`urgency_level`, `service_type`, `issue_category`, `issue_summary`, `service_address`).
- [ ] Evaluation criteria configured with Plumbing thresholds.
- [ ] Thresholds approved by admin.

## 6. Workflow And Branches

- [ ] Intent map configured for safety, flooding/sewer backup, repairs, and estimate flows.
- [ ] Emergency branch transition tests passed.
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
