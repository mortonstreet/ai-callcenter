import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAdminCreateOrganizationResponse,
  parseAdminCreateOrganizationPayload,
} from '../src/api/controllers/admin-create-organization.contract'

test('parses canonical payload without slug', () => {
  const parsed = parseAdminCreateOrganizationPayload({
    name: 'Acme Corp',
    ownerEmail: 'owner@acme.com',
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) {
    return
  }
  assert.equal(parsed.data.name, 'Acme Corp')
  assert.equal(parsed.data.ownerEmail, 'owner@acme.com')
  assert.equal(parsed.data.slug, undefined)
})

test('parses canonical payload with optional slug', () => {
  const parsed = parseAdminCreateOrganizationPayload({
    name: 'Acme Corp',
    ownerEmail: 'owner@acme.com',
    slug: 'acme-corp',
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) {
    return
  }
  assert.equal(parsed.data.slug, 'acme-corp')
})

test('returns typed required ownerEmail error for legacy slug-only payload', () => {
  const parsed = parseAdminCreateOrganizationPayload({
    name: 'Acme Corp',
    slug: 'acme-corp',
  })

  assert.equal(parsed.ok, false)
  if (parsed.ok) {
    return
  }
  assert.equal(parsed.error.code, 'ADMIN_OWNER_EMAIL_REQUIRED')
  assert.equal(parsed.error.status, 400)
  assert.deepEqual(parsed.error.details, {
    field: 'ownerEmail',
    legacyPayloadDetected: true,
  })
})

test('returns typed required ownerEmail error when ownerEmail is missing', () => {
  const parsed = parseAdminCreateOrganizationPayload({
    name: 'Acme Corp',
  })

  assert.equal(parsed.ok, false)
  if (parsed.ok) {
    return
  }
  assert.equal(parsed.error.code, 'ADMIN_OWNER_EMAIL_REQUIRED')
  assert.equal(parsed.error.status, 400)
  assert.deepEqual(parsed.error.details, {
    field: 'ownerEmail',
    legacyPayloadDetected: false,
  })
})

test('returns typed invalid ownerEmail error for malformed owner email', () => {
  const parsed = parseAdminCreateOrganizationPayload({
    name: 'Acme Corp',
    ownerEmail: 'not-an-email',
  })

  assert.equal(parsed.ok, false)
  if (parsed.ok) {
    return
  }
  assert.equal(parsed.error.code, 'ADMIN_OWNER_EMAIL_INVALID')
  assert.equal(parsed.error.status, 400)
})

test('builds normalized admin org create response', () => {
  const createdAt = new Date('2026-02-15T00:00:00.000Z')

  const response = buildAdminCreateOrganizationResponse(
    {
      id: 'org_123',
      name: 'Acme Corp',
      slug: 'acme-corp',
      logo: null,
      createdAt,
    } as unknown as Parameters<typeof buildAdminCreateOrganizationResponse>[0],
    'owner@acme.com',
  )

  assert.deepEqual(response, {
    organization: {
      id: 'org_123',
      name: 'Acme Corp',
      slug: 'acme-corp',
      logo: null,
      createdAt,
    },
    owner: {
      email: 'owner@acme.com',
    },
  })
})
