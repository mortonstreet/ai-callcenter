# HVAC ElevenLabs Capability Map (v1)

Status: Implemented (Spec-Level)
Industry: `hvac`
Purpose: Trace HVAC implementation choices to official ElevenLabs documentation.

## 1. Workflow And Routing

Decision:

1. Define explicit intent-to-node routing with fallback and escalation paths.
2. Keep workflow overrides enabled for signed URL/start-conversation context.

Sources:

1. https://elevenlabs.io/docs/agents-platform/workflows
2. https://elevenlabs.io/docs/agents-platform/conversation-flow

## 2. Prompt And Context

Decision:

1. Use a compiled, admin-governed system prompt with deterministic sections.
2. Keep prompt concise and focused on role/rules/tool use/output constraints.

Sources:

1. https://elevenlabs.io/docs/agents-platform/system-prompt

## 3. Tools Configuration

Decision:

1. Use docs-aligned tool configuration (`tool_ids` + `built_in_tools`).
2. Use server-tool approval modes and bounded response timeouts.
3. Include built-in system tools (`end_call`, `language_detection`, `transfer_to_number`) with policy gating.

Sources:

1. https://elevenlabs.io/docs/agents-platform/tools
2. https://elevenlabs.io/docs/agents-platform/tools/server-tools
3. https://elevenlabs.io/docs/agents-platform/tools/system-tools
4. https://elevenlabs.io/docs/agents-platform/tools/mcp

## 4. Personalization And Dynamic Variables

Decision:

1. Enforce reserved dynamic-variable prefixes (`system__`, `agent__`).
2. Allow only known variables and prohibit fabrication of missing values.

Sources:

1. https://elevenlabs.io/docs/agents-platform/personalization
2. https://elevenlabs.io/docs/agents-platform/personalization/dynamic-variables

## 5. Security And Access

Decision:

1. Treat production HVAC agents as private-agent capable.
2. Require signed URL support for protected widget/deployment patterns.

Sources:

1. https://elevenlabs.io/docs/agents-platform/authentication
2. https://elevenlabs.io/docs/agents-platform/widget

## 6. Testing, Evaluation, And Rollout

Decision:

1. Require baseline + daily regression checks.
2. Keep admin approval for scenario generation and prompt/workflow updates.
3. Use branch/version-aware rollout and rollback strategy.

Sources:

1. https://elevenlabs.io/docs/agents-platform/testing
2. https://elevenlabs.io/docs/agents-platform/versioning
