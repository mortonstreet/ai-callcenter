#!/usr/bin/env node

import * as readline from 'node:readline/promises'
import fs from 'fs/promises'
import path from 'path'
import { REVCENTER_CLI_BANNER, shouldPrintCliBanner } from './banner'
import { loadRevcenterCliEnv } from './env'
import type { WizardRenderResponse, WizardStatusResponse } from './contracts'
import {
  buildGuidedRunDirectory,
  buildGuidedWizardPayload,
  defaultAgentNameFromIndustry,
  mergePromptValues,
  splitPromptList,
} from './guided'
import {
  REVCENTER_WIZARD_DISCOVERY_PRESETS,
  REVCENTER_WIZARD_INDUSTRY_OPTIONS,
  REVCENTER_WIZARD_SERVICE_PRESETS,
  REVCENTER_WIZARD_USE_CASE_OPTIONS,
  formatWizardOptionList,
  type RevcenterWizardOption,
} from './revcenter-wizard'
import {
  createWizardRequestTemplate,
  parseWizardCliRequest,
} from './requests'
import {
  createWizardService,
  evaluateProvisioningOutcome,
  waitForWizardTerminalStatus,
} from './service'
import { resolveRequester } from './runtime'

const yargs = require('yargs/yargs').default
const { hideBin } = require('yargs/helpers')
const invocationCwd = process.cwd()
const DEFAULT_TIMEOUT_MS = 180_000
const DEFAULT_POLL_MS = 2_000
const DEFAULT_OUTPUT_DIR = 'runs'
const DETAIL_LABEL_WIDTH = 22
const SECTION_DIVIDER = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

const DEFAULT_MAIN_OBJECTIVE_BY_USE_CASE: Record<string, string> = {
  customer_support:
    'Resolve inbound service calls, capture caller context, and book qualified jobs.',
  outbound_sales:
    'Qualify outbound prospects and convert them into booked sales conversations.',
  scheduling:
    'Book and adjust appointments accurately without unnecessary handoff.',
  lead_qualification:
    'Qualify inbound leads, capture urgency, and route the right opportunities quickly.',
  answering_service:
    'Handle after-hours calls, capture messages, and escalate urgent issues.',
}

const PROVISIONING_STEP_LABELS: Record<string, string> = {
  validate_request: 'Validate request and policy',
  normalize_request: 'Normalize wizard input',
  resolve_profile: 'Resolve prompt profile',
  compile_prompt_and_greeting: 'Compile prompt and greeting',
  persist_versions_and_finalize: 'Finalize agent record',
  compile_intent_profile: 'Build wizard intent profile',
  compile_prompt: 'Compile prompt and greeting',
  create_or_update_agent: 'Create or sync provider agent',
  apply_core_tabs_profile: 'Apply core tab profile',
  ingest_knowledge_sources: 'Ingest knowledge sources',
  attach_webhooks_and_mcp: 'Attach webhooks and MCP integrations',
  register_and_run_smoke_tests: 'Run readiness and smoke checks',
  persist_versions_and_sync: 'Finalize activation state',
}

let renderedSectionCount = 0

loadRevcenterCliEnv()

const resolveFromInvocationCwd = (targetPath: string) =>
  path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(invocationCwd, targetPath)

const readJsonFile = async (targetPath: string): Promise<unknown> => {
  const absolutePath = resolveFromInvocationCwd(targetPath)
  const source = await fs.readFile(absolutePath, 'utf8')

  try {
    return JSON.parse(source)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new Error(`Failed to parse JSON from ${absolutePath}: ${message}`)
  }
}

const writeJsonFile = async (targetPath: string, payload: unknown) => {
  const absolutePath = resolveFromInvocationCwd(targetPath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(`${absolutePath}`, `${JSON.stringify(payload, null, 2)}\n`)
  return absolutePath
}

const printJson = (value: unknown) => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

const formatMaybe = (value: unknown, fallback = 'n/a') => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  return String(value)
}

const formatDetailLine = (label: string, value: unknown) =>
  `${label.padEnd(DETAIL_LABEL_WIDTH)} ${formatMaybe(value)}`

const formatIndexedToken = (index: number) =>
  `[${String(index + 1).padStart(2, '0')}]`

const formatProvisioningStepName = (stepId: string) =>
  PROVISIONING_STEP_LABELS[stepId] || stepId.replace(/_/g, ' ')

const formatProvisioningStateToken = (status: string) => {
  switch (status) {
    case 'completed':
      return '[done]'
    case 'running':
    case 'in_progress':
      return '[work]'
    case 'queued':
    case 'pending':
      return '[todo]'
    case 'retrying':
      return '[redo]'
    case 'failed':
      return '[fail]'
    case 'blocked_manual':
      return '[hold]'
    case 'skipped':
      return '[skip]'
    default:
      return `[${status}]`
  }
}

