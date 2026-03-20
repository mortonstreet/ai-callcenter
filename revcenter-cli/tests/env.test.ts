import test from 'node:test'
import assert from 'node:assert/strict'
import { loadRevcenterCliEnv } from '../src/env'

test('loadRevcenterCliEnv is safe when env files are absent', () => {
  const previous = process.env.REVCENTER_API_BASE_URL
  delete process.env.REVCENTER_API_BASE_URL

  try {
    loadRevcenterCliEnv()
    assert.equal(process.env.REVCENTER_API_BASE_URL, undefined)
  } finally {
    process.env.REVCENTER_API_BASE_URL = previous
  }
})
