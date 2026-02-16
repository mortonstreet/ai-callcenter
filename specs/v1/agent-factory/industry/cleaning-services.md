# Industry Pack: Clean Services (Home Cleaning)

Status: Implemented (Spec-Level)
Industry: `cleaning_services`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: recurring home cleaning inquiries, deep clean requests, move-in/move-out bookings, one-time cleanings, and add-on service questions.
2. High-risk call patterns: biohazard or hoarding requests beyond service scope, severe sanitation complaints, and urgent pre-event deadlines requiring escalation.
3. Common escalation triggers: safety/scope violations, repeated quality complaints, damage disputes, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `one_time_home_cleaning` | One-Time Home Cleaning | `service_address, callback_phone, home_size, preferred_time_window` | `med` |
| `recurring_cleaning_plan` | Recurring Cleaning Plan | `service_address, callback_phone, home_size, cleaning_frequency` | `high` |
| `deep_cleaning` | Deep Cleaning Service | `service_address, callback_phone, home_size, focus_areas` | `high` |
| `move_in_move_out_cleaning` | Move-In/Move-Out Cleaning | `service_address, callback_phone, move_date, property_status` | `high` |
| `post_renovation_cleaning` | Post-Renovation Cleaning | `service_address, callback_phone, dust_debris_level, property_status` | `med` |
| `short_term_rental_turnover` | Rental Turnover Cleaning | `service_address, callback_phone, turnover_window, unit_count` | `med` |
| `kitchen_bath_focus_cleaning` | Kitchen/Bath Focus Cleaning | `service_address, callback_phone, focus_areas, condition_level` | `low` |
| `inside_appliance_addon` | Inside Appliance Add-On | `service_address, callback_phone, appliance_list, preferred_time_window` | `low` |
| `laundry_linen_addon` | Laundry/Linen Add-On | `service_address, callback_phone, load_volume, preferred_time_window` | `low` |
| `quality_follow_up` | Quality Follow-Up | `service_address, callback_phone, prior_job_reference, issue_summary` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `scope_or_safety_exception` | `triage_scope_exception` | `route_service_manager` | `yes` |
| `urgent_deadline_request` | `triage_urgent_schedule` | `schedule_priority_service` | `yes` |
| `new_booking_request` | `cleaning_service_discovery` | `schedule_standard_service` | `no` |
| `recurring_plan_interest` | `recurring_plan_flow` | `route_plan_sales` | `no` |
| `move_in_move_out_request` | `move_service_flow` | `schedule_move_service` | `no` |
| `pricing_or_package_question` | `pricing_package_information` | `route_service_manager` | `yes` |
| `quality_complaint` | `quality_recovery_flow` | `route_quality_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.warm-booking-first.v1` enforces clear, courteous, detail-oriented booking behavior.
2. Industry compliance fragment: `compliance.cleaning-services.scope-safety.v1` enforces scope boundaries and no unsafe/unsupported cleaning claims.
3. Service discovery fragment set: `service.cleaning-services.recurring.v1`, `service.cleaning-services.deep-clean.v1`, `service.cleaning-services.move.v1`, `service.cleaning-services.turnover.v1`, and `service.cleaning-services.addons.v1`.
4. Scheduling and booking fragment: `booking.cleaning-services.intake-capture.v1` captures home size, condition, access notes, and time windows before booking.
5. Escalation fragment: `escalation.cleaning-services.quality-or-manager.v1` routes quality and dispute flows to manager handoff.
6. Out-of-scope response fragment: `fallback.cleaning-services.out-of-scope.v1` declines unsupported specialty/biohazard services and redirects appropriately.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with home cleaning services, pricing, and scheduling. What type of cleaning do you need?"
2. Allowed owner customizations: company name, service-area mention, and after-hours disclosure while preserving booking-oriented intent.
3. Restricted wording policy: no guaranteed completion times without policy backing and no claims of providing disallowed specialty cleanup services.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `warm`, `clear`, and `professional`.
2. Allowed voice parameter ranges: `stability` 0.55-0.85, `similarity_boost` 0.65-0.9, and `speed` 0.96-1.1.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/home-cleaning`, `/deep-cleaning`, `/move-in-move-out`, `/recurring`, `/pricing`, `/service-area`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, service checklists, prep/access policy docs, and pricing/warranty docs.
3. Mandatory source categories: service catalog and inclusions/exclusions, prep and access requirements, service area + hours, and quality guarantee/cancellation policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `home_size` | `enum` | `yes` | `studio`, `1_bed`, `2_bed`, `3_bed`, `4_plus_bed`, `unknown` |
| `bathroom_count` | `integer` | `no` | Integer 0-10 |
| `pet_presence` | `boolean` | `no` | Indicates pets in home |
| `condition_level` | `enum` | `no` | `light`, `moderate`, `heavy`, `unknown` |
| `issue_summary` | `string` | `yes` | Caller need in plain language |
| `service_address` | `string` | `yes` | Service-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `recurring_frequency` | `enum` | `no` | `weekly`, `biweekly`, `monthly`, `one_time` |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for cleaning crew |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `scope_routing_accuracy` | Scope-exception and quality escalation scenarios correctly routed. | `0.94` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Service details remain KB-grounded and policy-safe. | `0.9` |
| `booking_completeness` | Required intake fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.92` |
| `empathy_and_tone` | Tone remains warm and professional, especially for complaints. | `0.9` |
| `compliance_guardrails` | No unsupported service promises or unsafe claims. | `0.96` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `cleaning_services.greeting.default` verifies default greeting delivery and owner token substitution.
2. `cleaning_services.intent.scope_or_safety_exception` verifies out-of-scope scenarios route correctly.
3. `cleaning_services.intent.urgent_deadline_request` verifies urgent scheduling routing behavior.
4. `cleaning_services.workflow.new_booking` verifies intake fields and booking tool invocation.
5. `cleaning_services.workflow.recurring_plan` verifies recurring plan qualification and routing.
6. `cleaning_services.workflow.move_service` verifies move-in/move-out intake handling.
7. `cleaning_services.kb.pricing_packages` verifies pricing/package responses remain KB-grounded.
8. `cleaning_services.kb.quality_policy` verifies quality guarantee/callback messaging stays policy-safe.
9. `cleaning_services.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `cleaning_services.negative.no_false_guarantees` verifies no unsupported time/scope guarantees.
11. `cleaning_services.negative.no_out_of_scope_commitment` verifies unsupported specialty cleanup is not promised.
12. `cleaning_services.post_call.payload_schema` verifies webhook payload includes required data collection fields.

## 11. Admin Review Requirements

1. Prompt fragment set approved by admin policy owner.
2. Scope and escalation wording reviewed by operations lead.
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

1. Compiled system prompt: `specs/v1/agent-factory/industry/cleaning-services-system-prompt.v1.md`
2. Clean Services (Home Cleaning) workflow instance: `specs/v1/agent-factory/industry/cleaning-services-workflow.v1.yaml`
3. Clean Services (Home Cleaning) blueprint starter: `specs/v1/agent-factory/industry/cleaning-services-blueprint.v1.yaml`
4. Clean Services (Home Cleaning) core-tabs profile: `specs/v1/agent-factory/core-tabs/cleaning-services-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/cleaning-services-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/cleaning-services-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Clean Services (Home Cleaning))

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
