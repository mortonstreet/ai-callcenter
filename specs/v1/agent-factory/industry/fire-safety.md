# Industry Pack: Fire Safety

Status: Implemented (Spec-Level)
Industry: `fire_safety`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: fire alarm inspection bookings, suppression/extinguisher service, monitoring/trouble-ticket support, and code-compliance questions.
2. High-risk call patterns: active alarm trouble on protected properties, impairment of critical life-safety systems, false alarm events with authority involvement, and reported fire/smoke incidents.
3. Common escalation triggers: any life-safety risk, jurisdiction/code authority requests, unresolved recurring system faults, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `life_safety_emergency` | Life Safety Emergency | `service_address, callback_phone, incident_type, occupants_at_risk` | `high` |
| `fire_alarm_trouble_call` | Fire Alarm Trouble Call | `service_address, callback_phone, panel_status, zone_or_device` | `high` |
| `alarm_inspection` | Fire Alarm Inspection | `service_address, callback_phone, occupancy_type, inspection_due_date` | `high` |
| `sprinkler_system_service` | Sprinkler System Service | `service_address, callback_phone, impairment_status, issue_summary` | `high` |
| `extinguisher_service` | Extinguisher Service | `service_address, callback_phone, extinguisher_count, service_type` | `med` |
| `monitoring_support` | Monitoring/Dispatch Support | `service_address, callback_phone, account_reference, issue_summary` | `high` |
| `system_upgrade_estimate` | System Upgrade Estimate | `service_address, callback_phone, property_type, project_timeline` | `med` |
| `compliance_consultation` | Compliance Consultation | `service_address, callback_phone, authority_jurisdiction, concern_type` | `med` |
| `false_alarm_support` | False Alarm Support | `service_address, callback_phone, alarm_event_time, authority_contacted` | `med` |
| `maintenance_plan` | Preventive Maintenance Plan | `service_address, callback_phone, system_types, visit_frequency` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `life_safety_emergency` | `triage_life_safety_emergency` | `route_live_dispatch` | `yes` |
| `alarm_trouble_urgent` | `triage_alarm_trouble` | `schedule_priority_service` | `yes` |
| `inspection_booking_request` | `inspection_booking_flow` | `schedule_inspection_visit` | `no` |
| `suppression_service_request` | `suppression_service_flow` | `schedule_field_service` | `no` |
| `monitoring_or_false_alarm_support` | `monitoring_support_flow` | `route_monitoring_queue` | `yes` |
| `compliance_or_code_question` | `compliance_information_flow` | `route_service_manager` | `yes` |
| `pricing_or_warranty_question` | `pricing_warranty_information` | `route_service_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.life-safety-first.v1` enforces concise, safety-first communication and strict escalation behavior.
2. Industry compliance fragment: `compliance.fire-safety.life-safety-scope.v1` enforces no hazardous advice and mandatory emergency transfer language.
3. Service discovery fragment set: `service.fire-safety.alarm.v1`, `service.fire-safety.suppression.v1`, `service.fire-safety.inspection.v1`, `service.fire-safety.monitoring.v1`, and `service.fire-safety.compliance.v1`.
4. Scheduling and booking fragment: `booking.fire-safety.intake-capture.v1` captures system type, impairment state, and authority context before booking.
5. Escalation fragment: `escalation.fire-safety.life-safety-or-manager.v1` routes life-safety and authority-driven cases to dispatch/manager handoff.
6. Out-of-scope response fragment: `fallback.fire-safety.out-of-scope.v1` declines emergency-response substitute behavior and redirects to emergency services where required.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with fire safety system support, inspections, and urgent service requests. What do you need help with?"
2. Allowed owner customizations: company name, system specialties, and after-hours disclosure while preserving life-safety triage language.
3. Restricted wording policy: no claims that AI replaces emergency response, no unsupported code compliance determinations, and no bypass of emergency escalation policy.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `clear`, `calm`, and `authoritative`.
2. Allowed voice parameter ranges: `stability` 0.62-0.9, `similarity_boost` 0.65-0.9, and `speed` 0.94-1.06.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/fire-alarm`, `/sprinkler`, `/extinguisher`, `/inspection`, `/monitoring`, `/compliance`, `/service-area`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, inspection program docs, system service guides, monitoring policy docs, and compliance/warranty docs.
3. Mandatory source categories: life-safety escalation policy, supported system catalog, service area + hours, authority/inspection process guidance, and monitoring/warranty policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `system_type` | `enum` | `yes` | `alarm`, `sprinkler`, `extinguisher`, `monitoring`, `mixed`, `unknown` |
| `impairment_status` | `enum` | `no` | `none_reported`, `partial_impairment`, `full_impairment`, `unknown` |
| `authority_involved` | `boolean` | `no` | True if fire authority/JAHJ is involved |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Dispatch-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `account_reference` | `string` | `no` | Monitoring account or site ID |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for technician/manager |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `life_safety_triage_accuracy` | Life-safety risk scenarios correctly identified and escalated. | `0.99` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.93` |
| `knowledge_grounding_accuracy` | Service information remains KB-grounded and policy-safe. | `0.92` |
| `booking_completeness` | Required intake fields captured before booking. | `0.93` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.95` |
| `empathy_and_tone` | Tone remains calm and precise in critical scenarios. | `0.86` |
| `compliance_guardrails` | No unsafe guidance or unsupported compliance claims. | `0.99` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.96` |

## 10. Baseline Test Pack

Required tests:

1. `fire_safety.greeting.default` verifies default greeting delivery and owner token substitution.
2. `fire_safety.intent.life_safety_emergency` verifies emergency scenario routes to immediate escalation.
3. `fire_safety.intent.alarm_trouble_urgent` verifies urgent alarm trouble routing behavior.
4. `fire_safety.workflow.inspection_booking` verifies inspection intake and booking tool invocation.
5. `fire_safety.workflow.monitoring_support` verifies monitoring support routing and context capture.
6. `fire_safety.workflow.compliance_information` verifies compliance inquiry handling and escalation rules.
7. `fire_safety.kb.life_safety_policy` verifies emergency/life-safety messaging is KB-grounded.
8. `fire_safety.kb.monitoring_policy` verifies monitoring responses stay within policy.
9. `fire_safety.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `fire_safety.negative.no_unsafe_advice` verifies unsafe system handling guidance is never emitted.
11. `fire_safety.negative.no_false_compliance_guarantee` verifies no unsupported code pass guarantees.
12. `fire_safety.post_call.payload_schema` verifies webhook payload includes required data collection fields.

## 11. Admin Review Requirements

1. Prompt fragment set approved by admin policy owner.
2. Life-safety and escalation wording reviewed by operations lead.
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

1. Compiled system prompt: `specs/v1/agent-factory/industry/fire-safety-system-prompt.v1.md`
2. Fire Safety workflow instance: `specs/v1/agent-factory/industry/fire-safety-workflow.v1.yaml`
3. Fire Safety blueprint starter: `specs/v1/agent-factory/industry/fire-safety-blueprint.v1.yaml`
4. Fire Safety core-tabs profile: `specs/v1/agent-factory/core-tabs/fire-safety-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/fire-safety-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/fire-safety-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Fire Safety)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