const renderIndexedValues = (
  values: string[],
  options?: {
    emptyLabel?: string
    tag?: string
  },
) => {
  if (values.length === 0) {
    return `  [--] ${options?.emptyLabel || 'none'}`
  }

  return values
    .map((value, index) => {
      const suffix = options?.tag ? ` [${options.tag}]` : ''
      return `  ${formatIndexedToken(index)} ${value}${suffix}`
    })
    .join('\n')
}

const renderValuePanel = (
  title: string,
  values: string[],
  options?: {
    emptyLabel?: string
    tag?: string
  },
) => [title, SECTION_DIVIDER, renderIndexedValues(values, options)].join('\n')

const normalizeCliArgs = (argv: string[]) =>
  argv[0] === 'wizard' ? argv.slice(1) : argv

const buildDefaultIdempotencyKey = (organizationName: string) => {
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `revcenter-cli:${slug}:${Date.now()}`
}

const findFailedStep = (status: WizardStatusResponse) =>
  status.steps.find((step) => step.status === 'failed') || null

const findActiveStep = (status: WizardStatusResponse) =>
  status.steps.find(
    (step) =>
      step.status === 'running' ||
      step.status === 'in_progress' ||
      step.status === 'retrying',
  ) || null

const renderStatus = (status: WizardStatusResponse) => {
  const failedStep = findFailedStep(status)
  const activeStep = findActiveStep(status)
  const lines = [
    formatDetailLine(
      'Job',
      `${status.jobId} ${formatProvisioningStateToken(status.status)}`,
    ),
    formatDetailLine(
      'Organization',
      `${formatMaybe(status.organization.name)} (${formatMaybe(status.organization.id)})`,
    ),
    formatDetailLine(
      'Agent',
      `${formatMaybe(status.agent.name)} (${status.agent.agentId})`,
    ),
    formatDetailLine(
      'Provider',
      `${formatMaybe(status.agent.provider)} externalId=${formatMaybe(status.agent.providerExternalId)}`,
    ),
    formatDetailLine('Readiness', status.agent.readinessStatus),
    formatDetailLine(
      'Current Step',
      activeStep ? formatProvisioningStepName(activeStep.stepId) : 'n/a',
    ),
    formatDetailLine('Correlation', status.correlationId),
    formatDetailLine('Last Error', status.lastErrorMessage),
    formatDetailLine(
      'Failed Step',
      failedStep ? formatProvisioningStepName(failedStep.stepId) : 'n/a',
    ),
    'Pipeline',
    SECTION_DIVIDER,
  ]

  const stepLines = status.steps.map((step) => {
    const stepOrder = formatIndexedToken(step.stepOrder - 1)
    const lastError = step.lastErrorCode
      ? ` error=${formatMaybe(step.lastErrorCode)}`
      : ''
    return `  ${stepOrder} ${formatProvisioningStateToken(step.status)} ${formatProvisioningStepName(step.stepId)} [${step.stepId}] attempts=${step.attempts}${lastError}`
  })

  return [...lines, ...stepLines].join('\n')
}

const renderPreview = (preview: WizardRenderResponse) => {
  const discoveryQuestions =
    preview.normalizedRequest.discoveryQuestions?.length || 0
  const lines = [
    formatDetailLine('Agent', preview.summary.agentName),
    formatDetailLine('Industry', preview.summary.industry),
    formatDetailLine('Use Case', preview.summary.useCase),
    formatDetailLine(
      'Main Objective',
      preview.normalizedRequest.mainObjective || 'n/a',
    ),
    formatDetailLine('Services', preview.summary.serviceCount),
    formatDetailLine('Discovery Qs', discoveryQuestions),
    formatDetailLine('Knowledge Srcs', preview.summary.knowledgeSourceCount),
    formatDetailLine('Voice', preview.resolvedProfile.selectedVoiceId),
    formatDetailLine('Greeting', preview.resolvedProfile.greetingMode),
    formatDetailLine(
      'Profile',
      `${formatMaybe(preview.resolvedProfile.profileKey)} version=${formatMaybe(
        preview.resolvedProfile.profileVersion,
      )}`,
    ),
    formatDetailLine(
      'Prompt Preview',
      preview.promptPreview.compiledPromptSummary,
    ),
  ]

  if (preview.warnings.length > 0) {
    lines.push(formatDetailLine('Warnings', preview.warnings.join('; ')))
  }

  return lines.join('\n')
}

