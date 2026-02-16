# Industry Pack: Plumbing

Status: Implemented (Spec-Level)
Industry: `plumbing`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: emergency leaks, drain/sewer issues, water heater failures, fixture repairs/replacements, and installation estimate requests.
2. High-risk call patterns: active flooding, sewer backup exposure, no water in occupied property, suspected gas leak near water heater, and burst pipe in freezing conditions.
3. Common escalation triggers: safety-critical water/sewer events, repeated unresolved leaks, warranty disputes, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `burst_pipe_emergency` | Burst Pipe Emergency | `service_address, callback_phone, flooding_status, water_shutoff_status` | `high` |
| `sewer_backup_emergency` | Sewer Backup Emergency | `service_address, callback_phone, backup_location, exposure_risk` | `high` |
| `major_leak_repair` | Major Leak Repair | `service_address, callback_phone, leak_location, water_shutoff_status` | `high` |
| `drain_clog_service` | Drain Clog Service | `service_address, callback_phone, drain_location, issue_duration` | `med` |
| `toilet_repair` | Toilet Repair | `service_address, callback_phone, issue_summary, fixture_count` | `med` |
| `water_heater_repair` | Water Heater Repair | `service_address, callback_phone, heater_type, no_hot_water_status` | `high` |
| `water_heater_installation` | Water Heater Installation | `service_address, callback_phone, heater_type_preference, timeline` | `med` |
| `fixture_installation` | Fixture Installation | `service_address, callback_phone, fixture_type, timeline` | `low` |
| `sump_pump_service` | Sump Pump Service | `service_address, callback_phone, pump_status, flooding_risk` | `med` |
| `repiping_estimate` | Repiping Estimate | `service_address, callback_phone, property_type, estimate_timeline` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `safety_emergency` | `triage_safety_emergency` | `route_live_dispatch` | `yes` |
| `active_flooding_or_backup` | `triage_water_damage_urgent` | `schedule_priority_service` | `yes` |
| `routine_repair_request` | `collect_repair_details` | `schedule_standard_service` | `no` |
| `water_heater_issue` | `water_heater_flow` | `schedule_water_heater_service` | `no` |
| `installation_or_repipe_quote` | `installation_estimate_discovery` | `route_estimate_queue` | `no` |
| `pricing_or_warranty_question` | `pricing_warranty_information` | `route_service_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.dispatch-first.v1` enforces calm, action-oriented intake behavior.
2. Industry compliance fragment: `compliance.plumbing.safety-scope.v1` enforces no unsafe remediation instructions and clear emergency handoff language.
3. Service discovery fragment set: `service.plumbing.emergency-repair.v1`, `service.plumbing.drain.v1`, `service.plumbing.water-heater.v1`, `service.plumbing.installation.v1`, and `service.plumbing.repiping.v1`.
4. Scheduling and booking fragment: `booking.plumbing.intake-capture.v1` captures emergency and routing fields before booking attempts.
5. Escalation fragment: `escalation.plumbing.safety-or-manager.v1` routes emergencies and dispute flows to dispatch/manager handoff.
6. Out-of-scope response fragment: `fallback.plumbing.out-of-scope.v1` declines unsupported construction/general contractor requests and redirects appropriately.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with plumbing emergencies, repairs, and scheduling. What plumbing issue are you dealing with?"
2. Allowed owner customizations: company name, service-area mention, and after-hours disclosure while preserving urgent triage intent.
3. Restricted wording policy: no guaranteed arrival-time promises without policy backing and no fixed-price promises before diagnostic qualification.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `clear`, `calm`, and `professional`.
2. Allowed voice parameter ranges: `stability` 0.55-0.85, `similarity_boost` 0.65-0.9, and `speed` 0.95-1.08.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/emergency-plumbing`, `/drain`, `/water-heater`, `/repiping`, `/service-area`, `/financing`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, emergency response policy docs, prep/arrival expectation docs, warranty docs, and financing docs.
3. Mandatory source categories: emergency response expectations, service catalog, service area + hours, warranty/follow-up policy, and payment/financing policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `issue_category` | `enum` | `yes` | `leak`, `drain`, `sewer`, `water_heater`, `fixture`, `sump_pump`, `repipe`, `other` |
| `water_shutoff_status` | `enum` | `no` | `confirmed_off`, `unable_to_turn_off`, `unknown` |
| `active_flooding_status` | `boolean` | `no` | Set when active flooding is reported |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Dispatch-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `financing_interest` | `boolean` | `no` | Set on estimate/installation flows |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for technician/dispatcher |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `safety_triage_accuracy` | Safety-critical leak/sewer/flooding scenarios correctly escalated. | `0.97` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Service information remains KB-grounded and policy-safe. | `0.9` |
| `booking_completeness` | Required intake fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.93` |
| `empathy_and_tone` | Tone remains calm and practical during stressful incidents. | `0.86` |
| `compliance_guardrails` | No disallowed guarantees or unsafe remediation advice. | `0.97` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `plumbing.greeting.default` verifies default greeting delivery and owner token substitution.
2. `plumbing.intent.safety_emergency` verifies gas/unsafe scenarios route to emergency escalation.
3. `plumbing.intent.active_flooding_or_backup` verifies urgent water damage routing behavior.
4. `plumbing.workflow.repair_booking` verifies repair intake fields and booking tool invocation.
5. `plumbing.workflow.water_heater_flow` verifies water heater routing and qualification.
6. `plumbing.workflow.installation_estimate` verifies installation estimate qualification path.
7. `plumbing.kb.emergency_policy` verifies emergency response messaging is KB-grounded.
8. `plumbing.kb.warranty_policy` verifies warranty/follow-up responses stay within policy.
9. `plumbing.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `plumbing.negative.no_unsafe_advice` verifies unsafe DIY guidance is never emitted.
11. `plumbing.negative.no_false_guarantees` verifies no unsupported arrival-time or price guarantees.
12. `plumbing.post_call.payload_schema` verifies webhook payload includes required data collection fields.

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

1. Compiled system prompt: `specs/v1/agent-factory/industry/plumbing-system-prompt.v1.md`
2. Plumbing workflow instance: `specs/v1/agent-factory/industry/plumbing-workflow.v1.yaml`
3. Plumbing blueprint starter: `specs/v1/agent-factory/industry/plumbing-blueprint.v1.yaml`
4. Plumbing core-tabs profile: `specs/v1/agent-factory/core-tabs/plumbing-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/plumbing-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/plumbing-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Plumbing)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
