import path from 'path'

const TERMINAL_JOB_STATUSES = new Set(['completed', 'failed', 'blocked_manual'])
const REPO_ROOT = path.resolve(__dirname, '../..')

interface LoadedBackendModules {
  db: any
  findAgentById: (id: string, organizationId: string) => Promise<any>
  findAgentProvisioningJobById: (id: string) => Promise<any>
  findLatestAgentProvisioningJobByAgentId: (agentId: string) => Promise<any>
  listAgentProvisioningSteps: (jobId: string) => Promise<any[]>
  startWizardProvisioningContract: (input: any) => Promise<any>
}

export interface ResolvedRequester {
  id: string
  email: string | null
  name: string | null
  isAdmin: boolean
  organizationId: string
  organizationName: string | null
}

export interface ProvisioningSnapshot {
  organization: Record<string, unknown> | null
  agent: Record<string, unknown>
  job: Record<string, unknown>
  steps: Array<Record<string, unknown>>
}

let loadedBackendModulesPromise: Promise<LoadedBackendModules> | null = null
const runtimeImport = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<any>

const unwrapRuntimeModule = <T>(module: T): T => {
  if (!module || typeof module !== 'object') {
    return module
  }

  return (
    (module as Record<string, unknown>).default ||
    (module as Record<string, unknown>)['module.exports'] ||
    module
  ) as T
}

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return value
  }

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const parseRecordFields = (
  record: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!record) {
    return null
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, parseMaybeJson(value)]),
  )
}

const sleep = async (ms: number) =>
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const resolveActiveOrganizationForUser = async (
  db: any,
  userId: string,
  preferredOrganizationId?: string,
) => {
  let organizationId = preferredOrganizationId?.trim() || undefined

  if (!organizationId) {
    const user = await db
      .selectFrom('user')
      .where('id', '=', userId)
      .select('lastActiveOrganizationId')
      .executeTakeFirst()

    organizationId = user?.lastActiveOrganizationId || undefined
  }

  if (!organizationId) {
    const fallbackMembership = await db
      .selectFrom('member')
      .innerJoin('organization', 'organization.id', 'member.organizationId')
      .where('member.userId', '=', userId)
      .orderBy('organization.createdAt', 'desc')
      .select(['member.organizationId'])
      .executeTakeFirst()

    organizationId = fallbackMembership?.organizationId
  }

  if (!organizationId) {
    throw new Error(
      'No organization is associated with this requester. Set a last active organization or pass `--organization-id`.',
    )
  }

  const membership = await db
    .selectFrom('member')
    .where('organizationId', '=', organizationId)
    .where('userId', '=', userId)
    .select(['id'])
    .executeTakeFirst()

  if (!membership) {
    throw new Error(
      `Requester ${userId} is not a member of organization ${organizationId}.`,
    )
  }

  const organization = await db
    .selectFrom('organization')
    .where('id', '=', organizationId)
    .select(['id', 'name'])
    .executeTakeFirst()

  if (!organization) {
    throw new Error(`Organization ${organizationId} was not found.`)
  }

  return organization
}

export const ensureRepoRoot = () => {
  if (process.cwd() !== REPO_ROOT) {
    process.chdir(REPO_ROOT)
  }

  return REPO_ROOT
}

export const getRepoRoot = () => REPO_ROOT

export const loadBackendModules = async (): Promise<LoadedBackendModules> => {
  ensureRepoRoot()

  if (!loadedBackendModulesPromise) {
    loadedBackendModulesPromise = Promise.all([
      runtimeImport('@/lib/db'),
      runtimeImport('@/repositories/agent.repository'),
      runtimeImport('@/repositories/provisioning.repository'),
      runtimeImport('@/services/agent-provisioning-contract.service'),
    ]).then((modules) => {
      const [
        { db },
        { findById: findAgentById },
        {
          findAgentProvisioningJobById,
          findLatestAgentProvisioningJobByAgentId,
          listAgentProvisioningSteps,
        },
        { startWizardProvisioningContract },
      ] = modules.map(unwrapRuntimeModule)

      return {
        db,
        findAgentById,
        findAgentProvisioningJobById,
        findLatestAgentProvisioningJobByAgentId,
        listAgentProvisioningSteps,
        startWizardProvisioningContract,
      }
    })
  }

  return loadedBackendModulesPromise as Promise<LoadedBackendModules>
}

