# Industry Pack: Roofing

Status: Implemented (Spec-Level)
Industry: `roofing`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: leak diagnostics, storm damage inspections, repair bookings, full replacement estimates, and warranty/follow-up questions.
2. High-risk call patterns: active interior water intrusion, storm-related structural exposure, fallen tree impact, and severe weather events requiring rapid dispatch.
3. Common escalation triggers: active leak escalation, insurance claim coordination requests, repeated unresolved repairs, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `active_leak_emergency` | Active Leak Emergency | `service_address, callback_phone, leak_location, active_water_intrusion` | `high` |
| `storm_damage_inspection` | Storm Damage Inspection | `service_address, callback_phone, damage_type, storm_date` | `high` |
| `roof_repair` | Roof Repair | `service_address, callback_phone, issue_summary, roof_type` | `high` |
| `roof_replacement_estimate` | Roof Replacement Estimate | `service_address, callback_phone, roof_age_estimate, timeline` | `med` |
| `preventive_roof_inspection` | Preventive Roof Inspection | `service_address, callback_phone, property_type, preferred_time_window` | `med` |
| `gutter_service` | Gutter Repair/Replacement | `service_address, callback_phone, issue_summary, property_type` | `low` |
| `skylight_service` | Skylight Repair/Install | `service_address, callback_phone, skylight_issue, property_type` | `med` |
| `flashing_vent_service` | Flashing/Vent Repair | `service_address, callback_phone, issue_summary, roof_type` | `med` |
| `insurance_claim_support` | Insurance Claim Support | `service_address, callback_phone, claim_status, carrier_name` | `med` |
| `warranty_follow_up` | Warranty Follow-Up | `service_address, callback_phone, prior_job_reference, issue_summary` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `active_leak_emergency` | `triage_active_leak` | `route_live_dispatch` | `yes` |
| `storm_damage_request` | `storm_damage_discovery` | `schedule_priority_inspection` | `yes` |
| `routine_repair_request` | `collect_repair_details` | `schedule_standard_service` | `no` |
| `replacement_quote_request` | `replacement_qualification` | `route_estimate_queue` | `no` |
| `inspection_request` | `inspection_booking_flow` | `schedule_inspection_visit` | `no` |
| `insurance_question` | `insurance_information_flow` | `route_service_manager` | `yes` |
| `pricing_or_warranty_question` | `pricing_warranty_information` | `route_service_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.dispatch-first.v1` enforces concise, practical support and booking-first behavior.
2. Industry compliance fragment: `compliance.roofing.safety-scope.v1` enforces no hazardous rooftop DIY guidance and emergency escalation language.
3. Service discovery fragment set: `service.roofing.repair.v1`, `service.roofing.storm-damage.v1`, `service.roofing.replacement.v1`, `service.roofing.inspection.v1`, and `service.roofing.warranty.v1`.
4. Scheduling and booking fragment: `booking.roofing.intake-capture.v1` captures weather exposure, leak severity, and access notes before booking.
5. Escalation fragment: `escalation.roofing.active-leak-or-manager.v1` routes emergency leak and dispute flows to dispatch/manager handoff.
6. Out-of-scope response fragment: `fallback.roofing.out-of-scope.v1` redirects unsupported general construction or structural engineering requests.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with roof leaks, storm damage, repairs, and scheduling. What roofing issue are you seeing?"
2. Allowed owner customizations: company name, service-area mention, and after-hours disclosure while preserving urgent leak triage language.
3. Restricted wording policy: no fixed insurance outcomes, no unsupported timeline guarantees, and no definitive damage diagnosis without intake context.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `clear`, `calm`, and `professional`.
2. Allowed voice parameter ranges: `stability` 0.55-0.85, `similarity_boost` 0.65-0.9, and `speed` 0.95-1.08.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/roof-repair`, `/storm-damage`, `/roof-replacement`, `/inspection`, `/warranty`, `/service-area`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, material and warranty docs, insurance process docs, and service-area/hours pages.
3. Mandatory source categories: service catalog, emergency leak handling expectations, storm process guidance, service area + hours, and warranty/insurance policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `roof_type` | `enum` | `no` | `asphalt_shingle`, `metal`, `tile`, `flat`, `unknown` |
| `damage_type` | `enum` | `no` | `leak`, `missing_shingles`, `storm`, `flashing`, `other` |
| `active_water_intrusion` | `boolean` | `no` | Set when leak is currently active indoors |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Dispatch-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `insurance_claim_status` | `enum` | `no` | `not_started`, `in_progress`, `approved`, `denied`, `unknown` |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for estimator/crew |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `safety_triage_accuracy` | Active leak/storm risk scenarios correctly escalated. | `0.97` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Service information remains KB-grounded and policy-safe. | `0.9` |
| `booking_completeness` | Required intake fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.93` |
| `empathy_and_tone` | Tone remains calm and practical in urgent leak scenarios. | `0.86` |
| `compliance_guardrails` | No unsupported guarantees or hazardous guidance. | `0.97` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `roofing.greeting.default` verifies default greeting delivery and owner token substitution.
2. `roofing.intent.active_leak_emergency` verifies active leak scenario routes to emergency escalation.
3. `roofing.intent.storm_damage_request` verifies storm damage routing behavior.
4. `roofing.workflow.repair_booking` verifies repair intake fields and booking tool invocation.
5. `roofing.workflow.replacement_qualification` verifies replacement estimate qualification path.
6. `roofing.workflow.inspection_booking` verifies inspection scheduling flow.
7. `roofing.kb.warranty_policy` verifies warranty responses remain KB-grounded.
8. `roofing.kb.insurance_guidance` verifies insurance messaging stays policy-safe.
9. `roofing.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `roofing.negative.no_unsafe_advice` verifies hazardous roof-access advice is never emitted.
11. `roofing.negative.no_false_guarantees` verifies no unsupported timeline/insurance guarantees.
12. `roofing.post_call.payload_schema` verifies webhook payload includes required data collection fields.

## 11. Admin Review Requirements

1. Prompt fragment set approved by admin policy owner.
2. Safety and escalation wording reviewed by operations lead.
3. Workflow branch map approved with dispatch fallback validation.
4. Baseline test pack passed on staging with no blocking failures.
5. Daily test schedule and connection health checks enabled.
6. Rollback target pack version and reactivation procedure documented.
7. Production release approval record captured with timestamp and approver.

## 12. Integration Endpoint Policy

1. Post-call webhook endpoint base: `https://api.revcenter.ai`.
2. Standard post-call path: `/webhooks/elevenlabs/post-call`.
3. MCP SSE endpoint base/path: `https://api.revcenter.ai/mcp/sse`.



## 13. Artifacts

1. Compiled system prompt: `specs/v1/agent-factory/industry/roofing-system-prompt.v1.md`
2. Roofing workflow instance: `specs/v1/agent-factory/industry/roofing-workflow.v1.yaml`
3. Roofing blueprint starter: `specs/v1/agent-factory/industry/roofing-blueprint.v1.yaml`
4. Roofing core-tabs profile: `specs/v1/agent-factory/core-tabs/roofing-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/roofing-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/roofing-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Roofing)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
