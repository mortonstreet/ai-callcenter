#!/usr/bin/env node

import { REVCENTER_CLI_BANNER } from './banner'
import { loadRevcenterCliEnv } from './env'
import { startLocalWizardApiServer } from './local-api'

loadRevcenterCliEnv()

void startLocalWizardApiServer()
  .then(({ config, statePath }) => {
    process.stdout.write(`${REVCENTER_CLI_BANNER}\n\n`)
    process.stdout.write(
      [
        `RevCenter CLI local API listening on http://127.0.0.1:${config.port}`,
        `State file: ${statePath}`,
        config.apiKey
          ? 'Auth: Bearer token required via REVCENTER_API_KEY'
          : 'Auth: disabled',
      ].join('\n') + '\n',
    )
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(1)
  })
