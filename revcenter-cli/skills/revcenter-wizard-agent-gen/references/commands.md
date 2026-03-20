# Commands

## Launch The Guided CLI

```bash
pnpm --filter revcenter-cli run wizard
```

This is the single interactive entrypoint. It prompts for wizard inputs, saves a run folder under
`runs/<timestamp>-<slug>/`, renders a preview, asks for submit confirmation, and streams
provisioning progress.

## Generate A Template

```bash
pnpm --filter revcenter-cli run wizard:template
```

Write it to a file:

```bash
pnpm --filter revcenter-cli run wizard:template --output requests/<slug>.json
```

## Submit A One-Shot Wizard Request

```bash
pnpm --filter revcenter-cli run wizard:one-shot \
  --input requests/<slug>.json \
  --requester-email <user-email> \
  --wait \
  --require-provider
```

Useful flags:

- `--requester-id <id>` if you want to avoid email lookup.
- `--idempotency-key <key>` for controlled reruns.
- `--no-wait` to submit and return immediately.
- `--timeout-ms <ms>` and `--poll-ms <ms>` to tune waiting behavior.
- `--json` for machine-readable output.
- `--no-require-provider` to allow a local fallback agent.

## Render A Preview

```bash
pnpm --filter revcenter-cli run wizard:render \
  --input requests/<slug>.json
```

Useful flags:

- `--mode api` to call the standalone API contract instead of embedded preview mode.
- `--api-base-url <url>` and `--api-key <key>` for standalone API mode.
- `--json` for machine-readable output.

Start the local standalone API test server:

```bash
pnpm --filter revcenter-cli run wizard:start
```

## Submit Without Waiting

```bash
pnpm --filter revcenter-cli run wizard:submit \
  --input requests/<slug>.json
```

Useful flags:

- `--mode api` to submit through the standalone API contract.
- `--requester-email <email>` or `--requester-id <id>` for embedded mode attribution.
- `--idempotency-key <key>` and `--correlation-id <id>` for deterministic replays.
- `--json` for machine-readable output.

## One-Shot Against Local API

```bash
REVCENTER_CLI_MODE=api \
REVCENTER_API_BASE_URL=http://127.0.0.1:4010 \
pnpm --filter revcenter-cli run wizard:one-shot \
  --input requests/<slug>.json \
  --wait \
  --no-require-provider
```

## Check Status

By job ID:

```bash
pnpm --filter revcenter-cli run wizard:status --job-id <job-id>
```

By agent ID:

```bash
pnpm --filter revcenter-cli run wizard:status --agent-id <agent-id>
```
