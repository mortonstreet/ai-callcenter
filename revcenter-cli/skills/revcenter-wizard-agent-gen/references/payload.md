# Payload Contract

Use the template at `../../templates/wizard-agent-request.template.json` and keep the payload focused on the wizard inputs:

```json
{
  "name": "Acme Home Services",
  "domain": "acmehomeservices.com",
  "industry": "hvac",
  "useCase": "inbound_lead_capture",
  "services": ["AC repair", "Heating maintenance"],
  "discoveryQuestions": [
    "What service do you need help with today?",
    "What is the service address?",
    "What is the best callback number?"
  ],
  "mainObjective": "Capture qualified inbound calls and book service appointments.",
  "knowledgeSources": ["https://www.acmehomeservices.com"],
  "voiceSelection": {
    "voiceId": "cgSgspJ2msm6clMCkdW9"
  },
  "greeting": {
    "mode": "generated"
  },
  "routing": {
    "transferNumber": "+14155550199",
    "businessTimezone": "America/Los_Angeles",
    "languages": ["en"]
  },
  "agentName": "Acme Service Desk"
}
```

## Required

- `name`
- `industry`
- `services`
- `agentName` or `agent.name`

## Supported Aliases

- `mainObjective` or `mainGoal`
- `agentName` or `agent.name`
- `discoveryQuestions` or `agent.serviceQuestions`
- `voiceSelection.voiceId` or `voiceId`
- `greeting.customText`, `customGreeting`, or `firstMessage`

## Forbidden

Do not include raw provider internals. The CLI rejects payloads that contain fields like:

- `systemPrompt`
- `llm`
- `temperature`
- `maxTokens`
- `workflow`
- `analysis`
- `tools`
- `security`
- `advanced`
- `knowledgeBase`