const renderReview = (input: {
  runDir: string
  requestPath: string
  preview: WizardRenderResponse
  requester?: Awaited<ReturnType<typeof resolveRequester>>
  idempotencyKey: string
  correlationId: string
}) => {
  const request = input.preview.normalizedRequest
  const routing = request.routing || {}
  const sections = [
    [
      formatDetailLine('Artifacts', input.runDir),
      formatDetailLine('Request File', input.requestPath),
      formatDetailLine('Idempotency', input.idempotencyKey),
      formatDetailLine('Correlation', input.correlationId),
      ...(input.requester
        ? [
            formatDetailLine(
              'Requester',
              formatMaybe(input.requester.email, input.requester.id),
            ),
            formatDetailLine(
              'Active Org',
              `${formatMaybe(input.requester.organizationName)} (${input.requester.organizationId})`,
            ),
          ]
        : []),
      renderPreview(input.preview),
    ].join('\n'),
    renderValuePanel('Selected Services', request.services, {
      tag: 'selected',
    }),
    renderValuePanel(
      'Discovery Questions',
      request.discoveryQuestions || [],
      {
        emptyLabel: 'none selected',
        tag: 'selected',
      },
    ),
    renderValuePanel(
      'Knowledge Sources',
      request.knowledgeSources || [],
      {
        emptyLabel: 'none attached',
      },
    ),
    [
      'Routing',
      SECTION_DIVIDER,
      formatDetailLine('Transfer', routing.transferNumber),
      formatDetailLine('Timezone', routing.businessTimezone),
      formatDetailLine(
        'Languages',
        Array.isArray(routing.languages) ? routing.languages.join(', ') : 'n/a',
      ),
    ].join('\n'),
  ]

  return sections.join('\n\n')
}

const renderSection = (title: string, description?: string) => {
  const lines = [title, SECTION_DIVIDER]

  if (description) {
    lines.push(description)
  }

  if (renderedSectionCount > 0) {
    process.stdout.write('\n')
  }
  renderedSectionCount += 1
  process.stdout.write(`${lines.join('\n')}\n`)
}

const ensureInteractiveTty = () => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      'Guided wizard mode requires an interactive TTY. Use `template`, `render`, `submit`, or `one-shot` in non-interactive environments.',
    )
  }
}

const promptText = async (
  rl: readline.Interface,
  label: string,
  options?: {
    defaultValue?: string
    required?: boolean
  },
) => {
  const defaultValue = options?.defaultValue?.trim()
  const promptLabel = defaultValue ? `${label} [${defaultValue}]` : label

  while (true) {
    const value = (await rl.question(`${promptLabel}: `)).trim()
    if (value) {
      return value
    }
    if (defaultValue) {
      return defaultValue
    }
    if (!options?.required) {
      return ''
    }
    process.stdout.write('Value required.\n')
  }
}

const promptList = async (
  rl: readline.Interface,
  label: string,
  options?: {
    defaultValues?: string[]
    required?: boolean
  },
) => {
  const renderedDefault = (options?.defaultValues || []).join(', ')
  const value = await promptText(rl, label, {
    defaultValue: renderedDefault || undefined,
    required: options?.required,
  })

  const values = splitPromptList(value)
  if (values.length > 0) {
    return values
  }

  if (options?.required) {
    process.stdout.write('At least one value is required.\n')
    return await promptList(rl, label, options)
  }

  return []
}

const promptBool = async (
  rl: readline.Interface,
  label: string,
  defaultValue: boolean,
) => {
  const hint = defaultValue ? 'Y/n' : 'y/N'

  while (true) {
    const value = (await rl.question(`${label} [${hint}]: `)).trim().toLowerCase()
    if (!value) {
      return defaultValue
    }
    if (value === 'y' || value === 'yes') {
      return true
    }
    if (value === 'n' || value === 'no') {
      return false
    }
    process.stdout.write('Enter y or n.\n')
  }
}

const promptChoice = async (
  rl: readline.Interface,
  label: string,
  options: string[],
  defaultValue: string,
) => {
  const renderedOptions = options.join('/')

  while (true) {
    const value = (
      await rl.question(`${label} [${renderedOptions}] default=${defaultValue}: `)
    ).trim()
    if (!value) {
      return defaultValue
    }

    const matched = options.find(
      (option) => option.toLowerCase() === value.toLowerCase(),
    )
    if (matched) {
      return matched
    }

    process.stdout.write(`Enter one of [${options.join('/')}].\n`)
  }
}

const promptOptionSelection = async (
  rl: readline.Interface,
  label: string,
  options: RevcenterWizardOption[],
  defaultValue?: string,
) => {
  process.stdout.write(`${formatWizardOptionList(options)}\n`)

  const defaultToken = defaultValue
    ? String(options.findIndex((option) => option.value === defaultValue) + 1)
    : undefined

  while (true) {
    const raw = await promptText(rl, label, {
      defaultValue: defaultToken,
      required: true,
    })

    const numericIndex = Number(raw)
    if (
      Number.isInteger(numericIndex) &&
      numericIndex >= 1 &&
      numericIndex <= options.length
    ) {
      return options[numericIndex - 1]
    }

    const matched = options.find(
      (option) =>
        option.value.toLowerCase() === raw.toLowerCase() ||
        option.label.toLowerCase() === raw.toLowerCase(),
    )
    if (matched) {
      return matched
    }

    process.stdout.write(
      `Enter a bracketed index, label, or value like ${options
        .map((option, index) => `${formatIndexedToken(index)}/${option.value}`)
        .join(', ')}.\n`,
    )
  }
}

