# revcenter-cli

CLI wrappers and repo-local skill assets for RevCenter wizard agent generation.

## Commands

Launch the guided CLI wizard:

```bash
pnpm --filter revcenter-cli run wizard
```

The guided flow writes a run folder under `runs/<timestamp>-<slug>/` with:

- `wizard-request.json`
- `render-preview.json`
- `submission.json`
- `final-status.json`

Start the UI-equivalent backend flow first:

```bash
cd /Users/mortonstreet/revcenter
pnpm revcenter:dev
```

Then in another terminal launch the CLI:

```bash
cd /Users/mortonstreet/revcenter
pnpm --filter revcenter-cli run wizard
```

If you want the file-driven commands directly, they still exist.

Print a starter payload:

```bash
pnpm --filter revcenter-cli run wizard:template
```

Write the starter payload to a file:

```bash
pnpm --filter revcenter-cli run wizard:template --output requests/acme.json
```

Submit a one-shot provisioning request and wait for the terminal result:

```bash
pnpm --filter revcenter-cli run wizard:one-shot \
  --input requests/acme.json \
  --requester-email you@example.com \
  --wait \
  --require-provider
```

Load provisioning status later:

```bash
pnpm --filter revcenter-cli run wizard:status --job-id <job-id>
```

Preview the normalized request and standalone API render contract:

```bash
pnpm --filter revcenter-cli run wizard:render \
  --input requests/acme.json
```

Submit without waiting:

```bash
pnpm --filter revcenter-cli run wizard:submit \
  --input requests/acme.json
```

Start the local standalone API test server:

```bash
pnpm --filter revcenter-cli run wizard:start
```

Then exercise API mode against localhost:

```bash
REVCENTER_CLI_MODE=api \
REVCENTER_API_BASE_URL=http://127.0.0.1:4010 \
pnpm --filter revcenter-cli run wizard:one-shot \
  --input requests/acme.json \
  --wait \
  --no-require-provider
```

## Notes

- `embedded` mode is still the current default. It reuses the backend provisioning flow in `backend/src/services/provisioning-orchestrator.service.ts`.
- `pnpm --filter revcenter-cli run wizard` is now the single interactive CLI entrypoint. It prompts for the same wizard-safe business inputs, renders a preview, confirms submission, and streams provisioning progress.
- `api` mode is now scaffolded behind shared request/response schemas and a standalone HTTP contract for `render`, `submit`, and `status`.
- `pnpm --filter revcenter-cli run wizard:start` starts a local file-backed API server for testing `api` mode on `http://127.0.0.1:4010`.
- `revcenter-cli/.env.example` documents the minimal local env for API-mode testing. No monolith `.env` files are copied into this package.
- Enable `api` mode with `REVCENTER_CLI_MODE=api` or `--mode api`, then point it at `REVCENTER_API_BASE_URL` or `--api-base-url`.
- Embedded mode still requires running from a workspace with the normal backend environment available at the repo root, because it bootstraps the backend config and database layer.
- Repo-local skill docs live in `revcenter-cli/skills/revcenter-wizard-agent-gen`.
- The target standalone split is defined in `revcenter-cli/specs/standalone-wizard-api-handoff.md`. That target is separate from the current embedded implementation.
