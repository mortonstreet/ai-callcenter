import { Request } from 'express'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { config } from '@/config'
import { findById } from '@/repositories/user.repository'
import {
  createApiKeyRecord,
  findApiKeyRecordsByPrefix,
  listApiKeyRecords,
  touchApiKeyLastUsedAt,
  updateApiKeyRecord,
} from '@/repositories/api-key.repository'
import { DBApiKey, DBUser } from '@shared/db/src'
import { ApiKeyScope } from '@shared/types/src'

const RAW_KEY_PREFIX = 'rvc_'
const KEY_LOOKUP_PREFIX_LENGTH = 16

export type ApiKeyPublic = {
  id: string
  organizationId: string
  name: string
  keyPrefix: string
  lastFour: string
  scopes: ApiKeyScope[]
  createdByUserId: string | null
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreatedApiKey = {
  apiKey: string
  key: ApiKeyPublic
}

export type AuthenticatedApiKey = {
  key: DBApiKey
  user: DBUser
}

export const API_KEY_SCOPES: ApiKeyScope[] = [
  'api:read',
  'api:write',
  'mcp:connect',
]

export const toApiKeyPublic = (key: DBApiKey): ApiKeyPublic => ({
  id: key.id,
  organizationId: key.organizationId,
  name: key.name,
  keyPrefix: key.keyPrefix,
  lastFour: key.lastFour,
  scopes: key.scopes as ApiKeyScope[],
  createdByUserId: key.createdByUserId,
  lastUsedAt: key.lastUsedAt,
  expiresAt: key.expiresAt,
  revokedAt: key.revokedAt,
  createdAt: key.createdAt,
  updatedAt: key.updatedAt,
})

const hashApiKey = (apiKey: string): string => {
  return createHmac('sha256', config.security.encryptionKey)
    .update(apiKey, 'utf8')
    .digest('hex')
}

const getLookupPrefix = (apiKey: string): string => {
  return apiKey.slice(0, KEY_LOOKUP_PREFIX_LENGTH)
}

const hashesMatch = (candidateHash: string, storedHash: string): boolean => {
  const left = Buffer.from(candidateHash, 'hex')
  const right = Buffer.from(storedHash, 'hex')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

const normalizeApiKey = (value: string | undefined): string | null => {
  const apiKey = value?.trim()
  if (!apiKey || !apiKey.startsWith(RAW_KEY_PREFIX)) {
    return null
  }
  return apiKey
}

export const extractRevCenterApiKey = (req: Request): string | null => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return normalizeApiKey(authHeader.slice(7))
  }

  const xApiKey = req.headers['x-api-key']
  if (typeof xApiKey === 'string') {
    return normalizeApiKey(xApiKey)
  }

  return null
}

export const scopeAllows = (
  scopes: readonly string[],
  requiredScope: ApiKeyScope,
): boolean => {
  if (requiredScope === 'api:read') {
    return scopes.includes('api:read') || scopes.includes('api:write')
  }
  return scopes.includes(requiredScope)
}

export const requiredApiScopeForMethod = (method: string): ApiKeyScope => {
  const normalized = method.toUpperCase()
  return normalized === 'GET' ||
    normalized === 'HEAD' ||
    normalized === 'OPTIONS'
    ? 'api:read'
    : 'api:write'
}

export const createScopedApiKey = async (input: {
  organizationId: string
  name: string
  scopes: ApiKeyScope[]
  createdByUserId: string
  expiresAt?: Date | null
}): Promise<CreatedApiKey> => {
  const apiKey = `${RAW_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
  const record = await createApiKeyRecord({
    organizationId: input.organizationId,
    name: input.name,
    keyPrefix: getLookupPrefix(apiKey),
    keyHash: hashApiKey(apiKey),
    lastFour: apiKey.slice(-4),
    scopes: input.scopes,
    createdByUserId: input.createdByUserId,
    expiresAt: input.expiresAt || null,
    lastUsedAt: null,
    revokedAt: null,
    updatedAt: new Date(),
  })

  return {
    apiKey,
    key: toApiKeyPublic(record),
  }
}

export const listScopedApiKeys = async (
  organizationId: string,
): Promise<ApiKeyPublic[]> => {
  const keys = await listApiKeyRecords(organizationId)
  return keys.map(toApiKeyPublic)
}

export const revokeScopedApiKey = async (input: {
  id: string
  organizationId: string
}): Promise<ApiKeyPublic | undefined> => {
  const key = await updateApiKeyRecord(input.id, input.organizationId, {
    revokedAt: new Date(),
  })

  return key ? toApiKeyPublic(key) : undefined
}

export const authenticateScopedApiKey = async (
  apiKey: string,
  requiredScope: ApiKeyScope,
): Promise<AuthenticatedApiKey | null> => {
  const lookupPrefix = getLookupPrefix(apiKey)
  const candidateHash = hashApiKey(apiKey)
  const candidates = await findApiKeyRecordsByPrefix(lookupPrefix)
  const matchedKey = candidates.find((candidate) =>
    hashesMatch(candidateHash, candidate.keyHash),
  )

  if (!matchedKey || !scopeAllows(matchedKey.scopes, requiredScope)) {
    return null
  }

  if (!matchedKey.createdByUserId) {
    return null
  }

  const user = await findById(matchedKey.createdByUserId)
  if (!user) {
    return null
  }

  await touchApiKeyLastUsedAt(matchedKey.id)

  return {
    key: matchedKey,
    user,
  }
}
