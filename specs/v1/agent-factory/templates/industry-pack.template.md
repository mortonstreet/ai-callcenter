# Industry Pack Template

Status: Draft
Industry: `<industry_slug>`
Pack Version: `v1.0.0`
Owner: Product + Agent Ops

## 1. Industry Summary

1. Core customer request patterns.
2. High-risk call patterns.
3. Common escalation triggers.

## 2. Service Taxonomy

List all services supported in onboarding for this industry.

| Service ID | Service Label | Required Intake Fields | Priority |
|---|---|---|---|
| `<service_id>` | `<service_label>` | `<field_1>, <field_2>` | `high/med/low` |

## 3. Intent Map

Define root intents and target workflow branches.

| Intent | Branch Node | Fallback Branch | Escalation Needed |
|---|---|---|---|
| `<intent_name>` | `<node_name>` | `<fallback_node>` | `yes/no` |

## 4. Prompt Fragment Pack

1. Core persona fragment.
2. Industry compliance fragment.
3. Service discovery fragment set.
4. Scheduling and booking fragment.
5. Escalation fragment.
6. Out-of-scope response fragment.

## 5. Greeting Policy

1. Default greeting for industry.
2. Allowed owner customizations.
3. Restricted wording policy.

## 6. Voice Policy

1. Recommended voice profiles.
2. Allowed voice parameter ranges.
3. Owner-editable options.

## 7. Knowledge Base Policy

1. Crawl include/exclude defaults.
2. Allowed source types.
3. Mandatory source categories.

## 8. Data Collection Schema

List required collected fields.

| Field Key | Type | Required | Notes |
|---|---|---|---|
| `resolution_status` | `enum` | `yes` | `<notes>` |
| `follow_up_status` | `enum` | `yes` | `<notes>` |
| `customer_sentiment` | `enum` | `yes` | `<notes>` |
| `agent_notes` | `string` | `no` | `<notes>` |

## 9. Evaluation Criteria

| Criterion ID | Description | Threshold |
|---|---|---|
| `<criterion_id>` | `<description>` | `<0.00-1.00>` |

## 10. Baseline Test Pack

Required tests:

1. Greeting response.
2. Intent detection.
3. Workflow node transition.
4. Knowledge base retrieval.
5. Escalation behavior.
6. Edge-case negative outcome prevention.

## 11. Admin Review Requirements

1. Prompt review approved.
2. Workflow review approved.
3. Test pack pass on staging.
4. Daily schedule enabled.
5. Rollback plan documented.