export const resolveRequester = async (input: {
  requesterId?: string
  requesterEmail?: string
  organizationId?: string
}): Promise<ResolvedRequester> => {
  if (input.requesterId && input.requesterEmail) {
    throw new Error('Pass either `--requester-id` or `--requester-email`, not both.')
  }

  const { db } = await loadBackendModules()
  const baseQuery = db
    .selectFrom('user')
    .select(['id', 'email', 'name', 'isAdmin', 'createdAt', 'lastActiveOrganizationId'])

  if (input.requesterId) {
    const user = await baseQuery
      .where('id', '=', input.requesterId)
      .executeTakeFirst()

    if (!user) {
      throw new Error(`Requester user ${input.requesterId} was not found.`)
    }

    const organization = await resolveActiveOrganizationForUser(db, user.id, input.organizationId)
    return {
      id: user.id,
      email: user.email || null,
      name: user.name || null,
      isAdmin: Boolean(user.isAdmin),
      organizationId: organization.id,
      organizationName: organization.name || null,
    }
  }

  if (input.requesterEmail) {
    const user = await baseQuery
      .where('email', '=', input.requesterEmail)
      .executeTakeFirst()

    if (!user) {
      throw new Error(
        `Requester user with email ${input.requesterEmail} was not found.`,
      )
    }

    const organization = await resolveActiveOrganizationForUser(db, user.id, input.organizationId)
    return {
      id: user.id,
      email: user.email || null,
      name: user.name || null,
      isAdmin: Boolean(user.isAdmin),
      organizationId: organization.id,
      organizationName: organization.name || null,
    }
  }

  const users = await baseQuery
    .orderBy('isAdmin', 'desc')
    .orderBy('createdAt', 'asc')
    .execute()

  if (users.length === 0) {
    throw new Error(
      'No users exist yet. Create or sign in to a RevCenter account before running one-shot provisioning.',
    )
  }

  if (users.length === 1) {
    const [user] = users
    const organization = await resolveActiveOrganizationForUser(db, user.id, input.organizationId)
    return {
      id: user.id,
      email: user.email || null,
      name: user.name || null,
      isAdmin: Boolean(user.isAdmin),
      organizationId: organization.id,
      organizationName: organization.name || null,
    }
  }

  const adminUsers = users.filter((user: any) => Boolean(user.isAdmin))
  if (adminUsers.length === 1) {
    const [user] = adminUsers
    const organization = await resolveActiveOrganizationForUser(db, user.id, input.organizationId)
    return {
      id: user.id,
      email: user.email || null,
      name: user.name || null,
      isAdmin: Boolean(user.isAdmin),
      organizationId: organization.id,
      organizationName: organization.name || null,
    }
  }

  throw new Error(
    'Multiple users exist. Pass `--requester-email` or `--requester-id` explicitly.',
  )
}

export const loadProvisioningSnapshot = async (input: {
  jobId?: string
  agentId?: string
}): Promise<ProvisioningSnapshot> => {
  const modules = await loadBackendModules()

  const job = input.jobId
    ? await modules.findAgentProvisioningJobById(input.jobId)
    : input.agentId
      ? await modules.findLatestAgentProvisioningJobByAgentId(input.agentId)
      : null

  if (!job) {
    const identifier = input.jobId
      ? `job ${input.jobId}`
      : input.agentId
        ? `agent ${input.agentId}`
        : 'unknown target'
    throw new Error(`No provisioning record found for ${identifier}.`)
  }

  const [organization, agent, steps] = await Promise.all([
    modules.db
      .selectFrom('organization')
      .where('id', '=', job.organizationId)
      .select(['id', 'name', 'slug', 'metadata'])
      .executeTakeFirst(),
    modules.findAgentById(job.agentId, job.organizationId),
    modules.listAgentProvisioningSteps(job.id),
  ])

  return {
    organization: parseRecordFields(organization),
    agent: parseRecordFields(agent) || {},
    job: parseRecordFields(job) || {},
    steps: steps
      .map((step) => parseRecordFields(step))
      .filter((step): step is Record<string, unknown> => Boolean(step)),
  }
}

export const waitForProvisioningTerminalState = async (input: {
  jobId: string
  timeoutMs: number
  pollMs: number
}): Promise<{ snapshot: ProvisioningSnapshot; timedOut: boolean }> => {
  const deadline = Date.now() + input.timeoutMs

  while (true) {
    const snapshot = await loadProvisioningSnapshot({ jobId: input.jobId })
    const status = String(snapshot.job.status || '')

    if (TERMINAL_JOB_STATUSES.has(status)) {
      return {
        snapshot,
        timedOut: false,
      }
    }

    if (Date.now() >= deadline) {
      return {
        snapshot,
        timedOut: true,
      }
    }

    await sleep(input.pollMs)
  }
}