const buildStatusSignature = (status: WizardStatusResponse) =>
  JSON.stringify({
    status: status.status,
    lastErrorCode: status.lastErrorCode,
    lastErrorMessage: status.lastErrorMessage,
    agentProvider: status.agent.provider,
    readinessStatus: status.agent.readinessStatus,
    steps: status.steps.map((step) => ({
      stepId: step.stepId,
      status: step.status,
      attempts: step.attempts,
      lastErrorCode: step.lastErrorCode,
    })),
  })

const writeArtifact = async (targetPath: string, payload: unknown) => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`)
}

const withConnectionOptions = (builder: any) =>
  builder
    .option('mode', {
      type: 'string',
      choices: ['embedded', 'api'],
      description:
        'CLI runtime mode. Defaults to REVCENTER_CLI_MODE or embedded.',
    })
    .option('api-base-url', {
      type: 'string',
      description:
        'Standalone API base URL. Used only in api mode; falls back to REVCENTER_API_BASE_URL.',
    })
    .option('api-key', {
      type: 'string',
      description:
        'Standalone API key. Used only in api mode; falls back to REVCENTER_API_KEY.',
    })

const withInputOption = (builder: any) =>
  builder.option('input', {
    type: 'string',
    demandOption: true,
    description: 'Path to the wizard request JSON file.',
  })

const withRequesterOptions = (builder: any) =>
  builder
    .option('requester-email', {
      type: 'string',
      description: 'Email of the user to attribute the provisioning request to.',
    })
    .option('requester-id', {
      type: 'string',
      description: 'User ID to attribute the provisioning request to.',
    })
    .option('organization-id', {
      type: 'string',
      description:
        'Organization ID to scope embedded-mode provisioning. Defaults to the requester active organization.',
    })

const withJsonOption = (builder: any) =>
  builder.option('json', {
    type: 'boolean',
    default: false,
    description: 'Emit JSON instead of human-readable output.',
  })

const createServiceFromArgv = (argv: any) =>
  createWizardService({
    mode: argv.mode,
    apiBaseUrl: argv.apiBaseUrl,
    apiKey: argv.apiKey,
  })

const cliArgs = normalizeCliArgs(hideBin(process.argv))

if (shouldPrintCliBanner(cliArgs, Boolean(process.stdout.isTTY))) {
  process.stdout.write(`${REVCENTER_CLI_BANNER}\n\n`)
}

void yargs(cliArgs)
  .scriptName('revcenter-cli wizard')
  .strict()
  .command(
    ['guided', '$0'],
    'Launch the interactive RevCenter wizard.',
    (builder: any) =>
      withRequesterOptions(
        withConnectionOptions(
          builder
            .option('wait', {
              type: 'boolean',
              default: true,
              description:
                'Poll until the provisioning job reaches a terminal state.',
            })
            .option('timeout-ms', {
              type: 'number',
              default: DEFAULT_TIMEOUT_MS,
              description: 'Max time to wait for terminal state.',
            })
            .option('poll-ms', {
              type: 'number',
              default: DEFAULT_POLL_MS,
              description: 'Polling interval while waiting.',
            })
            .option('idempotency-key', {
              type: 'string',
              description:
                'Optional idempotency key for replays or deterministic reruns.',
            })
            .option('correlation-id', {
              type: 'string',
              description: 'Optional correlation ID for tracing.',
            })
            .option('test-mode', {
              type: 'boolean',
              default: true,
              description: 'Use test-safe defaults unless explicitly disabled.',
            })
            .option('require-provider', {
              type: 'boolean',
              default: true,
              description:
                'Fail if the resulting agent is not provider-backed by ElevenLabs.',
            })
            .option('output-dir', {
              type: 'string',
              default: DEFAULT_OUTPUT_DIR,
              description:
                'Directory where guided run artifacts will be written.',
            })
            .option('yes', {
              type: 'boolean',
              default: false,
              description: 'Skip the submit confirmation step.',
            }),
        ),
      ),
    async (argv: any) => {
      ensureInteractiveTty()
      renderedSectionCount = 0

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      try {
        const service = createServiceFromArgv(argv)
        const template = createWizardRequestTemplate()
        const outputRoot = resolveFromInvocationCwd(argv.outputDir)
        const resolvedTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          template.routing.businessTimezone ||
          'America/Los_Angeles'
        let requester = undefined as Awaited<ReturnType<typeof resolveRequester>> | undefined

        if (service.mode === 'embedded') {
          try {
            requester = await resolveRequester({
              requesterId: argv.requesterId,
              requesterEmail: argv.requesterEmail,
              organizationId: argv.organizationId,
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            if (!argv.requesterId && !argv.requesterEmail && message.includes('Multiple users exist')) {
              renderSection(
                'REQUESTER',
                'Multiple users were found. Enter the requester email to match the UI session context.',
              )
              const requesterEmail = await promptText(rl, 'Requester email', {
                required: true,
              })
              requester = await resolveRequester({
                requesterEmail,
                organizationId: argv.organizationId,
              })
            } else {
              throw error
            }
          }
        }

        renderSection(
          'WIZARD SETUP',
          [
            formatDetailLine('Mode', service.mode),
            formatDetailLine('Artifacts Root', outputRoot),
            ...(requester
              ? [
                  formatDetailLine(
                    'Requester',
                    formatMaybe(requester.email, requester.id),
                  ),
                  formatDetailLine(
                    'Active Org',
                    `${formatMaybe(requester.organizationName)} (${requester.organizationId})`,
                  ),
                ]
              : []),
            formatDetailLine(
              'Flow',
              'industry -> use case -> details -> review -> submit',
            ),
            'Press Enter to accept a shown default. Use bracketed indexes where shown.',
          ].join('\n'),
        )

        renderSection(
          'STEP 01 · INDUSTRY',
          'Choose the same industry option used by the RevCenter create-agent wizard.',
        )
        const industryOption = await promptOptionSelection(
          rl,
          'Industry',
          REVCENTER_WIZARD_INDUSTRY_OPTIONS,
        )
        const industry = industryOption.value

        renderSection(
          'STEP 02 · USE CASE',
          'Choose the real RevCenter use-case preset. This mirrors the UI call-flow emphasis.',
        )
        const useCaseOption = await promptOptionSelection(
          rl,
          'Use case',
          REVCENTER_WIZARD_USE_CASE_OPTIONS,
        )
        const useCase = useCaseOption.value

        const suggestedServices = REVCENTER_WIZARD_SERVICE_PRESETS[industry] || template.services
        const suggestedDiscoveryQuestions =
          REVCENTER_WIZARD_DISCOVERY_PRESETS[industry] || []

        renderSection(
          'STEP 03 · DETAILS',
          [
            formatDetailLine('Industry', `${industryOption.label} [${industry}]`),
            formatDetailLine('Use Case', `${useCaseOption.label} [${useCase}]`),
            formatDetailLine(
              'Preset Services',
              `${suggestedServices.length} recommended`,
            ),
            formatDetailLine(
              'Preset Discovery',
              `${suggestedDiscoveryQuestions.length} suggested`,
            ),
          ].join('\n'),
        )
        const agentName = await promptText(rl, 'Agent name', {
          defaultValue: defaultAgentNameFromIndustry(industryOption.label),
          required: true,
        })
        const mainObjective = await promptText(rl, 'Main objective', {
          defaultValue: DEFAULT_MAIN_OBJECTIVE_BY_USE_CASE[useCase],
          required: true,
        })

        renderSection(
          'SERVICE PROFILE',
          [
            'Recommended services',
            SECTION_DIVIDER,
            renderIndexedValues(suggestedServices, {
              tag: 'recommended',
            }),
            '',
            'Edit the list directly to match how the UI lets you toggle services.',
          ].join('\n'),
        )
        const services = await promptList(rl, 'Services (comma separated)', {
          defaultValues: suggestedServices,
          required: true,
        })

        let discoveryQuestions: string[] = []
        if (suggestedDiscoveryQuestions.length > 0) {
          renderSection(
            'DISCOVERY PROFILE',
            [
              'Suggested discovery prompts',
              SECTION_DIVIDER,
              renderIndexedValues(suggestedDiscoveryQuestions, {
                tag: 'suggested',
              }),
            ].join('\n'),
          )
          const startWithSuggested = await promptBool(
            rl,
            'Start with recommended discovery prompts',
            false,
          )
          const additionalDiscoveryQuestions = await promptList(
            rl,
            'Additional discovery questions (comma separated, blank = none)',
          )
          discoveryQuestions = mergePromptValues(
            startWithSuggested ? suggestedDiscoveryQuestions : [],
            additionalDiscoveryQuestions,
          )
        } else {
          discoveryQuestions = await promptList(
            rl,
            'Discovery questions (comma separated, blank = none)',
          )
        }
        let knowledgeSources: string[] = []
        if (requester?.isAdmin === true) {
          renderSection(
            'KNOWLEDGE SOURCES',
            'Add URLs or internal doc references to seed the agent. Leave blank to skip.',
          )
          knowledgeSources = await promptList(
            rl,
            'Knowledge sources (comma separated, admin only)',
          )
        }
        const greetingMode = (await promptChoice(
          rl,
          'Greeting mode',
          ['generated', 'custom'],
          template.greeting.mode,
        )) as 'generated' | 'custom'
        const customGreeting =
          greetingMode === 'custom'
            ? await promptText(rl, 'Custom greeting', {
                defaultValue: `Thanks for calling ${formatMaybe(requester?.organizationName, agentName)}. How can I help today?`,
                required: true,
              })
            : ''

        renderSection(
          'VOICE AND ROUTING',
          'These map to the same voice and routing fields exposed in the UI.',
        )
        const voiceId = await promptText(rl, 'Voice ID', {
        })
        const transferNumber = await promptText(rl, 'Transfer number')
        const businessTimezone = await promptText(rl, 'Business timezone', {
          defaultValue: resolvedTimezone,
        })
        const languages = await promptList(rl, 'Languages (comma separated)', {
          defaultValues: template.routing.languages,
        })

        const payload = buildGuidedWizardPayload({
          organizationName: requester?.organizationName || undefined,
          industry,
          useCase,
          services,
          discoveryQuestions,
          mainObjective,
          knowledgeSources,
          agentName,
          greetingMode,
          customGreeting,
          voiceId,
          transferNumber,
          businessTimezone,
          languages,
        })
        const parsed = parseWizardCliRequest(payload)
        const runDir = buildGuidedRunDirectory({
          name: agentName,
          outputRoot,
        })
        const requestPath = path.join(runDir, 'wizard-request.json')
        const renderPath = path.join(runDir, 'render-preview.json')
        const submissionPath = path.join(runDir, 'submission.json')
        const finalStatusPath = path.join(runDir, 'final-status.json')

        await writeArtifact(requestPath, payload)

        const preview = await service.render({
          parsed,
          testMode: Boolean(argv.testMode),
        })

        await writeArtifact(renderPath, {
          mode: service.mode,
          input: requestPath,
          render: preview,
        })

        const idempotencyKey =
          argv.idempotencyKey ||
          buildDefaultIdempotencyKey(parsed.summary.agentName)
        const correlationId =
          argv.correlationId ||
          `revcenter-cli:${requester?.organizationId || parsed.summary.organizationName}:${parsed.summary.agentName}`

        renderSection(
          'REQUEST REVIEW',
          'Validate the compiled request before provisioning starts.',
        )
        process.stdout.write(
          `${renderReview({
            runDir,
            requestPath,
            preview,
            requester,
            idempotencyKey,
            correlationId,
          })}\n`,
        )

        const shouldSubmit = argv.yes
          ? true
          : await promptBool(rl, 'Submit provisioning request', true)

        if (!shouldSubmit) {
          process.stdout.write(`Saved request: ${requestPath}\n`)
          return
        }

        const submission = await service.submit({
          parsed,
          requester,
          idempotencyKey,
          correlationId,
          options: {
            testMode: Boolean(argv.testMode),
            requireProvider: Boolean(argv.requireProvider),
            waitForTerminal: false,
          },
        })

        await writeArtifact(submissionPath, {
          mode: service.mode,
          input: requestPath,
          requester,
          submission,
        })

        renderSection(
          'SUBMISSION ACCEPTED',
          formatDetailLine('Artifacts', runDir),
        )
        process.stdout.write(
          [
            formatDetailLine('Mode', service.mode),
            formatDetailLine('Job', `${submission.jobId} [${submission.status}]`),
            formatDetailLine(
              'Agent',
              `${parsed.summary.agentName} (${submission.agentId})`,
            ),
            formatDetailLine('Correlation', submission.correlationId),
            formatDetailLine(
              'Requester',
              requester ? formatMaybe(requester.email, requester.id) : 'api-key',
            ),
          ].join('\n') + '\n',
        )

        if (!argv.wait) {
          process.stdout.write(`Artifacts: ${runDir}\n`)
          return
        }

        renderSection('PROVISIONING')
        let lastStatusSignature = ''

        const waited = await waitForWizardTerminalStatus({
          service,
          jobId: submission.jobId,
          timeoutMs: Number(argv.timeoutMs),
          pollMs: Number(argv.pollMs),
          onStatus: async (status) => {
            const signature = buildStatusSignature(status)
            if (signature === lastStatusSignature) {
              return
            }

            lastStatusSignature = signature
            await writeArtifact(finalStatusPath, {
              mode: service.mode,
              input: requestPath,
              requester,
              render: preview,
              submission,
              final: status,
            })
            process.stdout.write(`${renderStatus(status)}\n\n`)
          },
        })

        await writeArtifact(finalStatusPath, {
          mode: service.mode,
          input: requestPath,
          requester,
          render: preview,
          submission,
          final: waited.status,
          timedOut: waited.timedOut,
        })

        if (waited.timedOut) {
          process.stdout.write(`Artifacts: ${runDir}\n`)
          throw new Error(
            `Timed out waiting for provisioning job ${submission.jobId} to reach a terminal state.`,
          )
        }

        evaluateProvisioningOutcome({
          status: waited.status,
          requireProvider: Boolean(argv.requireProvider),
        })

        process.stdout.write(`Artifacts: ${runDir}\n`)
      } finally {
        rl.close()
      }
    },
  )
  .command(
    'template',
    'Print or write a wizard request template.',
    (builder: any) =>
      builder
        .option('output', {
          type: 'string',
          description: 'Write the template JSON to a file.',
        })
        .option('force', {
          type: 'boolean',
          default: false,
          description: 'Overwrite the output file if it already exists.',
        }),
    async (argv: any) => {
      const template = createWizardRequestTemplate()

      if (!argv.output) {
        printJson(template)
        return
      }

      const outputPath = resolveFromInvocationCwd(argv.output)
      try {
        await fs.access(outputPath)
        if (!argv.force) {
          throw new Error(
            `Refusing to overwrite ${outputPath}. Pass --force to replace it.`,
          )
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error
        }
      }

      const writtenPath = await writeJsonFile(outputPath, template)
      process.stdout.write(`${writtenPath}\n`)
    },
  )
  .command(
    'render',
    'Validate and preview a wizard request.',
    (builder: any) =>
      withJsonOption(
        withConnectionOptions(
          withInputOption(
            builder.option('test-mode', {
              type: 'boolean',
              default: true,
              description: 'Use test-safe defaults for the render preview.',
            }),
          ),
        ),
      ),
    async (argv: any) => {
      const payload = await readJsonFile(argv.input)
      const parsed = parseWizardCliRequest(payload)
      const service = createServiceFromArgv(argv)
      const preview = await service.render({
        parsed,
        testMode: Boolean(argv.testMode),
      })

      if (argv.json) {
        printJson({
          mode: service.mode,
          input: resolveFromInvocationCwd(argv.input),
          render: preview,
        })
        return
      }

      process.stdout.write(
        [
          `Mode: ${service.mode}`,
          `Input: ${resolveFromInvocationCwd(argv.input)}`,
          renderPreview(preview),
        ].join('\n') + '\n',
      )
    },
  )
  .command(
    'submit',
    'Submit a wizard request without waiting for terminal state.',
    (builder: any) =>
      withJsonOption(
        withRequesterOptions(
          withConnectionOptions(
            withInputOption(
              builder
                .option('idempotency-key', {
                  type: 'string',
                  description:
                    'Optional idempotency key for replays or deterministic reruns.',
                })
                .option('correlation-id', {
                  type: 'string',
                  description: 'Optional correlation ID for tracing.',
                })
                .option('test-mode', {
                  type: 'boolean',
                  default: true,
                  description:
                    'Use test-safe defaults for the standalone API request.',
                })
                .option('require-provider', {
                  type: 'boolean',
                  default: true,
                  description:
                    'Fail later if the resulting agent is not provider-backed by ElevenLabs.',
                }),
            ),
          ),
        ),
      ),
    async (argv: any) => {
      const payload = await readJsonFile(argv.input)
      const parsed = parseWizardCliRequest(payload)
      const service = createServiceFromArgv(argv)
      const requester =
        service.mode === 'embedded'
          ? await resolveRequester({
              requesterId: argv.requesterId,
              requesterEmail: argv.requesterEmail,
              organizationId: argv.organizationId,
            })
          : undefined

      const idempotencyKey =
        argv.idempotencyKey ||
        buildDefaultIdempotencyKey(parsed.summary.agentName)
      const correlationId =
        argv.correlationId || `revcenter-cli:${parsed.summary.agentName}`

      const submission = await service.submit({
        parsed,
        requester,
        idempotencyKey,
        correlationId,
        options: {
          testMode: Boolean(argv.testMode),
          requireProvider: Boolean(argv.requireProvider),
          waitForTerminal: false,
        },
      })

      if (argv.json) {
        printJson({
          mode: service.mode,
          input: resolveFromInvocationCwd(argv.input),
          requester,
          submission,
        })
        return
      }

      process.stdout.write(
        [
          `Mode: ${service.mode}`,
          `Input: ${resolveFromInvocationCwd(argv.input)}`,
          `Submitted job ${submission.jobId} [${submission.status}]`,
          `Organization: ${parsed.summary.organizationName}`,
          `Agent: ${parsed.summary.agentName} (${submission.agentId})`,
          `Correlation: ${submission.correlationId}`,
          `Requester: ${requester ? formatMaybe(requester.email, requester.id) : 'api-key'}`,
        ].join('\n') + '\n',
      )
    },
  )
  .command(
    'one-shot',
    'Render, submit, and optionally wait for terminal provisioning.',
    (builder: any) =>
      withJsonOption(
        withRequesterOptions(
          withConnectionOptions(
            withInputOption(
              builder
                .option('idempotency-key', {
                  type: 'string',
                  description:
                    'Optional idempotency key for replays or deterministic reruns.',
                })
                .option('correlation-id', {
                  type: 'string',
                  description: 'Optional correlation ID for tracing.',
                })
                .option('wait', {
                  type: 'boolean',
                  default: true,
                  description:
                    'Poll until the provisioning job reaches a terminal state.',
                })
                .option('timeout-ms', {
                  type: 'number',
                  default: DEFAULT_TIMEOUT_MS,
                  description: 'Max time to wait for terminal state.',
                })
                .option('poll-ms', {
                  type: 'number',
                  default: DEFAULT_POLL_MS,
                  description: 'Polling interval while waiting.',
                })
                .option('test-mode', {
                  type: 'boolean',
                  default: true,
                  description:
                    'Use test-safe defaults unless explicitly disabled.',
                })
                .option('require-provider', {
                  type: 'boolean',
                  default: true,
                  description:
                    'Fail if the resulting agent is not provider-backed by ElevenLabs.',
                }),
            ),
          ),
        ),
      ),
    async (argv: any) => {
      const payload = await readJsonFile(argv.input)
      const parsed = parseWizardCliRequest(payload)
      const service = createServiceFromArgv(argv)
      const requester =
        service.mode === 'embedded'
          ? await resolveRequester({
              requesterId: argv.requesterId,
              requesterEmail: argv.requesterEmail,
              organizationId: argv.organizationId,
            })
          : undefined

      const preview = await service.render({
        parsed,
        testMode: Boolean(argv.testMode),
      })
      const idempotencyKey =
        argv.idempotencyKey ||
        buildDefaultIdempotencyKey(parsed.summary.agentName)
      const correlationId =
        argv.correlationId || `revcenter-cli:${parsed.summary.agentName}`

      const submission = await service.submit({
        parsed,
        requester,
        idempotencyKey,
        correlationId,
        options: {
          testMode: Boolean(argv.testMode),
          requireProvider: Boolean(argv.requireProvider),
          waitForTerminal: false,
        },
      })

      if (!argv.wait) {
        if (argv.json) {
          printJson({
            mode: service.mode,
            input: resolveFromInvocationCwd(argv.input),
            requester,
            render: preview,
            submission,
          })
          return
        }

        process.stdout.write(
          [
            `Mode: ${service.mode}`,
            `Input: ${resolveFromInvocationCwd(argv.input)}`,
            renderPreview(preview),
            `Submitted job ${submission.jobId} [${submission.status}]`,
            `Agent ID: ${submission.agentId}`,
            `Correlation: ${submission.correlationId}`,
          ].join('\n') + '\n',
        )
        return
      }

      const waited = await waitForWizardTerminalStatus({
        service,
        jobId: submission.jobId,
        timeoutMs: Number(argv.timeoutMs),
        pollMs: Number(argv.pollMs),
      })

      if (waited.timedOut) {
        if (argv.json) {
          printJson({
            mode: service.mode,
            input: resolveFromInvocationCwd(argv.input),
            requester,
            render: preview,
            submission,
            final: waited.status,
            timedOut: true,
          })
        } else {
          process.stdout.write(
            [
              `Mode: ${service.mode}`,
              `Input: ${resolveFromInvocationCwd(argv.input)}`,
              renderPreview(preview),
              renderStatus(waited.status),
            ].join('\n') + '\n',
          )
        }
        throw new Error(
          `Timed out waiting for provisioning job ${submission.jobId} to reach a terminal state.`,
        )
      }

      evaluateProvisioningOutcome({
        status: waited.status,
        requireProvider: Boolean(argv.requireProvider),
      })

      if (argv.json) {
        printJson({
          mode: service.mode,
          input: resolveFromInvocationCwd(argv.input),
          requester,
          render: preview,
          submission,
          final: waited.status,
        })
        return
      }

      process.stdout.write(
        [
          `Mode: ${service.mode}`,
          `Input: ${resolveFromInvocationCwd(argv.input)}`,
          `Requester: ${requester ? formatMaybe(requester.email, requester.id) : 'api-key'}`,
          renderPreview(preview),
          renderStatus(waited.status),
        ].join('\n') + '\n',
      )
    },
  )
  .command(
    'status',
    'Load the latest provisioning snapshot by job ID or agent ID.',
    (builder: any) =>
      withJsonOption(
        withConnectionOptions(
          builder
            .option('job-id', {
              type: 'string',
              description: 'Provisioning job ID.',
            })
            .option('agent-id', {
              type: 'string',
              description:
                'Agent ID. Embedded mode loads the latest job for that agent.',
            }),
        ),
      ),
    async (argv: any) => {
      if (!argv.jobId && !argv.agentId) {
        throw new Error('Pass either `--job-id` or `--agent-id`.')
      }

      const service = createServiceFromArgv(argv)
      const status = await service.getStatus({
        jobId: argv.jobId,
        agentId: argv.agentId,
      })

      if (argv.json) {
        printJson({
          mode: service.mode,
          status,
        })
        return
      }

      process.stdout.write(
        [`Mode: ${service.mode}`, renderStatus(status)].join('\n') + '\n',
      )
    },
  )
  .help()
  .parseAsync()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(1)
  })
