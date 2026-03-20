import test from 'node:test'
import assert from 'node:assert/strict'
import {
  REVCENTER_WIZARD_INDUSTRY_OPTIONS,
  REVCENTER_WIZARD_USE_CASE_OPTIONS,
  formatWizardOptionList,
} from '../src/revcenter-wizard'

test('formatWizardOptionList uses bracketed indexes for industry options', () => {
  const rendered = formatWizardOptionList(REVCENTER_WIZARD_INDUSTRY_OPTIONS.slice(0, 2))

  assert.match(rendered, /\[01\] HVAC \[hvac\]/)
  assert.match(rendered, /\[02\] Pest Control \[pest_control\]/)
})

test('formatWizardOptionList renders descriptions on an indented line', () => {
  const rendered = formatWizardOptionList(REVCENTER_WIZARD_USE_CASE_OPTIONS.slice(0, 1))

  assert.match(rendered, /\[01\] Customer Support \[customer_support\]/)
  assert.match(rendered, /\n\s+Handle inbound calls, answer FAQs, and resolve issues/)
})
