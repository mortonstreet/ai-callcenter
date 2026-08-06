import { AuthRequestHandler } from '@/types/handlers'
import {
  CreateApiKeyRequest,
  ListApiKeysRequest,
  RevokeApiKeyRequest,
} from '@shared/types/src'
import {
  createScopedApiKey,
  listScopedApiKeys,
  revokeScopedApiKey,
} from '@/services/api-key.service'
import { createAdminAuditLog } from '@/repositories/governance.repository'

export const listApiKeys: AuthRequestHandler<ListApiKeysRequest> = async (
  req,
  res,
) => {
  const keys = await listScopedApiKeys(req.validated.organizationId)
  res.json({ keys })
}

export const createApiKey: AuthRequestHandler<CreateApiKeyRequest> = async (
  req,
  res,
) => {
  const { organizationId, name, scopes, expiresAt } = req.validated

  if (expiresAt && expiresAt <= new Date()) {
    return res.status(400).json({ error: 'expiresAt must be in the future' })
  }

  const result = await createScopedApiKey({
    organizationId,
    name,
    scopes,
    expiresAt,
    createdByUserId: req.user.id,
  })

  await createAdminAuditLog({
    organizationId,
    actorUserId: req.user.id,
    action: 'api_key.created',
    resourceType: 'api_key',
    resourceId: result.key.id,
    before: null,
    after: {
      name: result.key.name,
      keyPrefix: result.key.keyPrefix,
      lastFour: result.key.lastFour,
      scopes: result.key.scopes,
      expiresAt: result.key.expiresAt,
    },
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  })

  res.status(201).json(result)
}

export const revokeApiKey: AuthRequestHandler<RevokeApiKeyRequest> = async (
  req,
  res,
) => {
  const { id, organizationId } = req.validated
  const key = await revokeScopedApiKey({ id, organizationId })

  if (!key) {
    return res.status(404).json({ error: 'API key not found' })
  }

  await createAdminAuditLog({
    organizationId,
    actorUserId: req.user.id,
    action: 'api_key.revoked',
    resourceType: 'api_key',
    resourceId: key.id,
    before: null,
    after: {
      name: key.name,
      keyPrefix: key.keyPrefix,
      lastFour: key.lastFour,
      scopes: key.scopes,
      revokedAt: key.revokedAt,
    },
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  })

  res.json({ key })
}
