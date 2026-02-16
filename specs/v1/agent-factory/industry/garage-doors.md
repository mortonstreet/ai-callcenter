# Industry Pack: Garage Doors

Status: Implemented (Spec-Level)
Industry: `garage_doors`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops
Last Updated: February 16, 2026

## 1. Industry Summary

1. Core customer request patterns: broken spring calls, opener diagnostics, off-track door issues, cable/roller repairs, and replacement estimate requests.
2. High-risk call patterns: door stuck open creating security risk, door stuck half-open with safety hazard, snapped springs/cables, and trapped-vehicle urgent calls.
3. Common escalation triggers: safety-critical mechanical failure, recurring unresolved service issues, warranty disputes, and explicit human transfer requests.

## 2. Service Taxonomy

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `door_stuck_open_emergency` | Door Stuck Open Emergency | `service_address, callback_phone, door_position, security_risk` | `high` |
| `door_stuck_closed_urgent` | Door Stuck Closed Urgent | `service_address, callback_phone, vehicle_trapped_status, issue_summary` | `high` |
| `broken_spring_repair` | Broken Spring Repair | `service_address, callback_phone, spring_status, door_size_type` | `high` |
| `opener_repair` | Opener Repair | `service_address, callback_phone, opener_brand, issue_summary` | `med` |
| `track_roller_cable_repair` | Track/Roller/Cable Repair | `service_address, callback_phone, component_issue, door_position` | `med` |
| `sensor_alignment_service` | Sensor Alignment Service | `service_address, callback_phone, sensor_behavior, issue_summary` | `low` |
| `new_door_installation` | New Door Installation | `service_address, callback_phone, door_style_preference, timeline` | `med` |
| `opener_installation` | New Opener Installation | `service_address, callback_phone, opener_preference, timeline` | `low` |
| `preventive_tune_up` | Preventive Tune-Up | `service_address, callback_phone, door_count, preferred_time_window` | `low` |
| `warranty_follow_up` | Warranty Follow-Up | `service_address, callback_phone, prior_job_reference, issue_summary` | `med` |

## 3. Intent Map

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `safety_mechanical_emergency` | `triage_mechanical_emergency` | `route_live_dispatch` | `yes` |
| `urgent_access_or_security_issue` | `triage_urgent_access_issue` | `schedule_priority_service` | `yes` |
| `routine_repair_request` | `collect_repair_details` | `schedule_standard_service` | `no` |
| `new_installation_request` | `installation_qualification` | `route_estimate_queue` | `no` |
| `maintenance_tuneup_request` | `maintenance_booking_flow` | `schedule_maintenance_visit` | `no` |
| `pricing_or_warranty_question` | `pricing_warranty_information` | `route_service_manager` | `yes` |
| `reschedule_or_cancel` | `appointment_change_flow` | `route_dispatch_queue` | `no` |
| `human_agent_request` | `human_handoff` | `fallback_general_information` | `yes` |
| `out_of_scope_request` | `out_of_scope_response` | `fallback_general_information` | `no` |

## 4. Prompt Fragment Pack

1. Core persona fragment: `core.customer-service.dispatch-first.v1` enforces concise, practical support and booking-first behavior.
2. Industry compliance fragment: `compliance.garage-doors.safety-scope.v1` enforces no hazardous DIY spring/cable guidance and emergency escalation language.
3. Service discovery fragment set: `service.garage-doors.spring-repair.v1`, `service.garage-doors.opener.v1`, `service.garage-doors.track-roller.v1`, `service.garage-doors.installation.v1`, and `service.garage-doors.maintenance.v1`.
4. Scheduling and booking fragment: `booking.garage-doors.intake-capture.v1` captures door status, access risk, and equipment details before booking.
5. Escalation fragment: `escalation.garage-doors.safety-or-manager.v1` routes emergency and dispute flows to dispatch/manager handoff.
6. Out-of-scope response fragment: `fallback.garage-doors.out-of-scope.v1` declines unrelated construction/automotive requests and redirects appropriately.

## 5. Greeting Policy

1. Default greeting: "Hi, thanks for calling {{company_name}}. I can help with garage door repairs, opener issues, and scheduling. What issue are you dealing with?"
2. Allowed owner customizations: company name, service-area mention, and after-hours disclosure while preserving urgent triage language.
3. Restricted wording policy: no guaranteed same-minute dispatch promises and no hazardous DIY repair instructions.

## 6. Voice Policy

1. Recommended voice profiles: default `cgSgspJ2msm6clMCkdW9` plus admin-curated profiles tagged `clear`, `calm`, and `professional`.
2. Allowed voice parameter ranges: `stability` 0.55-0.85, `similarity_boost` 0.65-0.9, and `speed` 0.95-1.08.
3. Owner-editable options: voice selection inside curated catalog and bounded parameter tuning only.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults: include `/`, `/services`, `/garage-door-repair`, `/spring-repair`, `/opener-repair`, `/new-installation`, `/maintenance`, `/service-area`, `/contact`; exclude `/privacy`, `/terms`, `/careers`, `/wp-admin`, `/cart`, `/checkout`.
2. Allowed source types: public website URLs, product/spec sheets, warranty docs, and service-area/hours pages.
3. Mandatory source categories: service catalog, emergency access/security handling expectations, service area + hours, and warranty/pricing policy.

