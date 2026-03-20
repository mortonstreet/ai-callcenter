# RevCenter Wizard Agent Gen

Use this skill when the user wants a one-shot RevCenter wizard flow turned into an ElevenLabs agent from the CLI for demos, testing, or repeatable provisioning.

Default assumption:

1. Current embedded mode exists today inside this repo.
2. The target architecture is a separate API-first `revcenter-cli` system with its own DB and worker.
3. For new architecture or extraction work, prefer the standalone target described in `../../specs/standalone-wizard-api-handoff.md`.

## Quick Start

1. Decide which mode applies:
   - `embedded`: current repo-local bridge
   - `api`: target standalone architecture
2. For `embedded`, confirm the repo root backend environment is available.
3. Create or update a request file under `revcenter-cli/requests/` using the template at `../../templates/wizard-agent-request.template.json`.
4. Keep the payload limited to wizard-safe business inputs. Do not add raw prompt, tool policy, workflow, analysis, security, or advanced provider fields.
5. Run the current embedded one-shot command:

```bash
pnpm --filter revcenter-cli run wizard:one-shot \
  --input revcenter-cli/requests/<slug>.json \
  --requester-email <user-email> \
  --wait \
  --require-provider
```

6. If the user only wants a local fallback or a dry demo without a required ElevenLabs result, rerun with `--no-require-provider`.
7. If the task is about the standalone split or API-mode workflow, read `references/advanced-one-shot.md` and `../../specs/standalone-wizard-api-handoff.md`.
8. If the job is still running or needs inspection, use the status command from `references/commands.md`.

## Workflow

- Translate the user's one-shot brief into a JSON payload that matches the wizard surface.
- Save the payload under `revcenter-cli/requests/`.
- In embedded mode, submit with `wizard:one-shot`.
- In standalone API work, prefer a `render -> submit -> poll -> summarize` flow.
- Report back the org ID, agent ID, provisioning job ID, provider external ID, and any failed step if the run does not complete cleanly.

## References

- Commands: [references/commands.md](references/commands.md)
- Payload contract: [references/payload.md](references/payload.md)
- Advanced flow: [references/advanced-one-shot.md](references/advanced-one-shot.md)
