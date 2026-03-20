import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REVCENTER_CLI_BANNER,
  shouldPrintCliBanner,
} from '../src/banner'

test('banner contains REVCENTER art header', () => {
  assert.match(REVCENTER_CLI_BANNER, /REVCENTER/i)
  assert.match(REVCENTER_CLI_BANNER, /RevCenter CLI/)
})

test('shouldPrintCliBanner suppresses banner for json output', () => {
  assert.equal(shouldPrintCliBanner(['render', '--json'], true), false)
})

test('shouldPrintCliBanner allows guided banner even when stdout is captured', () => {
  assert.equal(shouldPrintCliBanner(['guided'], false), true)
})

test('shouldPrintCliBanner allows banner for normal interactive runs', () => {
  const previous = process.env.REVCENTER_CLI_NO_BANNER
  delete process.env.REVCENTER_CLI_NO_BANNER

  try {
    assert.equal(shouldPrintCliBanner(['render'], true), true)
    assert.equal(shouldPrintCliBanner(['template'], true), false)
  } finally {
    process.env.REVCENTER_CLI_NO_BANNER = previous
  }
})
