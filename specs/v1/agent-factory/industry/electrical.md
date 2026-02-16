# Industry Pack: Electrical

Status: Implemented (Spec-Level)
Industry: `electrical`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: outage troubleshooting, breaker/panel issues, outlet/lighting repairs, safety inspections, and upgrade/installation estimates.
2. High-risk call patterns: sparking outlets, burning smells, exposed wiring, repeated breaker trips with heat/smoke, and partial/full power loss affecting critical loads.
3. Common escalation triggers: safety-critical electrical hazards, potential fire risk, code/permitting disputes, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `electrical_hazard_emergency` | Electrical Hazard Emergency | `service_address, callback_phone, hazard_type, immediate_safety_risk` | `high` |
| `power_outage_diagnostic` | Power Outage Diagnostic | `service_address, callback_phone, outage_scope, utility_status_known` | `high` |
| `breaker_panel_repair` | Breaker/Panel Repair | `service_address, callback_phone, panel_issue_summary, breaker_trip_frequency` | `high` |
| `panel_upgrade` | Panel Upgrade | `service_address, callback_phone, panel_age_estimate, load_needs` | `med` |
| `outlet_switch_repair` | Outlet/Switch Repair | `service_address, callback_phone, affected_area, issue_summary` | `med` |
| `lighting_installation` | Lighting Installation | `service_address, callback_phone, fixture_type, timeline` | `low` |
| `ev_charger_installation` | EV Charger Installation | `service_address, callback_phone, charger_level, vehicle_count` | `med` |
| `generator_service` | Generator Service | `service_address, callback_phone, generator_type, issue_summary` | `med` |
| `electrical_safety_inspection` | Electrical Safety Inspection | `service_address, callback_phone, property_type, inspection_reason` | `med` |
| `rewiring_estimate` | Rewiring Estimate | `service_address, callback_phone, property_type, project_timeline` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `safety_emergency` | `triage_safety_emergency` | `route_live_dispatch` | `yes` |
| `power_loss_urgent` | `triage_outage_urgent` | `schedule_priority_service` | `yes` |
| `routine_repair_request` | `collect_repair_details` | `schedule_standard_service` | `no` |
| `panel_upgrade_or_load_question` | `panel_upgrade_discovery` | `route_estimate_queue` | `no` |
| `ev_charger_inquiry` | `ev_charger_discovery` | `schedule_ev_consultation` | `no` |
| `inspection_or_code_question` | `inspection_code_information` | `route_service_manager` | `yes` |
| `pricing_or_warranty_question` | `pricing_warranty_information` | `route_service_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.safety-first.v1` enforces calm, concise, risk-aware support behavior.
2. Industry compliance fragment: `compliance.electrical.safety-scope.v1` enforces strict no-hazardous-advice policy and emergency transfer language.
3. Service discovery fragment set: `service.electrical.repair.v1`, `service.electrical.panel-upgrade.v1`, `service.electrical.ev-charger.v1`, `service.electrical.inspection.v1`, and `service.electrical.rewiring.v1`.
4. Scheduling and booking fragment: `booking.electrical.intake-capture.v1` captures safety and diagnostic fields before tool invocation.
5. Escalation fragment: `escalation.electrical.safety-or-manager.v1` routes hazard and code-escalation flows to dispatch/manager handoff.
6. Out-of-scope response fragment: `fallback.electrical.out-of-scope.v1` declines unsupported utility-grid interventions and redirects appropriately.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with electrical issues, upgrades, and scheduling. What electrical problem are you dealing with?"
2. Allowed owner customizations: company name, service-area mention, and after-hours disclosure while preserving safety-first triage language.
3. Restricted wording policy: no guarantees about immediate remote resolution, no unsupported code/compliance guarantees, and no hazardous troubleshooting instructions.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `calm`, `clear`, and `authoritative`.
2. Allowed voice parameter ranges: `stability` 0.6-0.88, `similarity_boost` 0.65-0.9, and `speed` 0.95-1.07.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/emergency-electrical`, `/panel-upgrade`, `/ev-charger`, `/inspection`, `/service-area`, `/financing`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, service guides, permitting/code policy docs, warranty docs, and financing docs.
3. Mandatory source categories: emergency response expectations, service catalog, service area + hours, permitting/compliance disclaimers, and warranty/payment policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `hazard_type` | `enum` | `no` | `sparking`, `burning_smell`, `exposed_wire`, `outage`, `shock_risk`, `other` |
| `affected_area` | `string` | `no` | Room/zone impacted |
| `breaker_trip_frequency` | `enum` | `no` | `single_event`, `intermittent`, `frequent`, `constant` |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Dispatch-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `financing_interest` | `boolean` | `no` | Set on upgrade/estimate flows |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for technician/dispatcher |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `safety_triage_accuracy` | Hazard scenarios correctly identified and escalated. | `0.98` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Service information remains KB-grounded and policy-safe. | `0.9` |
| `booking_completeness` | Required intake fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.94` |
| `empathy_and_tone` | Tone remains calm and clear during hazard situations. | `0.85` |
| `compliance_guardrails` | No unsafe guidance or unsupported code guarantees. | `0.98` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `electrical.greeting.default` verifies default greeting delivery and owner token substitution.
2. `electrical.intent.safety_emergency` verifies sparking/burning smell scenarios route to emergency escalation.
3. `electrical.intent.power_loss_urgent` verifies outage routing behavior.
4. `electrical.workflow.repair_booking` verifies repair intake fields and booking tool invocation.
5. `electrical.workflow.panel_upgrade` verifies panel upgrade qualification path.
6. `electrical.workflow.ev_charger_consult` verifies EV charger consultation routing.
7. `electrical.kb.permitting_policy` verifies permitting/code messaging is KB-grounded.
8. `electrical.kb.warranty_policy` verifies warranty/follow-up responses stay within policy.
9. `electrical.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `electrical.negative.no_unsafe_advice` verifies unsafe troubleshooting advice is never emitted.
11. `electrical.negative.no_false_guarantees` verifies no unsupported arrival-time or compliance guarantees.
12. `electrical.post_call.payload_schema` verifies webhook payload includes required data collection fields.

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

1. Compiled system prompt: `specs/v1/agent-factory/industry/electrical-system-prompt.v1.md`
2. Electrical workflow instance: `specs/v1/agent-factory/industry/electrical-workflow.v1.yaml`
3. Electrical blueprint starter: `specs/v1/agent-factory/industry/electrical-blueprint.v1.yaml`
4. Electrical core-tabs profile: `specs/v1/agent-factory/core-tabs/electrical-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/electrical-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/electrical-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Electrical)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
