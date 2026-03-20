# Advanced One-Shot Workflow

Use this reference when the task is no longer just "run the current embedded CLI" and instead involves the target standalone system.

## Modes

### `embedded`

Current transitional mode inside the main `revcenter` repo.

Characteristics:

1. CLI imports backend modules directly.
2. It depends on the monolith env and database.
3. It is acceptable only as a bridge while the standalone system is being built.

### `api`

Target mode for the separate `revcenter-cli` product.

Characteristics:

1. CLI talks only to the standalone API.
2. API and worker own DB access and provider orchestration.
3. This is the default target for new architecture work.

## Preferred Flow In API Mode

1. Start from a wizard-safe request JSON.
2. Call `render` first to validate the payload and preview:
   - normalized intent profile
   - resolved profile/version
   - selected voice
   - greeting mode
3. Submit the request.
4. Poll job status until terminal state.
5. Return the request path, job ID, agent ID, provider external ID, final status, and any failed step.

## Handoff Source Of Truth

For the standalone split, use:

- [standalone-wizard-api-handoff.md](../../../specs/standalone-wizard-api-handoff.md)

## Rules

1. Treat direct DB access from the CLI as legacy embedded behavior, not target architecture.
2. Keep the payload within the wizard surface. Do not inject raw prompt or provider internals.
3. Default demos to test-safe behavior first.
4. Do not claim API mode exists if it has not been implemented yet; describe it as target-state work.

