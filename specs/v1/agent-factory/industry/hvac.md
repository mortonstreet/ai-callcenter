# Industry Pack: HVAC

Status: Implemented (Spec-Level)
Industry: `hvac`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: no-heat/no-cooling outages, routine repair calls, maintenance/tune-up bookings, replacement estimate requests, and thermostat/air-quality questions.
2. High-risk call patterns: gas smell, carbon monoxide detector alerts, smoke/sparking equipment, medically vulnerable occupants without heat/cooling, and severe weather-related outages.
3. Common escalation triggers: safety-critical symptoms, repeated service failures, warranty disputes, on-call dispatch overrides, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `emergency_no_heat` | Emergency No Heat | `service_address, callback_phone, current_temp_estimate, vulnerable_occupants` | `high` |
| `emergency_no_cooling` | Emergency No Cooling | `service_address, callback_phone, indoor_temp_estimate, vulnerable_occupants` | `high` |
| `heating_repair` | Heating Repair | `service_address, callback_phone, system_type, issue_summary` | `high` |
| `cooling_repair` | Cooling Repair | `service_address, callback_phone, system_type, issue_summary` | `high` |
| `preventive_maintenance` | Preventive Maintenance | `service_address, callback_phone, system_type, preferred_time_window` | `med` |
| `seasonal_tune_up` | Seasonal Tune-Up | `service_address, callback_phone, system_type, preferred_time_window` | `med` |
| `thermostat_service` | Thermostat Repair/Install | `service_address, callback_phone, thermostat_type, issue_summary` | `med` |
| `indoor_air_quality` | Indoor Air Quality Solutions | `service_address, callback_phone, concern_type, property_type` | `med` |
| `ductwork_service` | Ductwork Repair/Sealing | `service_address, callback_phone, issue_summary, property_type` | `med` |
| `system_replacement_estimate` | System Replacement Estimate | `service_address, callback_phone, current_system_age, timeline` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `safety_emergency` | `triage_safety_emergency` | `route_live_dispatch` | `yes` |
| `urgent_outage_no_heat_no_cooling` | `triage_urgent_outage` | `schedule_priority_service` | `yes` |
| `routine_repair_request` | `collect_repair_details` | `schedule_standard_service` | `no` |
| `maintenance_plan_interest` | `maintenance_discovery` | `schedule_maintenance_visit` | `no` |
| `replacement_quote_request` | `replacement_lead_qualification` | `schedule_comfort_consultation` | `no` |
| `indoor_air_quality_request` | `iaq_discovery` | `schedule_iaq_consult` | `no` |
| `pricing_or_financing_question` | `pricing_financing_information` | `route_to_sales_queue` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `warranty_or_repeat_issue` | `account_lookup_and_history` | `route_service_manager` | `yes` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.dispatch-first.v1` enforces concise, practical guidance and booking-oriented behavior.
2. Industry compliance fragment: `compliance.hvac.safety-scope.v1` enforces no DIY hazardous advice, mandatory emergency handoff language, and escalation for safety flags.
3. Service discovery fragment set: `service.hvac.heating-repair.v1`, `service.hvac.cooling-repair.v1`, `service.hvac.maintenance.v1`, `service.hvac.replacement-estimate.v1`, and `service.hvac.iaq.v1`.
4. Scheduling and booking fragment: `booking.hvac.slot-capture.v1` captures required intake fields and validates appointment windows before tool invocation.
5. Escalation fragment: `escalation.hvac.safety-or-dispatch.v1` routes emergency and policy-bound cases to dispatch/human owner paths.
6. Out-of-scope response fragment: `fallback.hvac.out-of-scope.v1` politely declines unsupported requests and redirects to supported services.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with heating, cooling, scheduling, and urgent service requests. What can I help you with today?"
2. Allowed owner customizations: company name, optional service-area mention, and optional after-hours disclosure while preserving immediate service intent.
3. Restricted wording policy: no guaranteed arrival times, no pricing promises without policy backing, and no claims that emergency issues are always instantly dispatchable.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` (professional/warm), plus other admin-curated voices tagged `professional` and `clear` for high-stress calls.
2. Allowed voice parameter ranges: `stability` 0.55-0.85, `similarity_boost` 0.65-0.9, and `speed` 0.95-1.08.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/heating`, `/cooling`, `/maintenance`, `/repair`, `/financing`, `/service-area`, `/about`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, service PDFs, maintenance plan sheets, financing one-pagers, and warranty/process docs.
3. Mandatory source categories: service catalog, emergency guidance and expectations, service area + hours, contact/dispatch path, and financing/payment policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `system_type` | `enum` | `no` | `furnace`, `heat_pump`, `central_ac`, `mini_split`, `unknown` |
| `system_age_years` | `integer` | `no` | Integer 0-60 |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Dispatch-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `financing_interest` | `boolean` | `no` | Set on replacement/pricing flows |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for technician/dispatcher |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `safety_triage_accuracy` | Safety-critical signals correctly identified and escalated. | `0.98` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Service information is consistent with approved KB. | `0.9` |
| `booking_completeness` | Required dispatch fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.93` |
| `empathy_and_tone` | Tone is calm and professional in stressed calls. | `0.85` |
| `compliance_guardrails` | No disallowed guarantees or unsafe advice. | `0.97` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `hvac.greeting.default` verifies default greeting delivery and owner token substitution.
2. `hvac.intent.safety_emergency` ensures gas smell/CO alerts route to emergency escalation flow.
3. `hvac.intent.urgent_outage` validates urgent no-heat/no-cooling routing behavior.
4. `hvac.workflow.repair_booking` verifies repair intake fields and booking tool invocation.
5. `hvac.workflow.maintenance_booking` verifies maintenance discovery and slot capture.
6. `hvac.workflow.replacement_qualification` verifies replacement lead qualification and consult scheduling.
7. `hvac.kb.service_area_lookup` verifies retrieval of service-area and hours policy.
8. `hvac.kb.financing_policy` verifies financing responses stay KB-grounded without overpromising.
9. `hvac.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `hvac.negative.no_unsafe_advice` verifies unsafe DIY guidance is never emitted.
11. `hvac.negative.no_false_guarantees` verifies no unsupported arrival-time or price guarantees.
12. `hvac.post_call.payload_schema` verifies webhook payload includes required data collection fields.

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

1. Compiled system prompt: `specs/v1/agent-factory/industry/hvac-system-prompt.v1.md`
2. HVAC workflow instance: `specs/v1/agent-factory/industry/hvac-workflow.v1.yaml`
3. HVAC blueprint starter: `specs/v1/agent-factory/industry/hvac-blueprint.v1.yaml`
4. HVAC core-tabs profile: `specs/v1/agent-factory/core-tabs/hvac-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/hvac-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/hvac-release-checklist.md`

## 14. ElevenLabs Feature Utilization (HVAC)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