## 8. Data Collection Schema

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `booked`, `info_provided`, `escalated`, `unresolved` |
| `follow_up_status` | `enum` | `yes` | `none_required`, `callback_required`, `transfer_completed` |
| `customer_sentiment` | `enum` | `yes` | `positive`, `neutral`, `frustrated`, `distressed` |
| `urgency_level` | `enum` | `yes` | `emergency`, `urgent`, `standard` |
| `service_type` | `enum` | `yes` | Must map to taxonomy service IDs |
| `door_position` | `enum` | `no` | `open`, `closed`, `half_open`, `off_track`, `unknown` |
| `mechanical_issue_type` | `enum` | `no` | `spring`, `cable`, `roller`, `track`, `opener`, `sensor`, `other` |
| `security_risk_flag` | `boolean` | `no` | Set when door is open/unsecured |
| `issue_summary` | `string` | `yes` | Caller symptom in plain language |
| `service_address` | `string` | `yes` | Dispatch-ready location |
| `preferred_time_window` | `string` | `no` | Appointment preference |
| `warranty_status` | `enum` | `no` | `under_warranty`, `out_of_warranty`, `unknown` |
| `escalation_reason` | `string` | `no` | Required when escalation occurs |
| `agent_notes` | `string` | `no` | Additional context for technician |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `safety_triage_accuracy` | Mechanical safety and access/security risks correctly escalated. | `0.97` |
| `intent_routing_accuracy` | Call intent maps to correct branch. | `0.92` |
| `knowledge_grounding_accuracy` | Service information remains KB-grounded and policy-safe. | `0.9` |
| `booking_completeness` | Required intake fields captured before booking. | `0.92` |
| `escalation_quality` | Escalations are policy-correct and context-rich. | `0.93` |
| `empathy_and_tone` | Tone remains calm and practical in urgent access scenarios. | `0.86` |
| `compliance_guardrails` | No unsafe repair guidance or unsupported guarantees. | `0.97` |
| `data_capture_completeness` | Required collection schema fields are populated. | `0.95` |

## 10. Baseline Test Pack

Required tests:

1. `garage_doors.greeting.default` verifies default greeting delivery and owner token substitution.
2. `garage_doors.intent.safety_mechanical_emergency` verifies spring/cable hazard scenarios route to escalation.
3. `garage_doors.intent.urgent_access_or_security_issue` verifies stuck-open/stuck-closed urgent routing.
4. `garage_doors.workflow.repair_booking` verifies repair intake fields and booking tool invocation.
5. `garage_doors.workflow.installation_qualification` verifies installation estimate qualification path.
6. `garage_doors.workflow.maintenance_booking` verifies maintenance scheduling flow.
7. `garage_doors.kb.warranty_policy` verifies warranty responses remain KB-grounded.
8. `garage_doors.kb.pricing_policy` verifies pricing messaging stays policy-safe.
9. `garage_doors.escalation.human_handoff` verifies human transfer path and escalation reason capture.
10. `garage_doors.negative.no_unsafe_advice` verifies unsafe spring/cable DIY guidance is never emitted.
11. `garage_doors.negative.no_false_guarantees` verifies no unsupported dispatch/timing guarantees.
12. `garage_doors.post_call.payload_schema` verifies webhook payload includes required data collection fields.

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

1. Compiled system prompt: `specs/v1/agent-factory/industry/garage-doors-system-prompt.v1.md`
2. Garage Doors workflow instance: `specs/v1/agent-factory/industry/garage-doors-workflow.v1.yaml`
3. Garage Doors blueprint starter: `specs/v1/agent-factory/industry/garage-doors-blueprint.v1.yaml`
4. Garage Doors core-tabs profile: `specs/v1/agent-factory/core-tabs/garage-doors-core-tabs-profile.v1.yaml`
5. ElevenLabs capability map: `specs/v1/agent-factory/industry/garage-doors-elevenlabs-capability-map.v1.md`
6. Release checklist: `specs/v1/agent-factory/industry/garage-doors-release-checklist.md`

## 14. ElevenLabs Feature Utilization (Garage Doors)

1. Uses a compiled system prompt with explicit workflow-node routing and safety escalation language.
2. Uses dynamic variable governance with reserved prefixes (`system__`, `agent__`) and no-fabrication rules for missing variables.
3. Uses docs-aligned tools policy (`tool_ids` + `built_in_tools`) and explicit server-tool approval mode defaults.
4. Uses private-agent posture for widget/auth policy with signed URL requirements.
5. Uses workflow-overrides support and versioning/branch-aware rollout policy for safe staged changes.
6. Uses testing policy aligned to baseline + daily regression execution.
