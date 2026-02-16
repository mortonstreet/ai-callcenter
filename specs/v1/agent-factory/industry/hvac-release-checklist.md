# HVAC Agent Release Checklist (v1.0.0)

Use this checklist for every new or updated production HVAC agent.

## 1. Identity And Prompt

- [ ] Industry pack `specs/v1/agent-factory/industry/hvac.md` selected.
- [ ] Blueprint `specs/v1/agent-factory/industry/hvac-blueprint.v1.yaml` selected.
- [ ] Compiled prompt `specs/v1/agent-factory/industry/hvac-system-prompt.v1.md` selected.
- [ ] Core-tabs profile `specs/v1/agent-factory/core-tabs/hvac-core-tabs-profile.v1.yaml` selected.
- [ ] Workflow profile `specs/v1/agent-factory/industry/hvac-workflow.v1.yaml` selected.
- [ ] System prompt template ID and HVAC service fragments attached.
- [ ] Safety/compliance escalation fragment attached.
- [ ] Prompt governance check approved by admin.
- [ ] Dynamic-variable policy validated (reserved prefixes + missing-variable behavior).

## 2. Customer Experience

- [ ] Greeting exists and tokenizes company name correctly.
- [ ] Greeting owner customization validated within policy.
- [ ] Voice selected from curated catalog.
- [ ] Voice profile and parameter bounds validated.

## 3. Knowledge Base

- [ ] Firecrawl source domain validated.
- [ ] HVAC service pages included (`/services`, `/heating`, `/cooling`, `/maintenance`).
- [ ] Crawl completed without fatal errors.
- [ ] KB ingestion completed.
- [ ] Retrieval smoke test passed for service area and emergency handling policy.

## 4. Tools And Integrations

- [ ] Post-call webhook endpoint uses `https://api.revcenter.ai/webhooks/elevenlabs/post-call`.
- [ ] Webhook signature verified.
- [ ] MCP endpoint uses `https://api.revcenter.ai/mcp/sse`.
- [ ] MCP auth validated.
- [ ] Tool mode validated as `tool_ids + built_in_tools` (legacy tools array disabled).
- [ ] Server tool approval modes validated (`lookup_customer=auto`, booking/task actions policy-bound).
- [ ] Tool timeout budget validated (`<=20s`; default `9.5s`).
- [ ] Booking tool call test passed.
- [ ] Customer lookup/create task tool tests passed.

## 5. Data Quality

- [ ] Required HVAC fields configured (`urgency_level`, `service_type`, `issue_summary`, `service_address`).
- [ ] Evaluation criteria configured with HVAC thresholds.
- [ ] Thresholds approved by admin.

## 6. Workflow And Branches

- [ ] Intent map configured for safety, outage, repair, maintenance, and replacement flows.
- [ ] Emergency branch transition tests passed.
- [ ] Routine booking branch transition tests passed.
- [ ] Human handoff and fallback route tests passed.
- [ ] Workflow override behavior validated for signed URL/start-conversation context.
- [ ] Versioning branch target validated (`staging` promotion to `main`).

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
- [ ] Private-agent auth policy validated (signed URL access for protected deployments).
