# Industry Pack: Pest Control

Status: Implemented (Spec-Level)
Industry: `pest_control`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: active infestation reports, inspection requests, one-time treatment bookings, recurring prevention plans, and follow-up concerns after prior service.
2. High-risk call patterns: dangerous stinging insect nests, severe rodent activity in occupied spaces, suspected termite structural damage, and pest exposure involving children or immunocompromised residents.
3. Common escalation triggers: safety-critical infestations, warranty disputes, repeated failed treatment claims, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `urgent_stinging_insect_response` | Urgent Stinging Insect Response | `service_address, callback_phone, nest_location, immediate_safety_risk` | `high` |
| `general_pest_inspection` | General Pest Inspection | `service_address, callback_phone, pest_type, issue_summary` | `high` |
| `rodent_control` | Rodent Control | `service_address, callback_phone, activity_locations, infestation_duration` | `high` |
| `roach_ant_treatment` | Ant/Cockroach Treatment | `service_address, callback_phone, pest_type, infestation_severity` | `med` |
| `termite_inspection` | Termite Inspection | `service_address, callback_phone, evidence_type, property_type` | `high` |
| `termite_treatment` | Termite Treatment | `service_address, callback_phone, prior_inspection_status, treatment_timeline` | `high` |
| `bed_bug_treatment` | Bed Bug Treatment | `service_address, callback_phone, rooms_impacted, infestation_duration` | `high` |
| `mosquito_tick_service` | Mosquito/Tick Yard Service | `service_address, callback_phone, property_type, service_frequency` | `med` |
| `wildlife_exclusion` | Wildlife Exclusion | `service_address, callback_phone, species_observed, entry_point_notes` | `med` |
| `recurring_prevention_plan` | Recurring Prevention Plan | `service_address, callback_phone, property_type, plan_preference` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `safety_incident` | `triage_safety_incident` | `route_live_dispatch` | `yes` |
| `active_infestation_urgent` | `triage_active_infestation` | `schedule_priority_service` | `yes` |
| `inspection_request` | `inspection_discovery` | `schedule_inspection_visit` | `no` |
| `treatment_booking_request` | `collect_treatment_details` | `schedule_standard_treatment` | `no` |
| `termite_concern` | `termite_flow` | `schedule_termite_specialist` | `no` |
| `recurring_plan_interest` | `recurring_plan_discovery` | `route_plan_sales` | `no` |
| `pricing_or_warranty_question` | `pricing_warranty_information` | `route_service_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.booking-first.v1` enforces concise, reassuring, action-oriented support.
2. Industry compliance fragment: `compliance.pest-control.safety-scope.v1` enforces safe guidance and no unsafe self-treatment instructions for hazardous scenarios.
3. Service discovery fragment set: `service.pest-control.inspection.v1`, `service.pest-control.termite.v1`, `service.pest-control.rodent.v1`, `service.pest-control.bed-bug.v1`, and `service.pest-control.recurring-plan.v1`.
4. Scheduling and booking fragment: `booking.pest-control.intake-capture.v1` enforces location, pest type, severity, and timing capture before scheduling.
5. Escalation fragment: `escalation.pest-control.safety-or-manager.v1` routes high-risk and dispute flows to dispatch/manager handoff.
6. Out-of-scope response fragment: `fallback.pest-control.out-of-scope.v1` redirects unsupported wildlife or municipal-health cases appropriately.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with pest concerns, treatment options, and scheduling. What issue are you seeing?"
2. Allowed owner customizations: company name, service-area mention, and after-hours disclosure while preserving immediate issue triage language.
3. Restricted wording policy: no guaranteed full eradication timelines, no unsupported safety claims, and no definitive diagnosis without intake context.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `calm`, `clear`, and `professional`.
2. Allowed voice parameter ranges: `stability` 0.55-0.85, `similarity_boost` 0.65-0.9, and `speed` 0.95-1.08.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/pests`, `/termite`, `/rodent`, `/bed-bug`, `/mosquito`, `/plans`, `/service-area`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, pest treatment prep guides, warranty policy docs, seasonal service sheets, and service-area docs.
3. Mandatory source categories: supported pest list, treatment/process expectations, preparation requirements, service area + hours, and warranty/follow-up policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `pest_type` | `enum` | `yes` | `ants`, `roaches`, `rodents`, `termites`, `bed_bugs`, `mosquitoes`, `wildlife`, `other` |
| `infestation_severity` | `enum` | `no` | `low`, `medium`, `high`, `unknown` |
| `infestation_duration` | `string` | `no` | Caller-reported timeline |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Service-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `safety_risk_flag` | `boolean` | `no` | Set when high-risk conditions are reported |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for technician/dispatcher |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `safety_triage_accuracy` | Safety-critical scenarios correctly identified and escalated. | `0.96` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Treatment info remains KB-grounded and policy-safe. | `0.9` |
| `booking_completeness` | Required intake fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.92` |
| `empathy_and_tone` | Tone remains calm and non-judgmental for distressed callers. | `0.87` |
| `compliance_guardrails` | No disallowed guarantees or unsafe self-treatment guidance. | `0.97` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `pest_control.greeting.default` verifies default greeting delivery and owner token substitution.
2. `pest_control.intent.safety_incident` verifies dangerous nest scenario routes to escalation flow.
3. `pest_control.intent.active_infestation` verifies urgent infestation routing behavior.
4. `pest_control.workflow.inspection_booking` verifies inspection intake capture and booking tool invocation.
5. `pest_control.workflow.termite_flow` verifies termite-specific routing and qualification.
6. `pest_control.kb.prep_instructions` verifies treatment prep responses are KB-grounded.
7. `pest_control.kb.warranty_policy` verifies follow-up/warranty responses stay within policy.
8. `pest_control.escalation.human_handoff` verifies manager transfer path and escalation reason capture.
9. `pest_control.negative.no_unsafe_advice` verifies unsafe control instructions are never emitted.
10. `pest_control.negative.no_overpromising` verifies no unsupported eradication guarantees.
11. `pest_control.post_call.payload_schema` verifies webhook payload includes required data collection fields.

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

1. Compiled system prompt: `specs/v1/agent-factory/industry/pest-control-system-prompt.v1.md`
2. Pest Control workflow instance: `specs/v1/agent-factory/industry/pest-control-workflow.v1.yaml`
3. Pest Control blueprint starter: `specs/v1/agent-factory/industry/pest-control-blueprint.v1.yaml`
4. Pest Control core-tabs profile: `specs/v1/agent-factory/core-tabs/pest-control-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/pest-control-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/pest-control-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Pest Control)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
